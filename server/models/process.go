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
	ID                    string      `json:"id"`
	Email                 string     `json:"email"`
	PasswordHash          string     `json:"-"`
	FullName              string     `json:"full_name,omitempty"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
	IsActive              bool       `json:"is_active"`
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
	CandidateID  string      `json:"candidate_id"`
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
	CandidateSessionID int64 `json:"candidate_session_id" validate:"required"`
}


type InterviewSession struct {
	ID                 int64      `json:"id"`
	SessionID          string     `json:"session_id"`          
	CandidateID        int64      `json:"candidate_id"`        
	CandidateSessionID int64      `json:"candidate_session_id"`
	Status             string     `json:"status"`              
	StartedAt          time.Time  `json:"started_at"`
	EndedAt            *time.Time `json:"ended_at,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
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
	CandidateID *string    `json:"candidate_id,omitempty"`
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