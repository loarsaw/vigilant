package models

import (
	"database/sql"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ========================================
// PROCESS MONITORING MODELS
// ========================================

type ProcessReport struct {
	ID        int64     `json:"id,omitempty"`
	SessionID string    `json:"session_id"`
	Timestamp time.Time `json:"timestamp,omitempty"`
	Processes []Process `json:"processes"`
}

type Process struct {
	PID        int     `json:"pid"`
	Name       string  `json:"name"`
	Memory     float64 `json:"memory"`
	IsUnknown  bool    `json:"is_unknown"`
	IsElectron bool    `json:"is_electron"`
	Command    string  `json:"cmd"`
}

type ProcessLog struct {
	ID                 int64     `json:"id"`
	InterviewSessionID int64     `json:"interview_session_id"`
	CandidateSessionID *string   `json:"candidate_session_id,omitempty"`
	LoggedAt           time.Time `json:"logged_at"`

	PID  int  `json:"pid"`
	PPID *int `json:"ppid,omitempty"`

	Name string `json:"name"`
	Path string `json:"path,omitempty"`
	Cmd  string `json:"cmd,omitempty"`

	Memory   float64  `json:"memory"`
	CPUUsage *float64 `json:"cpu_usage,omitempty"`

	IsUserApp   bool    `json:"is_user_app"`
	IsGuiApp    bool    `json:"is_gui_app"`
	Username    string  `json:"username,omitempty"`
	ProcessType string  `json:"process_type"`
	Category    string  `json:"category"`
	Confidence  float64 `json:"confidence"`

	IsUnknown    bool   `json:"is_unknown"`
	IsSuspicious bool   `json:"is_suspicious"`
	IsElectron   bool   `json:"is_electron"`
	AlertLevel   string `json:"alert_level"`

	CreatedAt time.Time `json:"created_at"`
}

type ProcessLogBatch struct {
	SessionID string       `json:"session_id" validate:"required"`
	Processes []ProcessLog `json:"processes" validate:"required,min=1"`
}

type AlertSummary struct {
	ID                  int64      `json:"id"`
	InterviewSessionID  int64      `json:"interview_session_id"`
	TotalProcesses      int        `json:"total_processes"`
	UnknownProcesses    int        `json:"unknown_processes"`
	SuspiciousProcesses int        `json:"suspicious_processes"`
	HighMemoryProcesses int        `json:"high_memory_processes"`
	ElectronProcesses   int        `json:"electron_processes"`
	CriticalAlerts      int        `json:"critical_alerts"`
	HighAlerts          int        `json:"high_alerts"`
	MediumAlerts        int        `json:"medium_alerts"`
	LowAlerts           int        `json:"low_alerts"`
	RiskScore           float64    `json:"risk_score"`
	FirstAlertAt        *time.Time `json:"first_alert_at,omitempty"`
	LastAlertAt         *time.Time `json:"last_alert_at,omitempty"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

// ========================================
// CANDIDATE MODELS
// ========================================

type Candidate struct {
	ID                 string     `json:"id"`
	Email              string     `json:"email"`
	FullName           string     `json:"full_name,omitempty"`
	PhoneNumber        string     `json:"phone_number,omitempty"`
	IsActive           bool       `json:"is_active"`
	OnboardingComplete bool       `json:"onboarding_complete"`
	LastLogin          *time.Time `json:"last_login,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type CandidateLogin struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

type CandidateRegister struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	FullName string `json:"full_name" validate:"required"`
}

type CandidateSession struct {
	ID           string     `json:"id"`
	CandidateID  string     `json:"candidate_id"`
	SessionToken string     `json:"session_token"`
	LoggedInAt   time.Time  `json:"logged_in_at"`
	LoggedOutAt  *time.Time `json:"logged_out_at,omitempty"`
	LastActivity time.Time  `json:"last_activity"`
	SystemType   string     `json:"system_type,omitempty"`
	OSVersion    string     `json:"os_version,omitempty"`
	IPAddress    string     `json:"ip_address,omitempty"`
	UserAgent    string     `json:"user_agent,omitempty"`
	Country      string     `json:"country,omitempty"`
	City         string     `json:"city,omitempty"`
	IsActive     bool       `json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
}

// ========================================
// ADMINISTRATOR MODELS
// ========================================

type Administrator struct {
	ID           string         `json:"id"`
	Email        string         `json:"email"`
	PasswordHash string         `json:"-"`
	FullName     string         `json:"full_name"`
	PhoneNumber  sql.NullString `json:"phone_number,omitempty"`
	Role         string         `json:"role"`
	Department   sql.NullString `json:"department,omitempty"`
	Designation  sql.NullString `json:"designation,omitempty"`
	IsActive     bool           `json:"is_active"`
	LastLogin    sql.NullTime   `json:"last_login,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	CreatedBy    uuid.NullUUID  `json:"created_by,omitempty"`
}

type AdministratorLogin struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

type AdministratorRegister struct {
	Email       string `json:"email" validate:"required,email"`
	Password    string `json:"password" validate:"required,min=8"`
	FullName    string `json:"full_name" validate:"required"`
	Role        string `json:"role" validate:"required,oneof=hr interviewer"`
	Department  string `json:"department,omitempty"`
	Designation string `json:"designation,omitempty"`
	PhoneNumber string `json:"phone_number,omitempty"`
}

// ========================================
// HIRING POSITIONS MODELS
// ========================================

type HiringPosition struct {
	ID                 string    `json:"id"`
	PositionTitle      string    `json:"position_title"`
	Department         string    `json:"department"`
	Location           string    `json:"location"`
	EmploymentType     string    `json:"employment_type"`
	ExperienceRequired string    `json:"experience_required"`
	SalaryRangeMin     *int      `json:"salary_range_min,omitempty"`
	SalaryRangeMax     *int      `json:"salary_range_max,omitempty"`
	SalaryRangeText    string    `json:"salary_range_text,omitempty"`
	NumberOfOpenings   int       `json:"number_of_openings"`
	JobDescription     string    `json:"job_description"`
	Requirements       string    `json:"requirements"`
	AssignmentID       *string   `json:"assignment_id,omitempty"`
	AssignmentTitle    *string   `json:"assignment_title,omitempty"`
	Status             string    `json:"status"`
	IsActive           bool      `json:"is_active"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
	CreatedBy          *string   `json:"created_by,omitempty"`
	UpdatedBy          *string   `json:"updated_by,omitempty"`
}

type CreateHiringPositionRequest struct {
	PositionTitle      string  `json:"position_title" validate:"required"`
	Department         string  `json:"department" validate:"required"`
	Location           string  `json:"location" validate:"required"`
	EmploymentType     string  `json:"employment_type" validate:"required"`
	ExperienceRequired string  `json:"experience_required" validate:"required"`
	SalaryRangeMin     *int    `json:"salary_range_min,omitempty"`
	SalaryRangeMax     *int    `json:"salary_range_max,omitempty"`
	SalaryRangeText    string  `json:"salary_range_text,omitempty"`
	NumberOfOpenings   int     `json:"number_of_openings" validate:"required,min=1"`
	JobDescription     string  `json:"job_description" validate:"required"`
	Requirements       string  `json:"requirements" validate:"required"`
	AssignmentID       *string `json:"assignment_id,omitempty" validate:"omitempty,uuid"`
}

type UpdateHiringPositionRequest struct {
	PositionTitle      string  `json:"position_title,omitempty"`
	Department         string  `json:"department,omitempty"`
	Location           string  `json:"location,omitempty"`
	EmploymentType     string  `json:"employment_type,omitempty"`
	ExperienceRequired string  `json:"experience_required,omitempty"`
	SalaryRangeMin     *int    `json:"salary_range_min,omitempty"`
	SalaryRangeMax     *int    `json:"salary_range_max,omitempty"`
	SalaryRangeText    string  `json:"salary_range_text,omitempty"`
	NumberOfOpenings   int     `json:"number_of_openings,omitempty"`
	JobDescription     string  `json:"job_description,omitempty"`
	Requirements       string  `json:"requirements,omitempty"`
	AssignmentID       *string `json:"assignment_id,omitempty" validate:"omitempty,uuid"`
	Status             string  `json:"status,omitempty"`
	IsActive           bool    `json:"is_active,omitempty"`
}

// ========================================
// ASSIGNMENT MODELS
// ========================================

type Assignment struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	Description     string    `json:"description"`
	Instructions    string    `json:"instructions,omitempty"`
	ResourceLinks   []string  `json:"resource_links,omitempty"`
	DurationMinutes *int      `json:"duration_minutes,omitempty"`
	PassingScore    *int      `json:"passing_score,omitempty"`
	Status          string    `json:"status"`
	DifficultyLevel string    `json:"difficulty_level,omitempty"`
	GeneratedByAI   bool      `json:"generated_by_ai"`
	AINotes         string    `json:"ai_notes,omitempty"`
	StarterReadme   string    `json:"starter_readme,omitempty"`
	IsActive        bool      `json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	CreatedBy       *string   `json:"created_by,omitempty"`
	UpdatedBy       *string   `json:"updated_by,omitempty"`
}

type CreateAssignmentRequest struct {
	Title           string   `json:"title" validate:"required"`
	Description     string   `json:"description" validate:"required"`
	Instructions    string   `json:"instructions,omitempty"`
	ResourceLinks   []string `json:"resource_links,omitempty"`
	DurationMinutes *int     `json:"duration_minutes,omitempty" validate:"omitempty,min=1"`
	PassingScore    *int     `json:"passing_score,omitempty" validate:"omitempty,min=0"`
}

type UpdateAssignmentRequest struct {
	Title           string   `json:"title,omitempty"`
	Description     string   `json:"description,omitempty"`
	Instructions    string   `json:"instructions,omitempty"`
	ResourceLinks   []string `json:"resource_links,omitempty"`
	DurationMinutes *int     `json:"duration_minutes,omitempty"`
	PassingScore    *int     `json:"passing_score,omitempty"`
	Status          string   `json:"status,omitempty"`
	IsActive        bool     `json:"is_active,omitempty"`
}

// ========================================
// ASSIGNMENT SUBMISSION MODELS
// ========================================
type AssignmentSubmission struct {
	ID               string     `json:"id"`
	JobApplicationID string     `json:"job_application_id"`
	AssignmentID     string     `json:"assignment_id"`
	AttemptNumber    int        `json:"attempt_number"`
	SubmissionText   string     `json:"submission_text,omitempty"`
	SubmissionFiles  []string   `json:"submission_files,omitempty"`
	SubmissionLinks  []string   `json:"submission_links,omitempty"`
	Status           string     `json:"status"`
	Score            *int       `json:"score,omitempty"`
	Feedback         string     `json:"feedback,omitempty"`
	SubmittedAt      time.Time  `json:"submitted_at"`
	ReviewedAt       *time.Time `json:"reviewed_at,omitempty"`
	ReviewedBy       *string    `json:"reviewed_by,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type CreateAssignmentSubmissionRequest struct {
	JobApplicationID string   `json:"job_application_id" validate:"required,uuid"`
	AssignmentID     string   `json:"assignment_id" validate:"required,uuid"`
	SubmissionText   string   `json:"submission_text,omitempty"`
	SubmissionFiles  []string `json:"submission_files,omitempty"`
	SubmissionLinks  []string `json:"submission_links,omitempty" validate:"omitempty,dive,url"`
}

type ReviewAssignmentSubmissionRequest struct {
	Status   string `json:"status" validate:"required,oneof=reviewed passed failed"`
	Score    *int   `json:"score,omitempty" validate:"omitempty,min=0"`
	Feedback string `json:"feedback,omitempty"`
}

// ========================================
// JOB APPLICATIONS MODELS
// ========================================
type JobApplication struct {
	ID          string `json:"id"`
	CandidateID string `json:"candidate_id"`
	PositionID  string `json:"position_id"`

	FullName        string   `json:"full_name,omitempty"`
	PhoneNumber     string   `json:"phone_number,omitempty"`
	ResumeUrl       string   `json:"resume_url,omitempty"`
	GithubUrls      []string `json:"github_urls,omitempty"`
	Skills          string   `json:"skills,omitempty"`
	ExperienceYears uint8    `json:"experience_years"`
	AssignmentID    string   `json:"assignment_id,omitempty"`

	Status      string    `json:"status"`
	CoverLetter string    `json:"cover_letter,omitempty"`
	Notes       string    `json:"notes,omitempty"`
	AppliedAt   time.Time `json:"applied_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Analyzed     bool     `json:"analyzed"`
	OverallScore *float64 `json:"overall_score,omitempty"`
	OverallTier  string   `json:"overall_tier,omitempty"`

	IsQualified   bool `json:"is_qualified"`
	IsShortlisted bool `json:"is_shortlisted"`

	GithubRepoName         string     `json:"github_repo_name,omitempty"`
	GithubRepoURL          string     `json:"github_repo_url,omitempty"`
	GithubInviteStatus     string     `json:"github_invite_status,omitempty"`
	GithubInvitedAt        *time.Time `json:"github_invited_at,omitempty"`
	AssignmentEmailSent    *time.Time `json:"assignment_email_sent_at,omitempty"`
	AssignmentOverallScore *float64   `json:"assignment_overall_score,omitempty"`
	AssignmentOverallTier  string     `json:"assignment_overall_tier,omitempty"`
	AssignmentLastScoredAt *time.Time `json:"assignment_last_scored_at,omitempty"`
}

type CreateJobApplicationRequest struct {
	PositionID string `json:"position_id"`

	FullName        string   `json:"full_name" binding:"required"`
	Email           string   `json:"email" binding:"required,email"`
	PhoneNumber     string   `json:"phone_number,omitempty"`
	ResumeUrl       string   `json:"resume_url" binding:"required"`
	GithubUrls      []string `json:"github_urls" binding:"required,min=1,max=3,dive,required,url"`
	Skills          string   `json:"skills,omitempty"`
	ExperienceYears uint8    `json:"experience_years"`

	CoverLetter string `json:"cover_letter,omitempty"`
}

type UpdateJobApplicationRequest struct {
	Status      string `json:"status,omitempty"`
	Notes       string `json:"notes,omitempty"`
	CoverLetter string `json:"cover_letter,omitempty"`
}

type JobApplicationDetail struct {
	JobApplication
	Candidate        *Candidate            `json:"candidate,omitempty"`
	Position         *HiringPosition       `json:"position,omitempty"`
	Assignment       *Assignment           `json:"assignment,omitempty"`
	LatestSubmission *AssignmentSubmission `json:"latest_submission,omitempty"`
	RepoAnalyses     []RepoAnalysis        `json:"repo_analyses,omitempty"`
}

type AssignmentReviewResult struct {
	Score      float64  `json:"score"` // 0-100
	Summary    string   `json:"summary"`
	Strengths  []string `json:"strengths"`
	Weaknesses []string `json:"weaknesses"`
}

// ========================================
// GITHUB CREDENTIALS MODEL
// ========================================

type GithubCredentials struct {
	OrgName   string    `json:"org_name"`
	CreatedBy string    `json:"created_by,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SaveGithubCredentialsRequest struct {
	OrgName string `json:"org_name" binding:"required"`
	Token   string `json:"token" binding:"required"`
}

var (
	// classic/OAuth/app tokens: prefix_ + 36+ alphanumeric chars
	githubPrefixedTokenRe = regexp.MustCompile(`^(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}$`)

	// fine-grained PATs: github_pat_ + 22 chars + "_" + 59 chars (roughly)
	githubFineGrainedTokenRe = regexp.MustCompile(`^github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59}$`)

	// legacy classic tokens: bare 40-char hex string
	githubLegacyTokenRe = regexp.MustCompile(`^[a-f0-9]{40}$`)

	// GitHub org/user name rules: alphanumeric + single hyphens, no leading/trailing hyphen
	githubOrgNameRe = regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$`)
)

func IsValidGithubToken(token string) bool {
	token = strings.TrimSpace(token)
	if token == "" {
		return false
	}
	return githubPrefixedTokenRe.MatchString(token) ||
		githubFineGrainedTokenRe.MatchString(token) ||
		githubLegacyTokenRe.MatchString(token)
}

func IsValidGithubOrgName(orgName string) bool {
	orgName = strings.TrimSpace(orgName)
	if orgName == "" || len(orgName) > 39 {
		return false
	}
	return githubOrgNameRe.MatchString(orgName)
}

// ========================================
// REPO ANALYSIS MODEL
// ========================================

type RepoAnalysis struct {
	ID                int       `json:"id"`
	JobApplicationID  string    `json:"job_application_id"`
	RepoURL           string    `json:"repo_url"`
	CandidateID       string    `json:"candidate_id"`
	TotalScore        float64   `json:"total_score"`
	MessageScore      float64   `json:"message_score"`
	AtomicityScore    float64   `json:"atomicity_score"`
	CadenceScore      float64   `json:"cadence_score"`
	AuthorScore       float64   `json:"author_score"`
	SemanticScore     *float64  `json:"semantic_score,omitempty"`
	Tier              string    `json:"tier"`
	CommitCount       int       `json:"commit_count"`
	AvgLinesPerCommit float64   `json:"avg_lines_per_commit"`
	Details           string    `json:"details,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

// ========================================
// INTERVIEW SESSION MODELS
// ========================================

type CreateInterviewSessionRequest struct {
	CandidateSessionID string     `json:"candidate_session_id" validate:"required"`
	ApplicationID      *string    `json:"application_id,omitempty"`
	InterviewerID      *string    `json:"interviewer_id,omitempty"`
	Position           *string    `json:"position,omitempty"`
	InterviewType      *string    `json:"interview_type,omitempty"`
	ScheduledAt        *time.Time `json:"scheduled_at,omitempty"`
	ScheduledDuration  *int       `json:"scheduled_duration,omitempty"`
}

type InterviewSession struct {
	ID                 int64      `json:"id"`
	SessionID          string     `json:"session_id"`
	CandidateID        string     `json:"candidate_id"`
	CandidateSessionID *string    `json:"candidate_session_id,omitempty"`
	ApplicationID      *string    `json:"application_id,omitempty"`
	InterviewerID      *string    `json:"interviewer_id,omitempty"`
	Position           *string    `json:"position,omitempty"`
	InterviewType      *string    `json:"interview_type,omitempty"`
	InterviewPlatform  int        `json:"interview_platform"`
	InterviewURL       *string    `json:"interview_url,omitempty"`
	ScheduledAt        *time.Time `json:"scheduled_at,omitempty"`
	StartedAt          *time.Time `json:"started_at,omitempty"`
	EndedAt            *time.Time `json:"ended_at,omitempty"`
	ScheduledDuration  *int       `json:"scheduled_duration,omitempty"`
	Status             string     `json:"status"`
	Metadata           *string    `json:"metadata,omitempty"`
	Notes              *string    `json:"notes,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type InterviewSessionDetail struct {
	InterviewSession
	CandidateEmail   string        `json:"candidate_email,omitempty"`
	CandidateName    string        `json:"candidate_name,omitempty"`
	InterviewerEmail string        `json:"interviewer_email,omitempty"`
	InterviewerName  string        `json:"interviewer_name,omitempty"`
	AlertSummary     *AlertSummary `json:"alert_summary,omitempty"`
	RecentProcesses  []ProcessLog  `json:"recent_processes,omitempty"`
}

// ========================================
// AUDIT LOG MODELS
// ========================================

type AuditLog struct {
	ID          int64     `json:"id"`
	CandidateID *string   `json:"candidate_id,omitempty"`
	Action      string    `json:"action"`
	EntityType  string    `json:"entity_type,omitempty"`
	EntityID    *string   `json:"entity_id,omitempty"`
	Description string    `json:"description,omitempty"`
	Metadata    string    `json:"metadata,omitempty"`
	IPAddress   string    `json:"ip_address,omitempty"`
	UserAgent   string    `json:"user_agent,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// ========================================
// DASHBOARD MODELS
// ========================================

type DashboardSummary struct {
	ActiveInterviews int     `json:"active_interviews"`
	TotalCandidates  int     `json:"total_candidates"`
	HighRiskSessions int     `json:"high_risk_sessions"`
	TotalAlerts      int     `json:"total_alerts"`
	AverageRiskScore float64 `json:"average_risk_score"`
}

type HiringPositionStats struct {
	PositionID           string  `json:"position_id"`
	PositionTitle        string  `json:"position_title"`
	TotalCandidates      int     `json:"total_candidates"`
	ActiveCandidates     int     `json:"active_candidates"`
	CompletedInterviews  int     `json:"completed_interviews"`
	QualifiedCandidates  int     `json:"qualified_candidates"`
	PendingCandidates    int     `json:"pending_candidates"`
	AverageQualifiedRate float64 `json:"average_qualified_rate"`
}

type HiringDashboardSummary struct {
	TotalPositions      int                   `json:"total_positions"`
	ActivePositions     int                   `json:"active_positions"`
	TotalCandidates     int                   `json:"total_candidates"`
	ActiveCandidates    int                   `json:"active_candidates"`
	CompletedInterviews int                   `json:"completed_interviews"`
	QualifiedCandidates int                   `json:"qualified_candidates"`
	PositionStats       []HiringPositionStats `json:"position_stats,omitempty"`
}

// ========================================
// CODE JUDGE MODELS
// ========================================

type JudgeSubmission struct {
	ID        string    `json:"id"`
	Language  string    `json:"language"`
	Code      string    `json:"code"`
	Stdout    string    `json:"stdout"`
	Stderr    string    `json:"stderr"`
	ExitCode  int       `json:"exit_code"`
	TimeMs    int64     `json:"time_ms"`
	MemoryKb  int64     `json:"memory_kb"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateJudgeSubmissionRequest struct {
	Language string `json:"language" validate:"required"`
	Code     string `json:"code" validate:"required"`
}

// ========================================
// EMAIL MODELS
// ========================================

type EmailConfig struct {
	ID                 int       `json:"id"`
	AwsRegion          string    `json:"aws_region"`
	AwsAccessKeyID     string    `json:"aws_access_key_id"`
	AwsSecretAccessKey string    `json:"-"`
	SesFromEmail       string    `json:"ses_from_email"`
	SesLoginURL        string    `json:"ses_login_url"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type EmailJob struct {
	ID                int64      `json:"id"`
	ToEmail           string     `json:"to_email"`
	ToName            *string    `json:"to_name,omitempty"`
	FromEmail         string     `json:"from_email"`
	ReplyTo           *string    `json:"reply_to,omitempty"`
	Subject           string     `json:"subject"`
	BodyHTML          string     `json:"body_html"`
	BodyText          *string    `json:"body_text,omitempty"`
	Template          *string    `json:"template,omitempty"`
	TemplateData      *string    `json:"template_data,omitempty"`
	EntityType        *string    `json:"entity_type,omitempty"`
	EntityID          *string    `json:"entity_id,omitempty"`
	TriggeredBy       *string    `json:"triggered_by,omitempty"`
	Status            string     `json:"status"`
	Priority          int        `json:"priority"`
	Attempts          int        `json:"attempts"`
	MaxAttempts       int        `json:"max_attempts"`
	ScheduledAt       time.Time  `json:"scheduled_at"`
	SentAt            *time.Time `json:"sent_at,omitempty"`
	FailedAt          *time.Time `json:"failed_at,omitempty"`
	Error             *string    `json:"error,omitempty"`
	ProviderMessageID *string    `json:"provider_message_id,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type EmailLog struct {
	ID                int64     `json:"id"`
	JobID             *int64    `json:"job_id,omitempty"`
	ToEmail           string    `json:"to_email"`
	FromEmail         string    `json:"from_email"`
	Subject           string    `json:"subject"`
	BodyHTML          string    `json:"body_html"`
	Status            string    `json:"status"`
	ProviderMessageID *string   `json:"provider_message_id,omitempty"`
	Error             *string   `json:"error,omitempty"`
	Attempt           int       `json:"attempt"`
	SentAt            time.Time `json:"sent_at"`
}

type CreateEmailJobRequest struct {
	ToEmail      string                 `json:"to_email" validate:"required,email"`
	ToName       string                 `json:"to_name,omitempty"`
	Subject      string                 `json:"subject" validate:"required"`
	BodyHTML     string                 `json:"body_html" validate:"required"`
	BodyText     string                 `json:"body_text,omitempty"`
	Template     string                 `json:"template,omitempty"`
	TemplateData map[string]interface{} `json:"template_data,omitempty"`
	EntityType   string                 `json:"entity_type,omitempty"`
	EntityID     string                 `json:"entity_id,omitempty"`
	TriggeredBy  string                 `json:"triggered_by,omitempty"`
	Priority     int                    `json:"priority,omitempty"`
	ScheduledAt  *time.Time             `json:"scheduled_at,omitempty"`
}

// ========================================
// GOOGLE CREDENTIALS MODELS
// ========================================

type GoogleCredential struct {
	ID                  int64      `json:"id"`
	CredentialName      string     `json:"credential_name"`
	ServiceAccountEmail string     `json:"service_account_email"`
	ProjectID           string     `json:"project_id"`
	PrivateKeyID        string     `json:"private_key_id"`
	PrivateKey          string     `json:"-"`
	ClientEmail         string     `json:"client_email"`
	ClientID            string     `json:"client_id"`
	AccessToken         *string    `json:"access_token,omitempty"`
	RefreshToken        *string    `json:"refresh_token,omitempty"`
	TokenExpiry         *time.Time `json:"token_expiry,omitempty"`
	Scopes              []string   `json:"scopes"`
	CredentialsJSON     string     `json:"-"`
	CredentialType      string     `json:"credential_type"`
	IsActive            bool       `json:"is_active"`
	IsDefault           bool       `json:"is_default"`
	DelegatedAdminEmail *string    `json:"delegated_admin_email,omitempty"`
	SubjectEmail        *string    `json:"subject_email,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
	CreatedBy           *string    `json:"created_by,omitempty"`
	LastUsedAt          *time.Time `json:"last_used_at,omitempty"`
}

type ServiceAccountJSON struct {
	Type                    string `json:"type"`
	ProjectID               string `json:"project_id"`
	PrivateKeyID            string `json:"private_key_id"`
	PrivateKey              string `json:"private_key"`
	ClientEmail             string `json:"client_email"`
	ClientID                string `json:"client_id"`
	AuthURI                 string `json:"auth_uri"`
	TokenURI                string `json:"token_uri"`
	AuthProviderX509CertURL string `json:"auth_provider_x509_cert_url"`
	ClientX509CertURL       string `json:"client_x509_cert_url"`
}

type CreateGoogleCredentialRequest struct {
	CredentialName      string   `json:"credential_name" validate:"required"`
	ServiceAccountJSON  string   `json:"service_account_json" validate:"required"`
	Scopes              []string `json:"scopes" validate:"required"`
	DelegatedAdminEmail string   `json:"delegated_admin_email,omitempty"`
	SubjectEmail        string   `json:"subject_email,omitempty"`
	IsDefault           bool     `json:"is_default,omitempty"`
}

type CompleteOnboardingRequest struct {
	PhoneNumber     string   `json:"phone_number" validate:"required,min=10"`
	GithubID        string   `json:"github_id" validate:"required"`
	ResumeLink      string   `json:"resume_link" validate:"required,url"`
	Skills          []string `json:"skills" validate:"required,gt=0"`
	ExperienceYears int      `json:"experience_years" validate:"min=0,max=50"`
}

type SendCustomEmailRequest struct {
	ToEmail       string `json:"to_email" binding:"required,email"`
	CandidateName string `json:"candidate_name" binding:"required"`
	Subject       string `json:"subject" binding:"required"`
	Message       string `json:"message" binding:"required"`
}

type CandidatePushRequest struct {
	Type    string `json:"type" binding:"required"`
	Payload any    `json:"payload" binding:"required"`
}

type AdminUpdatePasswordRequest struct {
	NewPassword string `json:"new_password" binding:"required,min=8,max=72"`
}

type CreateCandidateRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	FullName string `json:"full_name"`
}

type UpdateCandidateRequest struct {
	FullName              string `json:"full_name"`
	IsActive              bool   `json:"is_active"`
	Password              string `json:"password"`
	CurrentStageQualified bool   `json:"current_stage_qualified"`
	InterviewCompleted    bool   `json:"interview_completed"`
	ResumeUrl             string `json:"resume_url"`
}

type CreateInterviewFeedbackRequest struct {
	InterviewSessionID   string `json:"interview_session_id" binding:"required"`
	TechnicalSkillsScore int    `json:"technical_skills_score" binding:"required,gte=0,lte=100"`
	CommunicationScore   int    `json:"communication_score" binding:"required,gte=0,lte=100"`
	ProblemSolvingScore  int    `json:"problem_solving_score" binding:"required,gte=0,lte=100"`
	CulturalFitScore     int    `json:"cultural_fit_score" binding:"required,gte=0,lte=100"`
	Comments             string `json:"comments" binding:"required"`
	Recommendation       string `json:"recommendation" binding:"required,oneof=hire consider reject"`
}

type InterviewFeedback struct {
	ID                   int       `json:"id" db:"id"`
	InterviewSessionID   int       `json:"interview_session_id" db:"interview_session_id"`
	InterviewerID        string    `json:"interviewer_id" db:"interviewer_id"`
	TechnicalSkillsScore int       `json:"technical_skills_score" db:"technical_skills_score"`
	CommunicationScore   int       `json:"communication_score" db:"communication_score"`
	ProblemSolvingScore  int       `json:"problem_solving_score" db:"problem_solving_score"`
	CulturalFitScore     int       `json:"cultural_fit_score" db:"cultural_fit_score"`
	OverallScore         float64   `json:"overall_score" db:"overall_score"`
	Comments             string    `json:"comments" db:"comments"`
	Recommendation       string    `json:"recommendation" db:"recommendation"`
	CreatedAt            time.Time `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time `json:"updated_at" db:"updated_at"`
}

type Feedback struct {
	ID                   int64    `json:"id"`
	InterviewerID        *string  `json:"interviewer_id"`
	TechnicalSkillsScore *int     `json:"technical_skills_score"`
	CommunicationScore   *int     `json:"communication_score"`
	ProblemSolvingScore  *int     `json:"problem_solving_score"`
	CulturalFitScore     *int     `json:"cultural_fit_score"`
	OverallScore         *float64 `json:"overall_score"`
	Comments             *string  `json:"comments"`
	Recommendation       *string  `json:"recommendation"`
	CreatedAt            string   `json:"created_at"`
}

type Session struct {
	ID                int64     `json:"id"`
	SessionID         string    `json:"session_id"`
	CandidateID       string    `json:"candidate_id"`
	ApplicationID     *string   `json:"application_id"`
	InterviewerID     *string   `json:"interviewer_id"`
	Position          string    `json:"position"`
	InterviewType     string    `json:"interview_type"`
	InterviewURL      string    `json:"interview_url"`
	ScheduledAt       time.Time `json:"scheduled_at"`
	ScheduledDuration int       `json:"scheduled_duration"`
	Status            string    `json:"status"`
	CreatedAt         time.Time `json:"created_at"`
	StartedAt         *string   `json:"started_at"`
	EndedAt           *string   `json:"ended_at"`
	Metadata          string    `json:"metadata"`
	IsUpcoming        bool      `json:"is_upcoming"`
	Feedback          *Feedback `json:"feedback"`
}

type InterviewReminder struct {
	SessionID         string
	ScheduledAt       time.Time
	InterviewURL      *string
	Position          *string
	ScheduledDuration *int
	CandidateEmail    string
	CandidateName     *string
	InterviewerName   string
}

type TwilioConfig struct {
	AccountSID   string `json:"account_sid" binding:"required"`
	APIKeySID    string `json:"api_key_sid" binding:"required"`
	APIKeySecret string `json:"api_key_secret" binding:"required"`
	TwiMLAppSID  string `json:"twiml_app_sid" binding:"required"`
	FromNumber   string `json:"from_number" binding:"required"`
}

type LiveKitConfig struct {
	ID        int       `json:"id"`
	Host      string    `json:"host"`
	APIKey    string    `json:"api_key"`
	APISecret string    `json:"api_secret"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AIProviderConfig struct {
	Provider  string    `json:"provider"`
	APIKey    string    `json:"api_key"`
	Model     string    `json:"model"`
	BaseURL   *string   `json:"base_url,omitempty"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AIScenario struct {
	ScenarioKey  string    `json:"scenario_key"`
	Name         string    `json:"name"`
	Description  *string   `json:"description,omitempty"`
	Provider     string    `json:"provider"`
	Model        *string   `json:"model,omitempty"`
	SystemPrompt string    `json:"system_prompt"`
	Temperature  float64   `json:"temperature"`
	MaxTokens    int       `json:"max_tokens"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type CandidateAccessLink struct {
	ID          string  `json:"id"`
	CandidateID *string `json:"candidate_id,omitempty"`
	Email       string  `json:"email"`
	PositionID  *string `json:"position_id,omitempty"`

	TokenHash string `json:"-"` // never serialize

	ExpiresAt  time.Time  `json:"expires_at"`
	RevokedAt  *time.Time `json:"revoked_at,omitempty"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	UseCount   int        `json:"use_count"`

	CreatedBy *string `json:"created_by,omitempty"`
	IPAddress string  `json:"ip_address,omitempty"`
	UserAgent string  `json:"user_agent,omitempty"`

	CreatedAt time.Time `json:"created_at"`
}

type CreateAccessLinkRequest struct {
	Email      string `json:"email" validate:"required,email"`
	PositionID string `json:"position_id,omitempty"`
}

type CreateAccessLinkResponse struct {
	Link          string `json:"link"`
	ExpiresInDays int    `json:"expires_in_days"`
}

// Difficulty levels selectable when generating an assignment. Kept as plain
// string constants (not a DB enum) so new levels can be added without a
// migration — validated at the request layer instead.
const (
	DifficultyIntern = "intern"
	DifficultyJunior = "junior"
	DifficultySDE1   = "sde1"
	DifficultySDE2   = "sde2"
	DifficultySDE3   = "sde3"
)

var ValidDifficulties = map[string]bool{
	DifficultyIntern: true,
	DifficultyJunior: true,
	DifficultySDE1:   true,
	DifficultySDE2:   true,
	DifficultySDE3:   true,
}

type GenerateAssignmentRequest struct {
	PositionID string `json:"position_id" binding:"required"`
	Difficulty string `json:"difficulty" binding:"required"`
	// Topic/notes: optional freeform steer for the generator, e.g.
	// "focus on REST API design" or "include a bug to find and fix".
	Notes string `json:"notes,omitempty"`
}

// GeneratedAssignment is the strict JSON shape the AI is instructed to
// return. Field names/tags matter — they're what the model is told to
// produce verbatim in the prompt.
type GeneratedAssignment struct {
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	Requirements   []string `json:"requirements"`
	StarterReadme  string   `json:"starter_readme"`
	EstimatedHours float64  `json:"estimated_hours"`
}

type Severity string

type Notification struct {
	ID         int64
	AdminID    *string
	Type       string
	Title      string
	Message    sql.NullString
	EntityType sql.NullString
	EntityID   sql.NullString
	Metadata   map[string]any
	Severity   Severity
	IsRead     bool
	ReadAt     sql.NullString
	CreatedAt  string
}

type MissingConfigItem struct {
	Key   string `json:"key"`
	Label string `json:"label"`
}
