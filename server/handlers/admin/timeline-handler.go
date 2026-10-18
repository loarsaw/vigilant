// server/handlers/admin/timeline-handler.go
package admin

import (
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"time"

	"github.com/gin-gonic/gin"
)

var uuidRe = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

type TimelineEvent struct {
	ID          string          `json:"id"`
	Type        string          `json:"type"`
	Title       string          `json:"title"`
	Description *string         `json:"description"`
	FromStatus  *string         `json:"from_status"`
	ToStatus    *string         `json:"to_status"`
	ActorType   string          `json:"actor_type"`
	ActorName   *string         `json:"actor_name"`
	Metadata    json.RawMessage `json:"metadata"`
	OccurredAt  time.Time       `json:"occurred_at"`
}

const applicationTimelineQuery = `
SELECT id, event_type, title, description, from_status, to_status,
       actor_type, actor_name, metadata, occurred_at
FROM (
    SELECT
        'evt-' || e.id::text AS id,
        e.event_type, e.title, e.description, e.from_status, e.to_status, e.actor_type,
        CASE WHEN e.actor_type = 'admin'     THEN a.full_name
             WHEN e.actor_type = 'candidate' THEN c.full_name END AS actor_name,
        e.metadata, e.occurred_at
    FROM job_application_events e
    LEFT JOIN administrators a ON e.actor_type = 'admin'     AND a.id = e.actor_id
    LEFT JOIN candidates     c ON e.actor_type = 'candidate' AND c.id = e.actor_id
    WHERE e.application_id = $1

    UNION ALL

    SELECT
        'int-' || s.id || '-scheduled', 'interview_scheduled', 'Interview scheduled',
        NULL, NULL, NULL, 'admin', NULL,
        jsonb_build_object(
            'session_id', s.session_id,
            'interview_type', s.interview_type,
            'scheduled_at', s.scheduled_at,
            'duration_minutes', s.scheduled_duration,
            'interviewer', i.full_name
        ),
        s.created_at
    FROM interview_sessions s
    LEFT JOIN administrators i ON i.id = s.interviewer_id
    WHERE s.application_id = $1

    UNION ALL

    SELECT
        'int-' || s.id || '-completed', 'interview_completed', 'Interview completed',
        NULL, NULL, NULL, 'admin', i.full_name,
        jsonb_build_object(
            'session_id', s.session_id,
            'interview_type', s.interview_type,
            'started_at', s.started_at,
            'ended_at', s.ended_at,
            'avg_feedback_score', (
                SELECT ROUND(AVG(f.overall_score), 1)
                FROM interview_feedback f
                WHERE f.interview_session_id = s.id
            )
        ),
        s.ended_at
    FROM interview_sessions s
    LEFT JOIN administrators i ON i.id = s.interviewer_id
    WHERE s.application_id = $1 AND s.ended_at IS NOT NULL

    UNION ALL

    SELECT
        'int-' || s.id || '-cancelled', 'interview_cancelled',
        CASE WHEN s.status = 'no_show' THEN 'Candidate did not join interview'
             ELSE 'Interview cancelled' END,
        NULL, NULL, NULL, 'system', NULL,
        jsonb_build_object(
            'session_id', s.session_id,
            'interview_type', s.interview_type,
            'scheduled_at', s.scheduled_at
        ),
        s.updated_at
    FROM interview_sessions s
    WHERE s.application_id = $1
      AND s.ended_at IS NULL
      AND s.status IN ('cancelled', 'canceled', 'no_show')
) t
ORDER BY occurred_at ASC, id ASC`

func (h *AdminHandlers) GetApplicationTimeline(c *gin.Context) {
	appID := c.Param("id")
	if !uuidRe.MatchString(appID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid application id"})
		return
	}
	ctx := c.Request.Context()

	var exists bool
	if err := h.DB.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM job_applications WHERE id = $1)`, appID,
	).Scan(&exists); err != nil {
		log.Printf("timeline: exists check failed for %s: %v", appID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load timeline"})
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "application not found"})
		return
	}

	rows, err := h.DB.QueryContext(ctx, applicationTimelineQuery, appID)
	if err != nil {
		log.Printf("timeline: query failed for %s: %v", appID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load timeline"})
		return
	}
	defer rows.Close()

	events := make([]TimelineEvent, 0, 16)
	for rows.Next() {
		var ev TimelineEvent
		var meta []byte
		if err := rows.Scan(
			&ev.ID, &ev.Type, &ev.Title, &ev.Description, &ev.FromStatus, &ev.ToStatus,
			&ev.ActorType, &ev.ActorName, &meta, &ev.OccurredAt,
		); err != nil {
			log.Printf("timeline: scan failed for %s: %v", appID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load timeline"})
			return
		}
		if len(meta) > 0 {
			ev.Metadata = meta
		}
		events = append(events, ev)
	}
	if err := rows.Err(); err != nil {
		log.Printf("timeline: rows error for %s: %v", appID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load timeline"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"application_id": appID,
		"events":         events,
	})
}
