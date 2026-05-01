package cron

import (
	"fmt"
	"log"
	"vigilant/models"
)

func (s *Scheduler) CancelUnstartedInterviews() error {
	_, err := s.db.Exec(`
		UPDATE interview_sessions
		SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
		WHERE status = 'scheduled'
		  AND started_at IS NULL
		  AND scheduled_at < NOW() - INTERVAL '1 day'
	`)
	if err != nil {
		return fmt.Errorf("cancel interview_sessions: %w", err)
	}

	_, err = s.db.Exec(`
		UPDATE standalone_interviews
		SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
		WHERE status = 'scheduled'
		  AND scheduled_at < NOW() - INTERVAL '1 day'
	`)
	return err
}

func (s *Scheduler) ExpireCandidateSessions() error {
	_, err := s.db.Exec(`
		UPDATE candidate_sessions
		SET is_active = FALSE
		WHERE is_active = TRUE
		  AND last_activity < NOW() - INTERVAL '24 hours'
	`)
	return err
}

func (s *Scheduler) ExpireAdminSessions() error {
	_, err := s.db.Exec(`
		UPDATE admin_sessions
		SET is_active = FALSE, logged_out_at = CURRENT_TIMESTAMP
		WHERE is_active = TRUE
		  AND last_activity < NOW() - INTERVAL '12 hours'
	`)
	return err
}

func (s *Scheduler) RetryStuckEmailJobs() error {
	_, err := s.db.Exec(`
		UPDATE email_jobs
		SET status = 'pending', updated_at = CURRENT_TIMESTAMP
		WHERE status = 'processing'
		  AND updated_at < NOW() - INTERVAL '15 minutes'
		  AND attempts < max_attempts
	`)
	return err
}

func (s *Scheduler) ArchiveOldProcessLogs() error {
	_, err := s.db.Exec(`
		DELETE FROM process_logs
		WHERE logged_at < NOW() - INTERVAL '90 days'
		  AND interview_session_id IN (
			  SELECT id FROM interview_sessions
			  WHERE status IN ('completed', 'cancelled')
		  )
	`)
	return err
}

func (s *Scheduler) SendInterviewReminders() error {
	rows, err := s.db.Query(`
        SELECT
            ist.session_id,
            ist.scheduled_at,
            ist.interview_url,
            ist.position,
            ist.scheduled_duration,
            c.email,
            c.full_name,
            COALESCE(a.full_name, 'Your Interviewer') AS interviewer_name
        FROM interview_sessions ist
        JOIN candidates c ON c.id = ist.candidate_id
        LEFT JOIN administrators a ON a.id = ist.interviewer_id
        WHERE ist.status = 'scheduled'
          AND ist.started_at IS NULL
          AND ist.scheduled_at BETWEEN NOW() + INTERVAL '23 hours'
                                   AND NOW() + INTERVAL '25 hours'
          AND NOT EXISTS (
              SELECT 1 FROM interview_reminders ir
              WHERE ir.session_id = ist.session_id
                AND ir.reminder_type = '24h'
          )
    `)
	if err != nil {
		return fmt.Errorf("query interview reminders: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var r models.InterviewReminder
		if err := rows.Scan(
			&r.SessionID,
			&r.ScheduledAt,
			&r.InterviewURL,
			&r.Position,
			&r.ScheduledDuration,
			&r.CandidateEmail,
			&r.CandidateName,
			&r.InterviewerName,
		); err != nil {
			log.Printf("cron: scan reminder row: %v", err)
			continue
		}

		if err := s.enqueueReminderEmail(r); err != nil {
			log.Printf("cron: enqueue reminder for %s: %v", r.CandidateEmail, err)
		}
	}

	return rows.Err()
}
func (s *Scheduler) enqueueReminderEmail(r models.InterviewReminder) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	candidateName := "Candidate"
	if r.CandidateName != nil && *r.CandidateName != "" {
		candidateName = *r.CandidateName
	}

	position := "the upcoming role"
	if r.Position != nil && *r.Position != "" {
		position = *r.Position
	}

	interviewURL := "TBD"
	if r.InterviewURL != nil && *r.InterviewURL != "" {
		interviewURL = *r.InterviewURL
	}

	duration := 60
	if r.ScheduledDuration != nil {
		duration = *r.ScheduledDuration
	}

	subject := fmt.Sprintf("Reminder: Your interview tomorrow at %s",
		r.ScheduledAt.Format("3:04 PM"))

	bodyHTML := fmt.Sprintf(`
		<p>Hi %s,</p>
		<p>This is a friendly reminder that your interview for <strong>%s</strong> is scheduled for:</p>
		<p>
			<strong>Date:</strong> %s<br/>
			<strong>Duration:</strong> %d minutes<br/>
			<strong>Interviewer:</strong> %s
		</p>
		<p>
			<a href="%s" style="padding:10px 20px;background:#4F46E5;color:white;border-radius:6px;text-decoration:none;">
				Join Interview
			</a>
		</p>
		<p>If the button doesn't work, copy this link: %s</p>
		<p>Good luck!</p>
	`,
		candidateName,
		position,
		r.ScheduledAt.Format("Monday, January 2, 2006 at 3:04 PM UTC"),
		duration,
		r.InterviewerName,
		interviewURL,
		interviewURL,
	)

	var jobID int64
	err = tx.QueryRow(`
		INSERT INTO email_jobs (to_email, to_name, from_email, subject, body_html,
		                        entity_type, entity_id, triggered_by, status)
		SELECT $1, $2, ec.ses_from_email, $3, $4,
		       'interview_session', $5, 'cron:reminder', 'pending'
		FROM email_config ec
		LIMIT 1
		RETURNING id
	`, r.CandidateEmail, candidateName, subject, bodyHTML, r.SessionID).Scan(&jobID)
	if err != nil {
		return fmt.Errorf("insert email job: %w", err)
	}

	_, err = tx.Exec(`
		INSERT INTO interview_reminders (session_id, reminder_type, sent_to, email_job_id)
		VALUES ($1, '24h', $2, $3)
	`, r.SessionID, r.CandidateEmail, jobID)
	if err != nil {
		return fmt.Errorf("insert reminder record: %w", err)
	}

	return tx.Commit()
}
