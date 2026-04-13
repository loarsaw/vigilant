package email

import (
	"context"
	"database/sql"
	"log"
	"time"
)

type Worker struct {
	DB            *sql.DB
	EncryptionKey string
	Interval      time.Duration
	stop          chan struct{}
}

func NewWorker(db *sql.DB, encryptionKey string, interval time.Duration) *Worker {
	return &Worker{
		DB:            db,
		EncryptionKey: encryptionKey,
		Interval:      interval,
		stop:          make(chan struct{}),
	}
}

func (w *Worker) Start(ctx context.Context) {
	log.Println("Email worker started")
	ticker := time.NewTicker(w.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			w.processBatch(ctx)
		case <-w.stop:
			log.Println("Email worker stopped")
			return
		case <-ctx.Done():
			return
		}
	}
}

func (w *Worker) Stop() {
	close(w.stop)
}

func (w *Worker) processBatch(ctx context.Context) {
	key, err := DecodeKey(w.EncryptionKey)
	if err != nil {
		log.Printf("Email worker: failed to decode encryption key: %v", err)
		return
	}

	sesCfg, err := LoadSESConfig(ctx, w.DB, key)
	if err != nil {
		log.Printf("Email worker: failed to load SES config: %v", err)
		return
	}

	mailer, err := NewMailerFromConfig(ctx, sesCfg)
	if err != nil {
		log.Printf("Email worker: failed to create mailer: %v", err)
		return
	}

	rows, err := w.DB.QueryContext(ctx, `
		UPDATE email_jobs
		SET status = 'sending', attempts = attempts + 1, updated_at = NOW()
		WHERE id IN (
			SELECT id FROM email_jobs
			WHERE status = 'pending'
			  AND scheduled_at <= NOW()
			  AND attempts < max_attempts
			ORDER BY priority DESC, scheduled_at ASC
			LIMIT 10
			FOR UPDATE SKIP LOCKED
		)
		RETURNING id, to_email, from_email, subject, body_html, body_text, attempts
	`)
	if err != nil {
		log.Printf("Email worker: failed to claim jobs: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id        int64
			toEmail   string
			fromEmail string
			subject   string
			bodyHTML  string
			bodyText  sql.NullString
			attempts  int
		)

		if err := rows.Scan(&id, &toEmail, &fromEmail, &subject, &bodyHTML, &bodyText, &attempts); err != nil {
			log.Printf("Email worker: scan error: %v", err)
			continue
		}

		w.sendJob(ctx, mailer, id, toEmail, subject, bodyHTML, bodyText.String, attempts)
	}
}

func (w *Worker) sendJob(ctx context.Context, mailer *Mailer,
	jobID int64, toEmail, subject, bodyHTML, bodyText string, attempt int) {

	body := bodyText
	if body == "" {
		body = bodyHTML
	}

	err := mailer.Send(ctx, EmailInput{
		ToEmail: toEmail,
		Subject: subject,
		Body:    body,
	})

	if err != nil {
		log.Printf("Email worker: failed job %d (attempt %d) to %s: %v", jobID, attempt, toEmail, err)

		w.DB.ExecContext(ctx, `
			UPDATE email_jobs SET
				status     = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
				failed_at  = NOW(),
				error      = $1,
				updated_at = NOW()
			WHERE id = $2
		`, err.Error(), jobID)

		w.logAttempt(ctx, jobID, toEmail, subject, bodyHTML, "", err.Error(), attempt, "failed")
		return
	}

	log.Printf("Email worker: sent job %d to %s", jobID, toEmail)

	w.DB.ExecContext(ctx, `
		UPDATE email_jobs SET
			status     = 'sent',
			sent_at    = NOW(),
			updated_at = NOW()
		WHERE id = $1
	`, jobID)

	w.logAttempt(ctx, jobID, toEmail, subject, bodyHTML, "", "", attempt, "sent")
}

func (w *Worker) logAttempt(ctx context.Context, jobID int64,
	toEmail, subject, bodyHTML, msgID, errMsg string, attempt int, status string) {

	var providerMsgID *string
	if msgID != "" {
		providerMsgID = &msgID
	}

	var errPtr *string
	if errMsg != "" {
		errPtr = &errMsg
	}

	w.DB.ExecContext(ctx, `
		INSERT INTO email_logs (
			job_id, to_email, from_email, subject, body_html,
			status, provider_message_id, error, attempt
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, jobID, toEmail, "", subject, bodyHTML,
		status, providerMsgID, errPtr, attempt)
}
