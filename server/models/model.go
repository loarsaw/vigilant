package models

import (
	"database/sql"
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
	PasswordHash       string     `json:"-"`
	FullName           string     `json:"full_name,omitempty"`
	ResumeUrl          string     `json:"resume_url,omitempty"`
	GithubUrl          string     `json:"github_url,omitempty"`
	Skills             string     `json:"skills,omitempty"`
	PhoneNumber        string     `json:"phone_number,omitempty"`
	ExperienceYears    uint8      `json:"experience_years"`
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
	Status             string    `json:"status"`
	IsActive           bool      `json:"is_active"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
	CreatedBy          *string   `json:"created_by,omitempty"`
	UpdatedBy          *string   `json:"updated_by,omitempty"`
}

type CreateHiringPositionRequest struct {
	PositionTitle      string `json:"position_title" validate:"required"`
	Department         string `json:"department" validate:"required"`
	Location           string `json:"location" validate:"required"`
	EmploymentType     string `json:"employment_type" validate:"required"`
	ExperienceRequired string `json:"experience_required" validate:"required"`
	SalaryRangeMin     *int   `json:"salary_range_min,omitempty"`
	SalaryRangeMax     *int   `json:"salary_range_max,omitempty"`
	SalaryRangeText    string `json:"salary_range_text,omitempty"`
	NumberOfOpenings   int    `json:"number_of_openings" validate:"required,min=1"`
	JobDescription     string `json:"job_description" validate:"required"`
	Requirements       string `json:"requirements" validate:"required"`
}

type UpdateHiringPositionRequest struct {
	PositionTitle      string `json:"position_title,omitempty"`
	Department         string `json:"department,omitempty"`
	Location           string `json:"location,omitempty"`
	EmploymentType     string `json:"employment_type,omitempty"`
	ExperienceRequired string `json:"experience_required,omitempty"`
	SalaryRangeMin     *int   `json:"salary_range_min,omitempty"`
	SalaryRangeMax     *int   `json:"salary_range_max,omitempty"`
	SalaryRangeText    string `json:"salary_range_text,omitempty"`
	NumberOfOpenings   int    `json:"number_of_openings,omitempty"`
	JobDescription     string `json:"job_description,omitempty"`
	Requirements       string `json:"requirements,omitempty"`
	Status             string `json:"status,omitempty"`
	IsActive           bool   `json:"is_active,omitempty"`
}

// ========================================
// JOB APPLICATIONS MODELS
// ========================================

type JobApplication struct {
	ID          string    `json:"id"`
	CandidateID string    `json:"candidate_id"`
	PositionID  string    `json:"position_id"`
	Status      string    `json:"status"`
	CoverLetter string    `json:"cover_letter,omitempty"`
	Notes       string    `json:"notes,omitempty"`
	AppliedAt   time.Time `json:"applied_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateJobApplicationRequest struct {
	PositionID  string `json:"position_id" validate:"required"`
	CoverLetter string `json:"cover_letter,omitempty"`
}

type UpdateJobApplicationRequest struct {
	Status      string `json:"status,omitempty"`
	Notes       string `json:"notes,omitempty"`
	CoverLetter string `json:"cover_letter,omitempty"`
}

type JobApplicationDetail struct {
	JobApplication
	Candidate *Candidate      `json:"candidate,omitempty"`
	Position  *HiringPosition `json:"position,omitempty"`
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
