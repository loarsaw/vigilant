// server/handlers/candidate/candidate-handler.go
package candidate

import (
	"database/sql"
	"encoding/json"
	"math"

	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"vigilant/config"

	"vigilant/models"

	"github.com/gin-gonic/gin"

	"github.com/lib/pq"
)

type Handlers struct {
	DB  *sql.DB
	Cfg *config.Config
}

func (h *Handlers) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"timestamp": time.Now(),
		"service":   "vigilant-server",
	})
}

// func (h *Handlers) GetLiveKitToken(c *gin.Context) {
// 	roomName := c.Query("room_name")
// 	identity := c.GetString("user_id") // From AuthMiddleware

// 	if roomName == "" {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "room_name is required"})
// 		return
// 	}

// 	// 1. Initialize LiveKit service passing the DB handle
// 	lkService := livekit.NewService(h.DB)

// 	// 2. Call GenerateToken on the service (it fetches the DB config internally)
// 	token, host, err := lkService.GenerateToken(roomName, identity, false)
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "LiveKit configuration error or token generation failed"})
// 		return
// 	}

// 	c.JSON(http.StatusOK, gin.H{
// 		"token": token,
// 		"host":  host,
// 	})
// }

func (h *Handlers) GetInterviewSessionID(c *gin.Context) {
	interviewID := c.Param("interview_id")
	if interviewID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "interview_id is required"})
		return
	}

	var sessionID string
	err := h.DB.QueryRow(`
		SELECT session_id
		FROM interview_sessions
		WHERE id = $1
	`, interviewID).Scan(&sessionID)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "interview not found"})
		return
	} else if err != nil {
		log.Printf("Error fetching session_id for interview %s: %v", interviewID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"interview_id": interviewID,
		"session_id":   sessionID,
	})
}

func (h *Handlers) CreateProcessReport(c *gin.Context) {
	var report models.ProcessReport

	if err := c.ShouldBindJSON(&report); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if report.SessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id is required"})
		return
	}

	var sessionExists bool
	err := h.DB.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM interview_sessions WHERE session_id = $1)
	`, report.SessionID).Scan(&sessionExists)
	if err != nil || !sessionExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "interview session not found"})
		return
	}

	alertCount := 0
	highMemAlerts := 0
	electronAlerts := 0

	for _, p := range report.Processes {
		if p.IsUnknown {
			alertCount++
			if p.IsElectron {
				electronAlerts++
			} else if p.Memory > 500 {
				highMemAlerts++
			}
		}
	}

	processesJSON, err := json.Marshal(report.Processes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encode processes"})
		return
	}

	query := `
		INSERT INTO process_reports (session_id, processes, alert_count, high_memory_alerts, unknown_electron_alerts)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, reported_at
	`

	var id int64
	var reportedAt time.Time
	err = h.DB.QueryRow(query, report.SessionID, processesJSON, alertCount, highMemAlerts, electronAlerts).Scan(&id, &reportedAt)
	if err != nil {
		log.Printf("Error inserting process report: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save process report"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":         id,
		"session_id": report.SessionID,
		"timestamp":  reportedAt,
		"alerts":     alertCount,
	})
}

func (h *Handlers) ListSessions(c *gin.Context) {
	query := `
		SELECT s.id, s.session_id, s.candidate_email, s.candidate_name, s.started_at, s.ended_at,
		       COUNT(pr.id) as report_count,
		       COALESCE(SUM(pr.alert_count), 0) as total_alerts
		FROM sessions s
		LEFT JOIN process_reports pr ON s.session_id = pr.session_id
		GROUP BY s.id, s.session_id, s.candidate_email, s.candidate_name, s.started_at, s.ended_at
		ORDER BY s.started_at DESC
	`

	rows, err := h.DB.Query(query)
	if err != nil {
		log.Printf("Error querying sessions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve sessions"})
		return
	}
	defer rows.Close()

	sessions := []gin.H{}

	for rows.Next() {
		var id int64
		var sessionID, candidateEmail, candidateName string
		var startedAt time.Time
		var endedAt sql.NullTime
		var reportCount, totalAlerts int

		if err := rows.Scan(&id, &sessionID, &candidateEmail, &candidateName, &startedAt, &endedAt, &reportCount, &totalAlerts); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		session := gin.H{
			"id":              id,
			"session_id":      sessionID,
			"candidate_email": candidateEmail,
			"candidate_name":  candidateName,
			"started_at":      startedAt,
			"report_count":    reportCount,
			"total_alerts":    totalAlerts,
		}

		if endedAt.Valid {
			session["ended_at"] = endedAt.Time
		}

		sessions = append(sessions, session)
	}

	c.JSON(http.StatusOK, sessions)
}

func (h *Handlers) EndSession(c *gin.Context) {
	sessionID := c.Param("session_id")

	var req struct {
		Notes  string `json:"notes"`
		Status string `json:"status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil || req.Status == "" {
		req.Status = "completed"
	}

	query := `
        UPDATE interview_sessions
        SET ended_at = NOW(),
            status = $1,
            notes = $2
        WHERE session_id = $3 AND ended_at IS NULL
    `

	result, err := h.DB.Exec(query, req.Status, req.Notes, sessionID)
	if err != nil {
		log.Printf("Error ending session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to end session"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found or already ended"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "session_ended", "session_id": sessionID})
}

func (h *Handlers) CompleteOnboarding(c *gin.Context) {
	rawID, exists := c.Get("candidate_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	candidateID := fmt.Sprintf("%v", rawID)

	var req models.CompleteOnboardingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	skillsStr := strings.Join(req.Skills, ",")

	result, err := h.DB.ExecContext(c.Request.Context(), `
		UPDATE candidates SET
			phone_number        = $1,
			github_url          = $2,
			resume_url          = $3,
			skills              = $4,
			experience_years    = $5,
			onboarding_complete = TRUE,
			updated_at          = NOW()
		WHERE id = $6::uuid
	`, req.PhoneNumber, req.GithubID, req.ResumeLink, skillsStr, req.ExperienceYears, candidateID)

	if err != nil {
		log.Printf("CompleteOnboarding: failed to update candidate %s: %v", candidateID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to complete onboarding"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		log.Printf("CompleteOnboarding: no rows updated for candidate_id=%q", candidateID)
		c.JSON(http.StatusNotFound, gin.H{"error": "candidate not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "onboarding complete"})
}

func (h *Handlers) GetOpenPositions(c *gin.Context) {
	query := `
		SELECT id, position_title
		FROM hiring_positions
		WHERE is_active = true AND status = 'active'
		ORDER BY created_at DESC
	`

	rows, err := h.DB.Query(query)
	if err != nil {
		log.Printf("Error querying open positions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve positions"})
		return
	}
	defer rows.Close()

	type OpenPosition struct {
		ID            string `json:"id"`
		PositionTitle string `json:"position_title"`
	}

	positions := []OpenPosition{}
	for rows.Next() {
		var pos OpenPosition

		if err := rows.Scan(&pos.ID, &pos.PositionTitle); err != nil {
			log.Printf("Error scanning position: %v", err)
			continue
		}

		positions = append(positions, pos)
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error iterating positions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve positions"})
		return
	}

	if len(positions) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"data":  []OpenPosition{},
			"total": 0,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  positions,
		"total": len(positions),
	})
}

func (h *Handlers) GetPositionDetails(c *gin.Context) {
	positionID := c.Param("id")

	var pos struct {
		ID                 string
		PositionTitle      string
		Department         string
		Location           string
		EmploymentType     string
		ExperienceRequired string
		SalaryRangeMin     sql.NullInt64
		SalaryRangeMax     sql.NullInt64
		SalaryRangeText    sql.NullString
		NumberOfOpenings   int
		JobDescription     string
		Requirements       string
	}

	query := `
		SELECT id, position_title, department, location, employment_type,
		       experience_required, salary_range_min, salary_range_max,
		       salary_range_text, number_of_openings, job_description, requirements
		FROM hiring_positions
		WHERE id = $1 AND is_active = true AND status = 'active'
	`

	err := h.DB.QueryRow(query, positionID).Scan(
		&pos.ID, &pos.PositionTitle, &pos.Department, &pos.Location,
		&pos.EmploymentType, &pos.ExperienceRequired,
		&pos.SalaryRangeMin, &pos.SalaryRangeMax, &pos.SalaryRangeText,
		&pos.NumberOfOpenings, &pos.JobDescription, &pos.Requirements,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "position not found"})
		return
	}
	if err != nil {
		log.Printf("Error fetching position details: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve position"})
		return
	}

	response := gin.H{
		"id":                  pos.ID,
		"position_title":      pos.PositionTitle,
		"department":          pos.Department,
		"location":            pos.Location,
		"employment_type":     pos.EmploymentType,
		"experience_required": pos.ExperienceRequired,
		"number_of_openings":  pos.NumberOfOpenings,
		"job_description":     pos.JobDescription,
		"requirements":        pos.Requirements,
	}

	if pos.SalaryRangeMin.Valid {
		response["salary_range_min"] = pos.SalaryRangeMin.Int64
	}
	if pos.SalaryRangeMax.Valid {
		response["salary_range_max"] = pos.SalaryRangeMax.Int64
	}
	if pos.SalaryRangeText.Valid {
		response["salary_range_text"] = pos.SalaryRangeText.String
	}

	c.JSON(http.StatusOK, gin.H{"data": response})
}

func (h *Handlers) ListPositions(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "10")
	search := strings.TrimSpace(c.Query("search"))
	status := strings.TrimSpace(c.Query("status"))
	department := strings.TrimSpace(c.Query("department"))
	location := strings.TrimSpace(c.Query("location"))
	isActive := c.DefaultQuery("is_active", "")

	candidateIDVal, exists := c.Get("candidate_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	candidateID, ok := candidateIDVal.(string)
	if !ok || candidateID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid candidate id"})
		return
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	args := []interface{}{}
	whereConditions := []string{}

	if search != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("(hp.position_title ILIKE $%d OR hp.job_description ILIKE $%d)", len(args)+1, len(args)+1))
		args = append(args, "%"+search+"%")
	}
	if status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("hp.status = $%d", len(args)+1))
		args = append(args, status)
	}
	if department != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("hp.department ILIKE $%d", len(args)+1))
		args = append(args, "%"+department+"%")
	}
	if location != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("hp.location ILIKE $%d", len(args)+1))
		args = append(args, "%"+location+"%")
	}
	if isActive != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("hp.is_active = $%d", len(args)+1))
		args = append(args, isActive == "true")
	}

	where := ""
	if len(whereConditions) > 0 {
		where = "WHERE " + strings.Join(whereConditions, " AND ")
	}

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM hiring_positions hp %s", where)
	if err := h.DB.QueryRow(countQuery, args...).Scan(&total); err != nil {
		log.Printf("Error counting positions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count positions"})
		return
	}

	candidateIDPlaceholder := fmt.Sprintf("$%d", len(args)+1)
	limitPlaceholder := fmt.Sprintf("$%d", len(args)+2)
	offsetPlaceholder := fmt.Sprintf("$%d", len(args)+3)
	args = append(args, candidateID, limit, offset)

	query := fmt.Sprintf(`
		SELECT
			hp.id, hp.position_title, hp.department, hp.location,
			hp.employment_type, hp.experience_required,
			hp.salary_range_min, hp.salary_range_max, hp.salary_range_text,
			hp.number_of_openings, hp.job_description, hp.requirements,
			hp.status, hp.created_at, hp.updated_at,
			hp.created_by, hp.updated_by, hp.is_active,

			ja.id           AS application_id,
			ja.status       AS application_status,
			ja.applied_at   AS applied_at,

			is2.session_id     AS interview_session_id,
			is2.scheduled_at   AS interview_scheduled_at,
			is2.interview_url  AS interview_url,
			is2.status         AS interview_status

		FROM hiring_positions hp
		LEFT JOIN job_applications ja
			ON ja.position_id = hp.id AND ja.candidate_id = %s
		LEFT JOIN LATERAL (
			SELECT session_id, scheduled_at, interview_url, status
			FROM interview_sessions
			WHERE application_id = ja.id
			ORDER BY created_at DESC
			LIMIT 1
		) is2 ON ja.id IS NOT NULL
		%s
		ORDER BY hp.created_at DESC
		LIMIT %s OFFSET %s
	`, candidateIDPlaceholder, where, limitPlaceholder, offsetPlaceholder)

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		log.Printf("Error querying positions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve positions"})
		return
	}
	defer rows.Close()

	type InterviewInfo struct {
		SessionID    string    `json:"session_id"`
		ScheduledAt  time.Time `json:"scheduled_at"`
		InterviewURL string    `json:"interview_url"`
		Status       string    `json:"status"`
	}

	type PositionWithApplication struct {
		models.HiringPosition
		ApplicationID     *string        `json:"application_id,omitempty"`
		ApplicationStatus *string        `json:"application_status,omitempty"`
		AppliedAt         *time.Time     `json:"applied_at,omitempty"`
		Interview         *InterviewInfo `json:"interview,omitempty"`
	}

	positions := []PositionWithApplication{}

	for rows.Next() {
		var pos models.HiringPosition
		var createdBy, updatedBy, salaryRangeText sql.NullString

		var applicationID, applicationStatus sql.NullString
		var appliedAt sql.NullTime

		var interviewSessionID sql.NullString
		var interviewScheduledAt sql.NullTime
		var interviewURL, interviewStatus sql.NullString

		if err := rows.Scan(
			&pos.ID, &pos.PositionTitle, &pos.Department, &pos.Location,
			&pos.EmploymentType, &pos.ExperienceRequired,
			&pos.SalaryRangeMin, &pos.SalaryRangeMax, &salaryRangeText,
			&pos.NumberOfOpenings, &pos.JobDescription, &pos.Requirements,
			&pos.Status, &pos.CreatedAt, &pos.UpdatedAt,
			&createdBy, &updatedBy, &pos.IsActive,
			&applicationID, &applicationStatus, &appliedAt,
			&interviewSessionID, &interviewScheduledAt, &interviewURL, &interviewStatus,
		); err != nil {
			log.Printf("Error scanning position: %v", err)
			continue
		}

		if createdBy.Valid {
			pos.CreatedBy = &createdBy.String
		}
		if updatedBy.Valid {
			pos.UpdatedBy = &updatedBy.String
		}
		if salaryRangeText.Valid {
			pos.SalaryRangeText = salaryRangeText.String
		}

		entry := PositionWithApplication{HiringPosition: pos}

		if applicationID.Valid {
			entry.ApplicationID = &applicationID.String
			entry.ApplicationStatus = &applicationStatus.String
			if appliedAt.Valid {
				entry.AppliedAt = &appliedAt.Time
			}
		}

		if interviewScheduledAt.Valid && interviewSessionID.Valid {
			entry.Interview = &InterviewInfo{
				SessionID:    interviewSessionID.String,
				ScheduledAt:  interviewScheduledAt.Time,
				InterviewURL: interviewURL.String,
				Status:       interviewStatus.String,
			}
		}

		positions = append(positions, entry)
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error iterating positions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve positions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":        positions,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": int(math.Ceil(float64(total) / float64(limit))),
	})
}

func (h *Handlers) CreateAssignmentSubmission(c *gin.Context) {
	applicationID := c.Param("id")

	var req models.CreateAssignmentSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"details": err.Error(),
		})
		return
	}

	// Confirm the caller is authenticated as a candidate.
	candidateIDVal, exists := c.Get("candidate_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}
	candidateID, _ := candidateIDVal.(string)
	if candidateID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	// Look up the application, its owner, and its attached assignment (via position) in one query.
	var ownerCandidateID string
	var attachedAssignmentID sql.NullString

	err := h.DB.QueryRow(`
    SELECT ja.candidate_id, COALESCE(ja.assignment_id, p.assignment_id)
    FROM job_applications ja
    JOIN hiring_positions p ON ja.position_id = p.id
    WHERE ja.id = $1::uuid
`, applicationID).Scan(&ownerCandidateID, &attachedAssignmentID)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "job application not found"})
		return
	}
	if err != nil {
		log.Printf("Error verifying application/assignment link: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create submission"})
		return
	}

	// Ownership check: this application must belong to the authenticated candidate.
	if ownerCandidateID != candidateID {
		c.JSON(http.StatusForbidden, gin.H{"error": "you do not have access to this application"})
		return
	}

	// The position tied to this application must actually have an assignment attached.
	if !attachedAssignmentID.Valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "this application has no assignment to submit against"})
		return
	}
	assignmentID := attachedAssignmentID.String

	// Determine next attempt number for this application+assignment pair.
	var nextAttempt int
	err = h.DB.QueryRow(`
		SELECT COALESCE(MAX(attempt_number), 0) + 1
		FROM assignment_submissions
		WHERE job_application_id = $1::uuid AND assignment_id = $2::uuid
	`, applicationID, assignmentID).Scan(&nextAttempt)

	if err != nil {
		log.Printf("Error computing attempt number: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create submission"})
		return
	}

	var submission models.AssignmentSubmission
	err = h.DB.QueryRow(`
		INSERT INTO assignment_submissions (
			job_application_id, assignment_id, attempt_number,
			submission_text, submission_files, submission_links, status
		) VALUES ($1, $2, $3, $4, $5, $6, 'submitted')
		RETURNING id, job_application_id, assignment_id, attempt_number,
			submission_text, submission_files, submission_links, status,
			score, feedback, submitted_at, reviewed_at, reviewed_by,
			created_at, updated_at
	`,
		applicationID,
		assignmentID,
		nextAttempt,
		req.SubmissionText,
		pq.Array(req.SubmissionFiles),
		pq.Array(req.SubmissionLinks),
	).Scan(
		&submission.ID, &submission.JobApplicationID, &submission.AssignmentID,
		&submission.AttemptNumber, &submission.SubmissionText,
		pq.Array(&submission.SubmissionFiles), pq.Array(&submission.SubmissionLinks),
		&submission.Status, &submission.Score, &submission.Feedback,
		&submission.SubmittedAt, &submission.ReviewedAt, &submission.ReviewedBy,
		&submission.CreatedAt, &submission.UpdatedAt,
	)

	if err != nil {
		log.Printf("Error creating assignment submission: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create submission"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "submission received successfully",
		"data":    submission,
	})
}

// parseGithubOwnerRepo extracts the owner and repo name from a github.com URL
// and rejects anything that isn't a github.com repo link.
func parseGithubOwnerRepo(rawURL string) (owner, repo string, err error) {
	u, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return "", "", fmt.Errorf("invalid url")
	}
	host := strings.ToLower(u.Host)
	if host != "github.com" && host != "www.github.com" {
		return "", "", fmt.Errorf("must be a github.com url")
	}
	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	if len(parts) < 2 || parts[0] == "" || parts[1] == "" {
		return "", "", fmt.Errorf("must look like github.com/<owner>/<repo>")
	}
	return parts[0], strings.TrimSuffix(parts[1], ".git"), nil
}

func (h *Handlers) ApplyForPosition(c *gin.Context) {
	positionID := c.Param("id")
	if positionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "position id is required"})
		return
	}

	var req models.CreateJobApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"details": err.Error(),
		})
		return
	}

	// Belt-and-suspenders check on top of the binding tag, since the JSON
	// binder rejects malformed requests but it's cheap to double-check the
	// bound count here too before it ever reaches the DB constraint.
	if len(req.GithubUrls) < 1 || len(req.GithubUrls) > 3 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "github_urls must contain between 1 and 3 URLs"})
		return
	}

	// Parse + validate every URL, normalize to a canonical form, and make
	// sure they all belong to the same GitHub account.
	var owner string
	normalizedURLs := make([]string, len(req.GithubUrls))
	for i, raw := range req.GithubUrls {
		o, repo, err := parseGithubOwnerRepo(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("github_urls[%d]: %v", i, err)})
			return
		}
		if i == 0 {
			owner = o
		} else if !strings.EqualFold(o, owner) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "all github_urls must belong to the same GitHub account"})
			return
		}
		normalizedURLs[i] = fmt.Sprintf("https://github.com/%s/%s", o, repo)
	}

	var positionExists bool
	err := h.DB.QueryRow(`
        SELECT EXISTS(
            SELECT 1 FROM hiring_positions
            WHERE id = $1 AND is_active = TRUE AND status = 'active'
        )
    `, positionID).Scan(&positionExists)
	if err != nil {
		log.Printf("Error verifying position: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify position"})
		return
	}
	if !positionExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "position not found or no longer active"})
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to submit application"})
		return
	}
	defer tx.Rollback()

	// find-or-create candidate by email
	var candidateID string
	err = tx.QueryRow(`
        INSERT INTO candidates (email, full_name, phone_number)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
        RETURNING id
    `, req.Email, req.FullName, req.PhoneNumber).Scan(&candidateID)
	if err != nil {
		log.Printf("Error upserting candidate: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to submit application"})
		return
	}

	var app models.JobApplication
	var coverLetter sql.NullString
	var githubURLs pq.StringArray

	err = tx.QueryRow(`
    INSERT INTO job_applications (
        candidate_id, position_id, full_name, phone_number,
        resume_url, github_urls, skills, experience_years, cover_letter
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, candidate_id, position_id, full_name, phone_number,
              resume_url, github_urls, skills, experience_years,
              status, applied_at, updated_at, cover_letter
`, candidateID, positionID, req.FullName, req.PhoneNumber,
		req.ResumeUrl, pq.Array(normalizedURLs), req.Skills, req.ExperienceYears, req.CoverLetter,
	).Scan(
		&app.ID, &app.CandidateID, &app.PositionID, &app.FullName, &app.PhoneNumber,
		&app.ResumeUrl, &githubURLs, &app.Skills, &app.ExperienceYears,
		&app.Status, &app.AppliedAt, &app.UpdatedAt, &coverLetter,
	)

	if err != nil {
		if strings.Contains(err.Error(), "unique constraint") || strings.Contains(err.Error(), "duplicate key") {
			c.JSON(http.StatusConflict, gin.H{"error": "you have already submitted an application"})
			return
		}
		log.Printf("Error creating application: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to submit application"})
		return
	}

	// Record each repo in the junction table. The (position_id, repo_url)
	// primary key makes this atomic and race-safe -- if another transaction
	// commits the same repo for this position first, this INSERT fails and
	// the whole application is rolled back.
	_, err = tx.Exec(`
        INSERT INTO job_application_repos (repo_url, position_id, application_id)
        SELECT unnest($1::varchar[]), $2, $3
    `, pq.Array(normalizedURLs), positionID, app.ID)
	if err != nil {
		if strings.Contains(err.Error(), "unique constraint") || strings.Contains(err.Error(), "duplicate key") {
			c.JSON(http.StatusConflict, gin.H{"error": "one or more of these repositories has already been submitted for this position"})
			return
		}
		log.Printf("Error recording application repos: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to submit application"})
		return
	}

	app.GithubUrls = normalizedURLs

	if coverLetter.Valid {
		app.CoverLetter = coverLetter.String
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to submit application"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": app})
}

func (h *Handlers) JoinInterviewSession(c *gin.Context) {
	sessionID := c.Param("session_id")

	candidateSessionIDVal, exists := c.Get("candidate_session_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	candidateSessionID, ok := candidateSessionIDVal.(string)
	if !ok || candidateSessionID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
		return
	}

	result, err := h.DB.Exec(`
        UPDATE interview_sessions
        SET candidate_session_id = $1,
            started_at = NOW(),
            status = 'in_progress'
        WHERE session_id = $2
          AND status = 'scheduled'
    `, candidateSessionID, sessionID)
	if err != nil {
		log.Printf("JoinInterviewSession: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to join session"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found or already started"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "joined session", "session_id": sessionID})
}

func (h *Handlers) UpdateMe(c *gin.Context) {
	candidateIDVal, exists := c.Get("candidate_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}
	candidateID := candidateIDVal.(string)

	var req struct {
		FullName        *string `json:"full_name"`
		GithubUrl       *string `json:"github_url"`
		PhoneNumber     *string `json:"phone_number"`
		ResumeUrl       *string `json:"resume_url"`
		Skills          *string `json:"skills"`
		ExperienceYears *int    `json:"experience_years"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	updates := []string{}
	args := []interface{}{}
	argID := 1

	if req.FullName != nil {
		updates = append(updates, fmt.Sprintf("full_name = $%d", argID))
		args = append(args, *req.FullName)
		argID++
	}
	if req.GithubUrl != nil {
		updates = append(updates, fmt.Sprintf("github_url = $%d", argID))
		args = append(args, *req.GithubUrl)
		argID++
	}
	if req.PhoneNumber != nil {
		updates = append(updates, fmt.Sprintf("phone_number = $%d", argID))
		args = append(args, *req.PhoneNumber)
		argID++
	}
	if req.ResumeUrl != nil {
		updates = append(updates, fmt.Sprintf("resume_url = $%d", argID))
		args = append(args, *req.ResumeUrl)
		argID++
	}
	if req.Skills != nil {
		updates = append(updates, fmt.Sprintf("skills = $%d", argID))
		args = append(args, *req.Skills)
		argID++
	}
	if req.ExperienceYears != nil {
		updates = append(updates, fmt.Sprintf("experience_years = $%d", argID))
		args = append(args, *req.ExperienceYears)
		argID++
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields to update"})
		return
	}

	updates = append(updates, "updated_at = NOW()")
	args = append(args, candidateID)

	query := fmt.Sprintf(
		"UPDATE candidates SET %s WHERE id = $%d::uuid AND is_active = true",
		strings.Join(updates, ", "),
		argID,
	)

	result, err := h.DB.Exec(query, args...)
	if err != nil {
		log.Printf("Error updating candidate profile: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "candidate not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

func (h *Handlers) VerifyRoomPasscode(c *gin.Context) {
	var req struct {
		Passcode string `json:"passcode" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request format", "details": err.Error()})
		return
	}

	passcode := strings.TrimSpace(req.Passcode)
	if passcode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "passcode is required"})
		return
	}

	ctx := c.Request.Context()

	var (
		sessionID string
		roomToken string
		roomHost  sql.NullString
		expiresAt time.Time
	)

	err := h.DB.QueryRowContext(ctx, `
		SELECT session_id, room_token, room_host, expires_at
		FROM interview_room_passcodes
		WHERE passcode = $1
	`, passcode).Scan(&sessionID, &roomToken, &roomHost, &expiresAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "invalid passcode"})
		return
	}
	if err != nil {
		log.Printf("VerifyRoomPasscode: failed to fetch passcode: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if time.Now().After(expiresAt) {
		c.JSON(http.StatusGone, gin.H{"error": "passcode has expired"})
		return
	}

	_, err = h.DB.ExecContext(ctx, `
		UPDATE interview_room_passcodes
		SET used_at = NOW()
		WHERE passcode = $1
	`, passcode)
	if err != nil {
		// Non-fatal: log it, but don't block the join over a bookkeeping write.
		log.Printf("VerifyRoomPasscode: failed to update used_at for passcode: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"session_id": sessionID,
		"room_token": roomToken,
		"room_host":  roomHost.String,
	})
}
