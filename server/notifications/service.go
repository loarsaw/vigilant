// notifications/service.go
package notifications

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

type Severity string

const (
	SeverityInfo     Severity = "info"
	SeveritySuccess  Severity = "success"
	SeverityWarning  Severity = "warning"
	SeverityCritical Severity = "critical"
)

// Event type constants — keep these in one place so hook call sites and
// any future frontend filtering stay in sync.
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
	Message    string
	EntityType string
	EntityID   string
	Metadata   map[string]any
	Severity   Severity
	IsRead     bool
	CreatedAt  string
}

type Service struct {
	db *sql.DB
	// Broadcaster pushes a live event to connected SSE clients. Wired to
	// whatever your existing admin SSE hub is (see AdminHandlers.SSEEvents).
	// Nil-safe: if not wired, notifications are still persisted, just not
	// pushed live.
	Broadcaster func(adminID *string, n Notification)
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}

type CreateInput struct {
	AdminID    *string // nil = broadcast to all admins
	Type       string
	Title      string
	Message    string
	EntityType string
	EntityID   string
	Metadata   map[string]any
	Severity   Severity
}

// Create persists a notification and pushes it live if a broadcaster is
// wired. Never returns an error to a caller that can't act on it usefully —
// callers should log and continue, never let a notification failure break
// the actual business flow (shortlisting, invites, etc.) it's reporting on.
func (s *Service) Create(ctx context.Context, in CreateInput) error {
	if in.Severity == "" {
		in.Severity = SeverityInfo
	}
	metadataJSON, err := json.Marshal(in.Metadata)
	if err != nil {
		return fmt.Errorf("marshal notification metadata: %w", err)
	}

	var id int64
	var createdAt string
	err = s.db.QueryRowContext(ctx, `
		INSERT INTO admin_notifications
			(admin_id, type, title, message, entity_type, entity_id, metadata, severity)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at
	`, in.AdminID, in.Type, in.Title, in.Message, in.EntityType, in.EntityID, metadataJSON, in.Severity,
	).Scan(&id, &createdAt)
	if err != nil {
		return fmt.Errorf("insert notification: %w", err)
	}

	if s.Broadcaster != nil {
		s.Broadcaster(in.AdminID, Notification{
			ID: id, AdminID: in.AdminID, Type: in.Type, Title: in.Title, Message: in.Message,
			EntityType: in.EntityType, EntityID: in.EntityID, Metadata: in.Metadata,
			Severity: in.Severity, CreatedAt: createdAt,
		})
	}
	return nil
}

func (s *Service) ListForAdmin(ctx context.Context, adminID string, unreadOnly bool, limit int) ([]Notification, error) {
	query := `
		SELECT id, admin_id, type, title, message, entity_type, entity_id, metadata, severity, is_read, created_at
		FROM admin_notifications
		WHERE (admin_id = $1 OR admin_id IS NULL)
	`
	args := []any{adminID}
	if unreadOnly {
		query += " AND is_read = FALSE"
	}
	query += " ORDER BY created_at DESC LIMIT $2"
	args = append(args, limit)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Notification
	for rows.Next() {
		var n Notification
		var metaBytes []byte
		var adminIDNullable sql.NullString
		if err := rows.Scan(&n.ID, &adminIDNullable, &n.Type, &n.Title, &n.Message,
			&n.EntityType, &n.EntityID, &metaBytes, &n.Severity, &n.IsRead, &n.CreatedAt); err != nil {
			return nil, err
		}
		if adminIDNullable.Valid {
			n.AdminID = &adminIDNullable.String
		}
		json.Unmarshal(metaBytes, &n.Metadata)
		out = append(out, n)
	}
	return out, rows.Err()
}

func (s *Service) MarkRead(ctx context.Context, notificationID int64) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE admin_notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = $1
	`, notificationID)
	return err
}

func (s *Service) MarkAllRead(ctx context.Context, adminID string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE admin_notifications
		SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
		WHERE (admin_id = $1 OR admin_id IS NULL) AND is_read = FALSE
	`, adminID)
	return err
}

// CreateForRole sends a notification to every active admin with the given
// role (e.g. "hr") — one row per admin, so each has independent read state.
// Unlike Create with AdminID=nil (broadcast to everyone), this targets only
// the relevant role.
func (s *Service) CreateForRole(ctx context.Context, role string, in CreateInput) error {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id FROM administrators WHERE role = $1 AND is_active = true
	`, role)
	if err != nil {
		return fmt.Errorf("failed to look up %s admins: %w", role, err)
	}
	defer rows.Close()

	var adminIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return err
		}
		adminIDs = append(adminIDs, id)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	if len(adminIDs) == 0 {
		return fmt.Errorf("no active admins found with role %q", role)
	}

	var firstErr error
	for _, id := range adminIDs {
		targeted := in
		targeted.AdminID = &id
		if err := s.Create(ctx, targeted); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}
