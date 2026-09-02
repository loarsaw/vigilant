package cron

import (
	"fmt"
	"log"
	"time"
)

func (s *Scheduler) ReconcileStaleInterviewSessions() error {
	const graceBuffer = 30 * time.Minute

	missedResult, err := s.db.Exec(`
		UPDATE interview_sessions
		SET status = 'missed', updated_at = NOW()
		WHERE status = 'scheduled'
		  AND started_at IS NULL
		  AND scheduled_at IS NOT NULL
		  AND scheduled_duration IS NOT NULL
		  AND (scheduled_at + (scheduled_duration || ' minutes')::interval) < NOW()
	`)
	if err != nil {
		return fmt.Errorf("mark missed interviews: %w", err)
	}
	if n, _ := missedResult.RowsAffected(); n > 0 {
		log.Printf("cron: marked %d interview session(s) as missed", n)
	}

	expiredResult, err := s.db.Exec(`
		UPDATE interview_sessions
		SET status = 'expired', ended_at = NOW(), updated_at = NOW()
		WHERE status IN ('scheduled', 'in_progress')
		  AND started_at IS NOT NULL
		  AND ended_at IS NULL
		  AND scheduled_at IS NOT NULL
		  AND scheduled_duration IS NOT NULL
		  AND (scheduled_at + (scheduled_duration || ' minutes')::interval + $1) < NOW()
	`, graceBuffer)
	if err != nil {
		return fmt.Errorf("mark expired interviews: %w", err)
	}
	if n, _ := expiredResult.RowsAffected(); n > 0 {
		log.Printf("cron: marked %d interview session(s) as expired (auto-closed)", n)
	}

	return nil
}
