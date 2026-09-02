// server/analyzer/service.go
package analyzer

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"strings"

	"vigilant/ai"
	"vigilant/email"
	"vigilant/githubapi"
	"vigilant/models"
	"vigilant/notifications"

	"github.com/lib/pq"
)

const (
	QualifiedThreshold = 35.0
	ShortlistThreshold = 60.0
)
const InvitePermission = "push"

type Service struct {
	db               *sql.DB
	encryptionSecret string
	aiService        *ai.Service
	notifSvc         *notifications.Service
}

func NewService(db *sql.DB, encryptionSecret string, aiSvc *ai.Service, notifSvc *notifications.Service) *Service {
	return &Service{db: db, encryptionSecret: encryptionSecret, aiService: aiSvc, notifSvc: notifSvc}
}

func (s *Service) fromEmail() string {
	var addr string
	err := s.db.QueryRow(`SELECT ses_from_email FROM email_config LIMIT 1`).Scan(&addr)
	if err != nil || addr == "" {
		return "no-reply@localhost"
	}
	return addr
}

type AnalyzeInput struct {
	JobApplicationID string
	CandidateID      string
	RepoURLs         []string
	AuthToken        string
}

type RepoResult struct {
	RepoURL   string
	Breakdown ScoreBreakdown
	Err       error
}

func (s *Service) AnalyzeApplication(in AnalyzeInput) error {
	if len(in.RepoURLs) == 0 {
		return fmt.Errorf("no repo URLs provided for application %s", in.JobApplicationID)
	}

	results := make([]RepoResult, 0, len(in.RepoURLs))
	for _, url := range in.RepoURLs {
		breakdown, err := s.analyzeOne(url, in.AuthToken)
		results = append(results, RepoResult{RepoURL: url, Breakdown: breakdown, Err: err})
		if err != nil {
			log.Printf("warning: failed to analyze repo %s for application %s: %v", url, in.JobApplicationID, err)
		}
	}

	for _, r := range results {
		if r.Err != nil {
			continue
		}
		if err := s.saveRepoAnalysis(in.JobApplicationID, in.CandidateID, r); err != nil {
			log.Printf("warning: failed to save repo analysis for %s: %v", r.RepoURL, err)
		}
	}

	successful := make([]ScoreBreakdown, 0, len(results))
	for _, r := range results {
		if r.Err == nil {
			successful = append(successful, r.Breakdown)
		}
	}

	if len(successful) == 0 {
		return s.markAnalyzedFailed(in.JobApplicationID)
	}

	overallScore, overallTier := aggregate(successful)

	if err := s.updateApplicationScore(in.JobApplicationID, overallScore, overallTier); err != nil {
		return fmt.Errorf("failed to update application score: %w", err)
	}

	switch {
	case overallScore >= ShortlistThreshold:
		if err := s.processOutcome(in.JobApplicationID, in.RepoURLs, true); err != nil {
			log.Printf("warning: failed to process high-tier outcome for %s: %v", in.JobApplicationID, err)
		}
	case overallScore >= QualifiedThreshold:
		if err := s.processOutcome(in.JobApplicationID, in.RepoURLs, false); err != nil {
			log.Printf("warning: failed to process qualified outcome for %s: %v", in.JobApplicationID, err)
		}
	}

	return nil
}

func (s *Service) analyzeOne(repoURL, authToken string) (ScoreBreakdown, error) {
	localPath, repo, err := cloneRepo(repoURL, authToken)
	if err != nil {
		return ScoreBreakdown{}, err
	}
	defer cleanup(localPath)

	commits, err := extractCommits(repo)
	if err != nil {
		return ScoreBreakdown{}, fmt.Errorf("failed to extract commits: %w", err)
	}

	return Score(commits), nil
}

func aggregate(results []ScoreBreakdown) (score float64, tier string) {
	var sum float64
	for _, r := range results {
		sum += r.TotalScore
	}
	avg := sum / float64(len(results))
	return avg, tierFor(avg)
}

func (s *Service) saveRepoAnalysis(jobApplicationID, candidateID string, r RepoResult) error {
	detailsJSON, err := json.Marshal(map[string]interface{}{
		"commit_count": r.Breakdown.CommitCount,
		"avg_lines":    r.Breakdown.AvgLinesPerCommit,
		"message":      r.Breakdown.MessageScore,
		"atomicity":    r.Breakdown.AtomicityScore,
		"cadence":      r.Breakdown.CadenceScore,
		"author":       r.Breakdown.AuthorScore,
	})
	if err != nil {
		return err
	}

	_, err = s.db.Exec(`
		INSERT INTO repo_analyses
			(job_application_id, repo_url, candidate_id, total_score, message_score,
			 atomicity_score, cadence_score, author_score, tier, commit_count,
			 avg_lines_per_commit, details)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`,
		jobApplicationID, r.RepoURL, candidateID, r.Breakdown.TotalScore, r.Breakdown.MessageScore,
		r.Breakdown.AtomicityScore, r.Breakdown.CadenceScore, r.Breakdown.AuthorScore, r.Breakdown.Tier,
		r.Breakdown.CommitCount, r.Breakdown.AvgLinesPerCommit, string(detailsJSON),
	)
	return err
}

func (s *Service) updateApplicationScore(jobApplicationID string, score float64, tier string) error {
	isQualified := score >= QualifiedThreshold
	_, err := s.db.Exec(`
		UPDATE job_applications
		SET analyzed = true,
		    overall_score = $1,
		    overall_tier = $2,
		    is_qualified = is_qualified OR $3,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $4::uuid
	`, score, tier, isQualified, jobApplicationID)
	return err
}

func (s *Service) processOutcome(jobApplicationID string, candidateRepoURLs []string, highTier bool) error {

	var existingRepo sql.NullString
	err := s.db.QueryRow(`SELECT github_repo_name FROM job_applications WHERE id = $1::uuid`, jobApplicationID).Scan(&existingRepo)
	if err != nil {
		return fmt.Errorf("failed to check existing repo state: %w", err)
	}
	if existingRepo.Valid && existingRepo.String != "" {

		return nil
	}

	if err := s.ensureAssignmentGenerated(jobApplicationID); err != nil {
		return fmt.Errorf("aborting repo/invite: failed to auto-generate assignment: %w", err)
	}

	if len(candidateRepoURLs) == 0 {
		return fmt.Errorf("no candidate repo URLs available to derive GitHub username")
	}
	githubUsername, err := githubapi.ExtractUsername(candidateRepoURLs[0])
	if err != nil {
		return fmt.Errorf("failed to extract github username: %w", err)
	}

	org, token, err := s.getGithubCredentials()
	if err != nil {
		return fmt.Errorf("failed to load github credentials: %w", err)
	}

	client := githubapi.NewClient(token, org)

	repoName, err := generateRepoName(jobApplicationID)
	if err != nil {
		return fmt.Errorf("failed to generate repo name: %w", err)
	}

	repoURL, err := client.CreateRepo(repoName)
	if err != nil {
		s.markGithubInviteFailed(jobApplicationID)
		return fmt.Errorf("failed to create github repo: %w", err)
	}
	log.Printf("application %s: created github repo %s (%s)", jobApplicationID, repoName, repoURL)

	if err := s.seedAssignmentReadme(jobApplicationID, client, repoName); err != nil {

		log.Printf("warning: application %s: %v", jobApplicationID, err)
	}

	if err := client.InviteCollaborator(repoName, githubUsername, InvitePermission); err != nil {
		s.markGithubInviteFailed(jobApplicationID)
		return fmt.Errorf("failed to invite collaborator: %w", err)
	}

	if err := s.saveGithubInvite(jobApplicationID, repoName, repoURL); err != nil {
		return fmt.Errorf("failed to save github invite state: %w", err)
	}

	if err := s.sendAssignmentEmail(jobApplicationID, repoURL, highTier); err != nil {
		log.Printf("warning: failed to send assignment email for %s: %v", jobApplicationID, err)
	}

	return nil
}

func (s *Service) ensureAssignmentGenerated(jobApplicationID string) error {
	if s.aiService == nil {
		return fmt.Errorf("AI service not configured, cannot auto-generate assignment")
	}

	var existingAssignmentID sql.NullString
	err := s.db.QueryRow(`
		SELECT COALESCE(ja.assignment_id, p.assignment_id)
		FROM job_applications ja
		JOIN hiring_positions p ON ja.position_id = p.id
		WHERE ja.id = $1::uuid
	`, jobApplicationID).Scan(&existingAssignmentID)
	if err != nil {
		return fmt.Errorf("failed to check existing assignment: %w", err)
	}
	if existingAssignmentID.Valid && existingAssignmentID.String != "" {
		return nil
	}

	var positionID, positionTitle, jobDescription, jobRequirements string
	var experienceYears sql.NullInt16
	err = s.db.QueryRow(`
		SELECT p.id, p.position_title, p.job_description, p.requirements, ja.experience_years
		FROM job_applications ja
		JOIN hiring_positions p ON ja.position_id = p.id
		WHERE ja.id = $1::uuid
	`, jobApplicationID).Scan(&positionID, &positionTitle, &jobDescription, &jobRequirements, &experienceYears)
	if err != nil {
		return fmt.Errorf("failed to fetch position context: %w", err)
	}

	years := 0
	if experienceYears.Valid {
		years = int(experienceYears.Int16)
	}
	difficulty := difficultyForExperience(years)

	generated, err := s.aiService.GenerateAssignment(context.Background(), positionTitle, jobDescription, jobRequirements, models.GenerateAssignmentRequest{
		PositionID: positionID,
		Difficulty: difficulty,
		Notes:      "Auto-generated on qualification/shortlisting for a specific candidate.",
	})
	if err != nil {
		return fmt.Errorf("assignment generation failed: %w", err)
	}

	instructionsText := ""
	for _, r := range generated.Requirements {
		instructionsText += "- " + r + "\n"
	}
	durationMinutes := int(generated.EstimatedHours * 60)

	var newAssignmentID string
	err = s.db.QueryRow(`
		INSERT INTO assignments (
			title, description, instructions, resource_links,
			duration_minutes, passing_score,
			difficulty_level, generated_by_ai, ai_notes, starter_readme
		) VALUES ($1, $2, $3, $4, $5, NULL, $6, TRUE, $7, $8)
		RETURNING id
	`,
		generated.Title, generated.Description, instructionsText, pq.Array([]string{}),
		durationMinutes, difficulty, "auto-generated per-candidate assignment", generated.StarterReadme,
	).Scan(&newAssignmentID)
	if err != nil {
		return fmt.Errorf("failed to save generated assignment: %w", err)
	}

	_, err = s.db.Exec(`
		UPDATE job_applications SET assignment_id = $1::uuid, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2::uuid
	`, newAssignmentID, jobApplicationID)
	if err != nil {
		return fmt.Errorf("failed to attach generated assignment to application: %w", err)
	}

	log.Printf("application %s: auto-generated assignment %s (difficulty %s) for position %q",
		jobApplicationID, newAssignmentID, difficulty, positionTitle)
	return nil
}

func difficultyForExperience(years int) string {
	switch {
	case years <= 1:
		return models.DifficultyIntern
	case years <= 3:
		return models.DifficultyJunior
	case years <= 5:
		return models.DifficultySDE1
	case years <= 8:
		return models.DifficultySDE2
	default:
		return models.DifficultySDE3
	}
}

func (s *Service) seedAssignmentReadme(jobApplicationID string, client *githubapi.Client, repoName string) error {
	var starterReadme sql.NullString
	var assignmentTitle sql.NullString
	err := s.db.QueryRow(`
		SELECT a.starter_readme, a.title
		FROM job_applications ja
		JOIN hiring_positions p ON ja.position_id = p.id
		LEFT JOIN assignments a ON a.id = COALESCE(ja.assignment_id, p.assignment_id)
		WHERE ja.id = $1::uuid
	`, jobApplicationID).Scan(&starterReadme, &assignmentTitle)
	if err != nil {
		return fmt.Errorf("failed to look up attached assignment: %w", err)
	}

	if !starterReadme.Valid || starterReadme.String == "" {
		return fmt.Errorf("no assignment (or no starter_readme) attached to this application/position — repo created empty, candidate has no task")
	}

	commitMsg := "Add assignment README"
	if assignmentTitle.Valid && assignmentTitle.String != "" {
		commitMsg = fmt.Sprintf("Add assignment: %s", assignmentTitle.String)
	}

	if err := client.CreateFile(repoName, "README.md", starterReadme.String, commitMsg); err != nil {
		return fmt.Errorf("failed to push README to repo %s: %w", repoName, err)
	}

	log.Printf("application %s: seeded README.md into %s from attached assignment", jobApplicationID, repoName)
	return nil
}

func (s *Service) markShortlisted(jobApplicationID string) error {
	_, err := s.db.Exec(`
		UPDATE job_applications
		SET is_shortlisted = true, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1::uuid
	`, jobApplicationID)
	return err
}

const AssignmentPassThreshold = 60.0

type PendingAssignmentScore struct {
	JobApplicationID string
	GithubRepoURL    string
}

func (s *Service) FetchPendingAssignmentScores(limit int) ([]PendingAssignmentScore, error) {
	rows, err := s.db.Query(`
		SELECT id, github_repo_url
		FROM job_applications
		WHERE is_qualified = true
		  AND is_shortlisted = false
		  AND github_repo_name IS NOT NULL
		  AND github_invite_status = 'invited'
		ORDER BY github_invited_at ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pending []PendingAssignmentScore
	for rows.Next() {
		var p PendingAssignmentScore
		if err := rows.Scan(&p.JobApplicationID, &p.GithubRepoURL); err != nil {
			return nil, err
		}
		pending = append(pending, p)
	}
	return pending, rows.Err()
}

func (s *Service) ScoreAssignmentRepos(limit int) error {
	pending, err := s.FetchPendingAssignmentScores(limit)
	if err != nil {
		return fmt.Errorf("failed to fetch pending assignment scores: %w", err)
	}
	if len(pending) == 0 {
		return nil
	}

	log.Printf("scoring %d pending assignment repo(s)", len(pending))

	_, token, err := s.getGithubCredentials()
	if err != nil {
		return fmt.Errorf("failed to load github credentials: %w", err)
	}

	for _, p := range pending {
		if err := s.scoreOneAssignmentRepo(p.JobApplicationID, p.GithubRepoURL, token); err != nil {
			log.Printf("warning: application %s: assignment scoring failed: %v", p.JobApplicationID, err)
		}
	}

	return nil
}

const (
	CommitScoreWeight = 0.4
	AIScoreWeight     = 0.6
)

func (s *Service) scoreOneAssignmentRepo(jobApplicationID, repoURL, token string) error {
	localPath, repo, err := cloneRepo(repoURL, token)
	if err != nil {
		return fmt.Errorf("failed to clone assignment repo: %w", err)
	}
	defer cleanup(localPath)

	commits, err := extractCommits(repo)
	if err != nil {

		if strings.Contains(err.Error(), "reference not found") {
			log.Printf("application %s: assignment repo has no commits yet, will retry", jobApplicationID)
			return nil
		}
		return fmt.Errorf("failed to extract commits: %w", err)
	}

	if len(commits) == 0 {
		log.Printf("application %s: assignment repo has no commits yet, will retry", jobApplicationID)
		return nil
	}

	commitBreakdown := Score(commits)

	assignmentTitle, assignmentDescription, requirements, err := s.getAssignmentContext(jobApplicationID)
	if err != nil {
		log.Printf("warning: application %s: failed to load assignment context for AI review: %v", jobApplicationID, err)
	}

	aiScore := 0.0
	aiSummary := ""
	weightCommit := CommitScoreWeight
	weightAI := AIScoreWeight

	if s.aiService == nil {
		log.Printf("warning: application %s: AI service not configured, scoring on commit history only", jobApplicationID)
		weightCommit, weightAI = 1.0, 0.0
	} else {
		bundle, bundleErr := BuildRepoTextBundle(localPath)
		if bundleErr != nil {
			log.Printf("warning: application %s: failed to build repo text bundle, scoring on commit history only: %v", jobApplicationID, bundleErr)
			weightCommit, weightAI = 1.0, 0.0
		} else {
			review, reviewErr := s.aiService.ReviewAssignmentSubmission(context.Background(), assignmentTitle, assignmentDescription, requirements, bundle)
			if reviewErr != nil {

				log.Printf("warning: application %s: AI review failed, falling back to commit-only score: %v", jobApplicationID, reviewErr)
				weightCommit, weightAI = 1.0, 0.0
			} else {
				aiScore = review.Score
				aiSummary = review.Summary
			}
		}
	}

	combinedScore := weightCommit*commitBreakdown.TotalScore + weightAI*aiScore
	combinedTier := tierFor(combinedScore)

	if err := s.saveAssignmentScore(jobApplicationID, commitBreakdown, aiScore, aiSummary, combinedScore, combinedTier); err != nil {
		return fmt.Errorf("failed to save assignment score: %w", err)
	}

	if err := s.updateApplicationAssignmentScore(jobApplicationID, combinedScore, combinedTier); err != nil {
		return fmt.Errorf("failed to update application assignment score: %w", err)
	}

	if combinedScore >= AssignmentPassThreshold {
		if err := s.markShortlisted(jobApplicationID); err != nil {
			return fmt.Errorf("failed to mark shortlisted: %w", err)
		}

		if s.notifSvc != nil {
			candidateName, positionTitle, notifErr := s.getCandidateAndPositionNames(jobApplicationID)
			if notifErr != nil {
				candidateName, positionTitle = "A candidate", "the position"
			}
			if err := s.notifSvc.CreateForRole(context.Background(), "hr", notifications.CreateInput{
				Type:       notifications.TypeCandidateShortlisted,
				Title:      "Candidate shortlisted — schedule an interview",
				Message:    fmt.Sprintf("%s has been shortlisted for %s (score %.1f). Please schedule an interview.", candidateName, positionTitle, combinedScore),
				EntityType: "job_application",
				EntityID:   jobApplicationID,
				Severity:   notifications.SeveritySuccess,
			}); err != nil {
				log.Printf("warning: failed to notify HR for %s: %v", jobApplicationID, err)
			}
		}

		if err := s.logAssignmentShortlist(jobApplicationID, combinedScore, combinedTier); err != nil {
			log.Printf("warning: failed to write audit log for %s: %v", jobApplicationID, err)
		}
		if err := s.sendShortlistedEmail(jobApplicationID); err != nil {
			log.Printf("warning: failed to send shortlisted email for %s: %v", jobApplicationID, err)
		}
		log.Printf("application %s: combined score %.1f (commit %.1f, ai %.1f) cleared threshold %.1f — shortlisted",
			jobApplicationID, combinedScore, commitBreakdown.TotalScore, aiScore, AssignmentPassThreshold)
	} else {
		log.Printf("application %s: combined score %.1f (commit %.1f, ai %.1f) below threshold %.1f — not yet shortlisted",
			jobApplicationID, combinedScore, commitBreakdown.TotalScore, aiScore, AssignmentPassThreshold)
	}

	return nil
}

func (s *Service) getAssignmentContext(jobApplicationID string) (title, description, requirements string, err error) {
	err = s.db.QueryRow(`
		SELECT a.title, a.description, a.instructions
		FROM job_applications ja
		JOIN hiring_positions p ON ja.position_id = p.id
		LEFT JOIN assignments a ON a.id = COALESCE(ja.assignment_id, p.assignment_id)
		WHERE ja.id = $1::uuid
	`, jobApplicationID).Scan(&title, &description, &requirements)
	return title, description, requirements, err
}
func (s *Service) saveAssignmentScore(jobApplicationID string, b ScoreBreakdown, aiScore float64, aiSummary string, combinedScore float64, combinedTier string) error {
	detailsJSON, err := json.Marshal(map[string]interface{}{
		"commit_count": b.CommitCount,
		"avg_lines":    b.AvgLinesPerCommit,
		"message":      b.MessageScore,
		"atomicity":    b.AtomicityScore,
		"cadence":      b.CadenceScore,
		"author":       b.AuthorScore,
	})
	if err != nil {
		detailsJSON = []byte(`{}`)
	}

	_, err = s.db.Exec(`
		INSERT INTO assignment_scores
			(job_application_id, total_score, message_score, atomicity_score,
			 cadence_score, author_score, tier, commit_count, avg_lines_per_commit,
			 commit_score, ai_score, ai_summary, details)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`,
		jobApplicationID, combinedScore, b.MessageScore, b.AtomicityScore,
		b.CadenceScore, b.AuthorScore, combinedTier, b.CommitCount, b.AvgLinesPerCommit,
		b.TotalScore, aiScore, aiSummary, string(detailsJSON),
	)
	return err
}

func (s *Service) updateApplicationAssignmentScore(jobApplicationID string, score float64, tier string) error {
	_, err := s.db.Exec(`
		UPDATE job_applications
		SET assignment_overall_score = $1,
		    assignment_overall_tier = $2,
		    assignment_last_scored_at = CURRENT_TIMESTAMP,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $3::uuid
	`, score, tier, jobApplicationID)
	return err
}

func (s *Service) logAssignmentShortlist(jobApplicationID string, score float64, tier string) error {
	metadataBytes, err := json.Marshal(map[string]interface{}{
		"assignment_score": score,
		"assignment_tier":  tier,
		"reason":           fmt.Sprintf("assignment score %.1f cleared shortlist threshold %.1f", score, AssignmentPassThreshold),
	})
	if err != nil {
		metadataBytes = []byte(`{}`)
	}

	_, err = s.db.Exec(`
		INSERT INTO audit_log (
			candidate_id, action, entity_type, entity_id, description,
			metadata, ip_address, user_agent, created_at
		) VALUES (NULL, $1, $2, $3, $4, $5, '', 'system:analyzer', CURRENT_TIMESTAMP)
	`,
		"assignment_shortlist",
		"job_application",
		jobApplicationID,
		fmt.Sprintf("Application shortlisted after assignment scored %.1f (%s tier)", score, tier),
		metadataBytes,
	)
	return err
}

func (s *Service) sendShortlistedEmail(jobApplicationID string) error {
	var candidateEmail, candidateName, positionTitle string
	err := s.db.QueryRow(`
		SELECT c.email, c.full_name, p.position_title
		FROM job_applications ja
		JOIN candidates c ON ja.candidate_id = c.id
		JOIN hiring_positions p ON ja.position_id = p.id
		WHERE ja.id = $1::uuid
	`, jobApplicationID).Scan(&candidateEmail, &candidateName, &positionTitle)
	if err != nil {
		return fmt.Errorf("failed to fetch candidate/position for shortlisted email: %w", err)
	}

	_, err = email.Enqueue(context.Background(), s.db, email.EmailJob{
		ToEmail:   candidateEmail,
		ToName:    candidateName,
		FromEmail: s.fromEmail(),
		Subject:   fmt.Sprintf("You've been shortlisted for %s", positionTitle),
		Template:  email.TemplateShortlistedFinal,
		TemplateData: map[string]any{
			"CandidateName": candidateName,
			"Position":      positionTitle,
		},
		EntityType:  "job_application",
		EntityID:    jobApplicationID,
		TriggeredBy: "system:analyzer",
		Priority:    email.PriorityNormal,
	})
	if err != nil {
		return fmt.Errorf("failed to enqueue shortlisted email: %w", err)
	}

	return nil
}

func (s *Service) saveGithubInvite(jobApplicationID, repoName, repoURL string) error {
	_, err := s.db.Exec(`
		UPDATE job_applications
		SET github_repo_name = $1,
		    github_repo_url = $2,
		    github_invite_status = 'invited',
		    github_invited_at = CURRENT_TIMESTAMP,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $3::uuid
	`, repoName, repoURL, jobApplicationID)
	return err
}

func (s *Service) markGithubInviteFailed(jobApplicationID string) {
	_, err := s.db.Exec(`
		UPDATE job_applications
		SET github_invite_status = 'failed', updated_at = CURRENT_TIMESTAMP
		WHERE id = $1::uuid
	`, jobApplicationID)
	if err != nil {
		log.Printf("warning: failed to mark github invite failed for %s: %v", jobApplicationID, err)
	}
}

func (s *Service) sendAssignmentEmail(jobApplicationID, repoURL string, highTier bool) error {
	var claimed bool
	err := s.db.QueryRow(`
		UPDATE job_applications
		SET assignment_email_sent_at = CURRENT_TIMESTAMP
		WHERE id = $1::uuid
		  AND assignment_email_sent_at IS NULL
		RETURNING true
	`, jobApplicationID).Scan(&claimed)

	if err == sql.ErrNoRows {
		return nil
	}
	if err != nil {
		return fmt.Errorf("failed to claim assignment email send: %w", err)
	}

	var candidateEmail, candidateName, positionTitle string
	err = s.db.QueryRow(`
		SELECT c.email, c.full_name, p.position_title
		FROM job_applications ja
		JOIN candidates c ON ja.candidate_id = c.id
		JOIN hiring_positions p ON ja.position_id = p.id
		WHERE ja.id = $1::uuid
	`, jobApplicationID).Scan(&candidateEmail, &candidateName, &positionTitle)
	if err != nil {
		return fmt.Errorf("failed to fetch candidate/position for assignment email: %w", err)
	}

	subject := fmt.Sprintf("Your assignment for %s", positionTitle)
	if highTier {
		subject = fmt.Sprintf("Your application stood out for %s — assignment inside", positionTitle)
	}

	_, err = email.Enqueue(context.Background(), s.db, email.EmailJob{
		ToEmail:   candidateEmail,
		ToName:    candidateName,
		FromEmail: s.fromEmail(),
		Subject:   subject,
		Template:  email.TemplateAssignmentInvite,
		TemplateData: map[string]any{
			"CandidateName": candidateName,
			"Position":      positionTitle,
			"RepoURL":       repoURL,
			"HighTier":      highTier,
		},
		EntityType:  "job_application",
		EntityID:    jobApplicationID,
		TriggeredBy: "system:analyzer",
		Priority:    email.PriorityNormal,
	})
	if err != nil {
		return fmt.Errorf("failed to enqueue assignment email: %w", err)
	}

	return nil
}

func (s *Service) getGithubCredentials() (org, token string, err error) {
	var encryptedToken string
	err = s.db.QueryRow(`SELECT org_name, pat_encrypted FROM github_credentials WHERE id = 1`).Scan(&org, &encryptedToken)
	if err == sql.ErrNoRows {
		return "", "", fmt.Errorf("github credentials not configured")
	}
	if err != nil {
		return "", "", err
	}

	decrypted, derr := decryptToken(encryptedToken, s.encryptionSecret)
	if derr != nil {
		return "", "", fmt.Errorf("failed to decrypt github token: %w", derr)
	}

	return org, decrypted, nil
}

func generateRepoName(jobApplicationID string) (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return "", err
	}
	suffix := n.Int64() + 100000

	shortID := strings.ReplaceAll(jobApplicationID, "-", "")
	if len(shortID) > 8 {
		shortID = shortID[:8]
	}

	return fmt.Sprintf("assignment-%s-%d", shortID, suffix), nil
}

func (s *Service) markAnalyzedFailed(jobApplicationID string) error {
	_, err := s.db.Exec(`
		UPDATE job_applications
		SET analyzed = true, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1::uuid
	`, jobApplicationID)
	return err
}

func (s *Service) GetByApplicationID(jobApplicationID string) ([]models.RepoAnalysis, error) {
	rows, err := s.db.Query(`
		SELECT id, job_application_id, repo_url, candidate_id, total_score, message_score,
		       atomicity_score, cadence_score, author_score, semantic_score, tier, commit_count,
		       avg_lines_per_commit, details, created_at
		FROM repo_analyses
		WHERE job_application_id = $1::uuid
		ORDER BY created_at ASC
	`, jobApplicationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []models.RepoAnalysis
	for rows.Next() {
		var a models.RepoAnalysis
		var semanticScore sql.NullFloat64
		if err := rows.Scan(
			&a.ID, &a.JobApplicationID, &a.RepoURL, &a.CandidateID, &a.TotalScore, &a.MessageScore,
			&a.AtomicityScore, &a.CadenceScore, &a.AuthorScore, &semanticScore, &a.Tier, &a.CommitCount,
			&a.AvgLinesPerCommit, &a.Details, &a.CreatedAt,
		); err != nil {
			return nil, err
		}
		if semanticScore.Valid {
			a.SemanticScore = &semanticScore.Float64
		}
		results = append(results, a)
	}
	return results, rows.Err()
}

type PendingApplication struct {
	ID          string
	CandidateID string
	GithubURLs  []string
}

func (s *Service) FetchPendingApplications(limit int) ([]PendingApplication, error) {
	rows, err := s.db.Query(`
		SELECT id, candidate_id, github_urls
		FROM job_applications
		WHERE analyzed = false
		ORDER BY applied_at ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pending []PendingApplication
	for rows.Next() {
		var p PendingApplication
		var urls pq.StringArray
		if err := rows.Scan(&p.ID, &p.CandidateID, &urls); err != nil {
			return nil, err
		}
		p.GithubURLs = []string(urls)
		pending = append(pending, p)
	}
	return pending, rows.Err()
}

func (s *Service) getCandidateAndPositionNames(jobApplicationID string) (candidateName, positionTitle string, err error) {
	err = s.db.QueryRow(`
		SELECT c.full_name, p.position_title
		FROM job_applications ja
		JOIN candidates c ON ja.candidate_id = c.id
		JOIN hiring_positions p ON ja.position_id = p.id
		WHERE ja.id = $1::uuid
	`, jobApplicationID).Scan(&candidateName, &positionTitle)
	return
}
