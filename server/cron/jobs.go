package cron

import "fmt"

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
