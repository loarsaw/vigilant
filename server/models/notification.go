// server/models/notification.go
package models

import "database/sql"

// ========================================
// NOTIFICATION MODELS
// ========================================

type Severity string

const (
	SeverityInfo     Severity = "info"
	SeveritySuccess  Severity = "success"
	SeverityWarning  Severity = "warning"
	SeverityCritical Severity = "critical"
)

const (
	TypeCandidateShortlisted       = "candidate_shortlisted"
	TypeCandidateQualified         = "candidate_qualified"
	TypeGithubInviteFailed         = "github_invite_failed"
	TypeAssignmentGenerationFailed = "assignment_generation_failed"
	TypeAIReviewFailed             = "ai_review_failed"
	TypeEmailJobFailed             = "email_job_failed"
	TypeInterviewScheduled         = "interview_scheduled"
	TypeStaleAssignment            = "stale_assignment"
	TypeSuspiciousActivity         = "suspicious_activity"
	TypeNewApplication             = "new_application"
)

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

type NotificationResponse struct {
	ID         int64   `json:"id"`
	Type       string  `json:"type"`
	Title      string  `json:"title"`
	Message    string  `json:"message,omitempty"`
	EntityType string  `json:"entity_type,omitempty"`
	EntityID   string  `json:"entity_id,omitempty"`
	Severity   string  `json:"severity"`
	IsRead     bool    `json:"is_read"`
	ReadAt     *string `json:"read_at,omitempty"`
	CreatedAt  string  `json:"created_at"`
}

type MissingConfigItem struct {
	Key   string `json:"key"`
	Label string `json:"label"`
}
