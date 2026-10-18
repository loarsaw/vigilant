package timeline

// server/timeline/timeline.go

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"time"
)

// Event types stored in job_application_events.
const (
	EventSubmitted           = "submitted"
	EventAnalyzed            = "analyzed"
	EventQualified           = "qualified"
	EventAssignmentEmailed   = "assignment_emailed"
	EventGithubInvited       = "github_invited"
	EventGithubInviteFailed  = "github_invite_failed"
	EventAssignmentSubmitted = "assignment_submitted"
	EventAssignmentScored    = "assignment_scored"
	EventShortlisted         = "shortlisted"
	EventStatusChanged       = "status_changed"
	EventRepoDeleted         = "repo_deleted"
)

// Actor types.
const (
	ActorSystem    = "system"
	ActorAdmin     = "admin"
	ActorCandidate = "candidate"
)

// Execer is satisfied by both *sql.DB and *sql.Tx, so events can be written
// inside the same transaction as the change they describe.
type Execer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

type Event struct {
	ApplicationID string
	Type          string
	Title         string // optional; a default is derived from Type/ToStatus
	Description   string
	FromStatus    string
	ToStatus      string
	ActorType     string // defaults to ActorSystem
	ActorID       string
	Metadata      map[string]any
	OccurredAt    time.Time // defaults to now
}

// Record inserts an event. One-off event types (see the partial unique
// index in migration 41) are silently ignored if they already exist, so
// callers never need to check first.
func Record(ctx context.Context, ex Execer, e Event) error {
	if e.ApplicationID == "" || e.Type == "" {
		return errors.New("timeline: application id and type are required")
	}
	if e.Title == "" {
		e.Title = DefaultTitle(e.Type, e.ToStatus)
	}
	if e.ActorType == "" {
		e.ActorType = ActorSystem
	}
	if e.OccurredAt.IsZero() {
		e.OccurredAt = time.Now().UTC()
	}

	var meta any
	if len(e.Metadata) > 0 {
		b, err := json.Marshal(e.Metadata)
		if err != nil {
			return err
		}
		meta = string(b) // string, not []byte: lib/pq would send []byte as bytea
	}

	_, err := ex.ExecContext(ctx, `
		INSERT INTO job_application_events
			(application_id, event_type, title, description, from_status, to_status,
			 actor_type, actor_id, metadata, occurred_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
		ON CONFLICT DO NOTHING`,
		e.ApplicationID, e.Type, e.Title, nullIfEmpty(e.Description),
		nullIfEmpty(e.FromStatus), nullIfEmpty(e.ToStatus),
		e.ActorType, nullIfEmpty(e.ActorID), meta, e.OccurredAt,
	)
	return err
}

// RecordOrLog is for places where a timeline failure must never break the
// real action (crons, analyzer, background jobs).
func RecordOrLog(ctx context.Context, ex Execer, e Event) {
	if err := Record(ctx, ex, e); err != nil {
		log.Printf("timeline: failed to record %s for application %s: %v", e.Type, e.ApplicationID, err)
	}
}

func StatusTitle(to string) string {
	switch to {
	case "applied":
		return "Moved back to applied"
	case "screening":
		return "Moved to screening"
	case "interviewing":
		return "Moved to interviewing"
	case "offered":
		return "Offer extended"
	case "hired":
		return "Hired"
	case "rejected":
		return "Application rejected"
	case "withdrawn":
		return "Candidate withdrew"
	default:
		return "Status changed to " + to
	}
}

func DefaultTitle(eventType, toStatus string) string {
	switch eventType {
	case EventSubmitted:
		return "Application submitted"
	case EventAnalyzed:
		return "Profile analyzed"
	case EventQualified:
		return "Marked qualified by system"
	case EventAssignmentEmailed:
		return "Assignment sent to candidate"
	case EventGithubInvited:
		return "Invited to assignment repo"
	case EventGithubInviteFailed:
		return "GitHub invite failed"
	case EventAssignmentSubmitted:
		return "Assignment submitted"
	case EventAssignmentScored:
		return "Assignment scored"
	case EventShortlisted:
		return "Shortlisted by system"
	case EventStatusChanged:
		return StatusTitle(toStatus)
	case EventRepoDeleted:
		return "Assignment repo deleted"
	default:
		return eventType
	}
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
