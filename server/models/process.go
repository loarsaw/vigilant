package models

import "time"

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

type Candidate struct {
	ID                    string     `json:"id"`
	Email                 string     `json:"email"`
	PasswordHash          string     `json:"-"`
	FullName              string     `json:"full_name,omitempty"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
	ResumeUrl             string     `json:"resume_url"`
	PhoneNumber           string     `json:"phone_number"`
	Skills                string     `json:"skills"`
	IsActive              bool       `json:"is_active"`
	ExperienceYears       uint8      `json:"experience_years"`
	OnboadingComplete     bool       `json:"onboarding_complete"`
	GithubUrl             string     `json:"github_url"`
	InterviewCurrentStage string     `json:"interview_current_stage"`
	InterviewNextStage    string     `json:"interview_next_stage"`
	CurrentStageQualified bool       `json:"current_stage_qualified"`
	InterviewCompleted    bool       `json:"interview_completed"`
	LastLogin             *time.Time `json:"last_login,omitempty"`
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
	ID           int64      `json:"id"`
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

type CreateInterviewSessionRequest struct {
	CandidateSessionID string `json:"candidate_session_id" validate:"required"`
}

type InterviewSession struct {
	ID                 int64  `json:"id"`
	SessionID          string `json:"session_id"`
	CandidateID        string `json:"candidate_id"`
	CandidateSessionID string `json:"candidate_session_id"`

	InterviewerEmail  *string `json:"interviewer_email,omitempty"`
	Position          *string `json:"position,omitempty"`
	InterviewType     *string `json:"interview_type,omitempty"`
	InterviewPlatform int     `json:"interview_platform"`
	InterviewURL      *string `json:"interview_url,omitempty"`

	ScheduledAt *time.Time `json:"scheduled_at,omitempty"`
	StartedAt   *time.Time `json:"started_at,omitempty"`
	EndedAt     *time.Time `json:"ended_at,omitempty"`

	ScheduledDuration *int      `json:"scheduled_duration,omitempty"`
	Status            string    `json:"status"`
	Metadata          *string   `json:"metadata,omitempty"`
	Notes             *string   `json:"notes,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

type InterviewSessionDetail struct {
	InterviewSession
	CandidateEmail  string        `json:"candidate_email,omitempty"`
	CandidateName   string        `json:"candidate_name,omitempty"`
	AlertSummary    *AlertSummary `json:"alert_summary,omitempty"`
	RecentProcesses []ProcessLog  `json:"recent_processes,omitempty"`
}

type ProcessLog struct {
	ID                 int64     `json:"id"`
	InterviewSessionID int64     `json:"interview_session_id"`
	CandidateSessionID *int64    `json:"candidate_session_id,omitempty"`
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

type AuditLog struct {
	ID          int64     `json:"id"`
	CandidateID *string   `json:"candidate_id,omitempty"`
	Action      string    `json:"action"`
	EntityType  string    `json:"entity_type,omitempty"`
	EntityID    *int64    `json:"entity_id,omitempty"`
	Description string    `json:"description,omitempty"`
	Metadata    string    `json:"metadata,omitempty"`
	IPAddress   string    `json:"ip_address,omitempty"`
	UserAgent   string    `json:"user_agent,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type DashboardSummary struct {
	ActiveInterviews int     `json:"active_interviews"`
	TotalCandidates  int     `json:"total_candidates"`
	HighRiskSessions int     `json:"high_risk_sessions"`
	TotalAlerts      int     `json:"total_alerts"`
	AverageRiskScore float64 `json:"average_risk_score"`
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
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
	CreatedBy          string    `json:"created_by,omitempty"`
	UpdatedBy          string    `json:"updated_by,omitempty"`
	IsActive           bool      `json:"is_active"`
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
// HIRING CANDIDATES MODELS
// ========================================

type HiringCandidate struct {
	ID                    string     `json:"id"`
	Email                 string     `json:"email"`
	PasswordHash          string     `json:"-"`
	FullName              string     `json:"full_name,omitempty"`
	PositionID            string     `json:"position_id"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
	IsActive              bool       `json:"is_active"`
	ResumeUrl             string     `json:"resume_url,omitempty"`
	GithubUrl             string     `json:"github_url,omitempty"`
	Skills                string     `json:"skills,omitempty"`
	PhoneNumber           string     `json:"phone_number,omitempty"`
	ExperienceYears       uint8      `json:"experience_years"`
	OnboardingComplete    bool       `json:"onboarding_complete"`
	InterviewCurrentStage string     `json:"interview_current_stage,omitempty"`
	InterviewNextStage    string     `json:"interview_next_stage,omitempty"`
	CurrentStageQualified bool       `json:"current_stage_qualified"`
	InterviewCompleted    bool       `json:"interview_completed"`
	LastLogin             *time.Time `json:"last_login,omitempty"`
}

type CreateHiringCandidateRequest struct {
	Email           string `json:"email" validate:"required,email"`
	Password        string `json:"password" validate:"required,min=8"`
	FullName        string `json:"full_name" validate:"required"`
	PositionID      string `json:"position_id" validate:"required"`
	ResumeUrl       string `json:"resume_url,omitempty"`
	GithubUrl       string `json:"github_url,omitempty"`
	Skills          string `json:"skills,omitempty"`
	PhoneNumber     string `json:"phone_number,omitempty"`
	ExperienceYears uint8  `json:"experience_years" validate:"min=0,max=50"`
}

type UpdateHiringCandidateRequest struct {
	FullName              string `json:"full_name,omitempty"`
	ResumeUrl             string `json:"resume_url,omitempty"`
	GithubUrl             string `json:"github_url,omitempty"`
	Skills                string `json:"skills,omitempty"`
	PhoneNumber           string `json:"phone_number,omitempty"`
	ExperienceYears       uint8  `json:"experience_years,omitempty"`
	IsActive              bool   `json:"is_active,omitempty"`
	InterviewCurrentStage string `json:"interview_current_stage,omitempty"`
	InterviewNextStage    string `json:"interview_next_stage,omitempty"`
	CurrentStageQualified bool   `json:"current_stage_qualified,omitempty"`
	InterviewCompleted    bool   `json:"interview_completed,omitempty"`
}

type HiringCandidateDetail struct {
	HiringCandidate
	Position *HiringPosition `json:"position,omitempty"`
}

// ========================================
// HIRING STATISTICS MODELS
// ========================================

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

type GoogleCredential struct {
	ID             int64   `json:"id"`
	CredentialName string  `json:"credential_name"`
	OrganizationID *string `json:"organization_id,omitempty"`
	UserID         *string `json:"user_id,omitempty"`

	// Service Account Details
	ServiceAccountEmail string `json:"service_account_email"`
	ProjectID           string `json:"project_id"`
	PrivateKeyID        string `json:"private_key_id"`
	PrivateKey          string `json:"private_key"` // Store encrypted
	ClientEmail         string `json:"client_email"`
	ClientID            string `json:"client_id"`

	// OAuth Tokens
	AccessToken  *string    `json:"access_token,omitempty"`
	RefreshToken *string    `json:"refresh_token,omitempty"`
	TokenExpiry  *time.Time `json:"token_expiry,omitempty"`

	// Scopes
	Scopes []string `json:"scopes"`

	// Full JSON backup
	CredentialsJSON string `json:"credentials_json"` // JSONB as string

	// Metadata
	CredentialType string `json:"credential_type"`
	IsActive       bool   `json:"is_active"`
	IsDefault      bool   `json:"is_default"`

	// Domain delegation
	DelegatedAdminEmail *string `json:"delegated_admin_email,omitempty"`
	SubjectEmail        *string `json:"subject_email,omitempty"`

	// Audit
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
	CreatedBy  *string    `json:"created_by,omitempty"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
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

type JobApplication struct {
	ID          string    `json:"id"`
	CandidateID string    `json:"candidate_id"`
	PositionID  string    `json:"position_id"`
	Status      string    `json:"status"`
	AppliedAt   time.Time `json:"applied_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	CoverLetter string    `json:"cover_letter,omitempty"`
	Notes       string    `json:"notes,omitempty"`
}

type CreateJobApplicationRequest struct {
	CoverLetter string `json:"cover_letter,omitempty"`
}
