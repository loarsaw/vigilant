package email

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

type JobPriority int

const (
	PriorityNormal JobPriority = 0
	PriorityHigh   JobPriority = 1
)

type EmailJob struct {
	ToEmail      string
	ToName       string
	FromEmail    string
	ReplyTo      string
	Subject      string
	BodyHTML     string
	BodyText     string
	Template     string
	TemplateData map[string]any
	EntityType   string
	EntityID     string
	TriggeredBy  string
	Priority     JobPriority
}

func Enqueue(ctx context.Context, db *sql.DB, job EmailJob) (int64, error) {
	templateData, err := json.Marshal(job.TemplateData)
	if err != nil {
		return 0, fmt.Errorf("marshal template data: %w", err)
	}

	var id int64
	err = db.QueryRowContext(ctx, `
		INSERT INTO email_jobs (
			to_email, to_name, from_email, reply_to,
			subject, body_html, body_text,
			template, template_data,
			entity_type, entity_id, triggered_by,
			priority
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING id
	`,
		job.ToEmail, job.ToName, job.FromEmail, job.ReplyTo,
		job.Subject, job.BodyHTML, job.BodyText,
		job.Template, templateData,
		job.EntityType, job.EntityID, job.TriggeredBy,
		job.Priority,
	).Scan(&id)

	return id, err
}
