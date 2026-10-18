package db

import (
	"database/sql"
	"fmt"
	"log"
)

func timelineMigrations() []string {
	return []string{
		`CREATE TABLE IF NOT EXISTS job_application_events (
    id BIGSERIAL PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,

    event_type VARCHAR(50) NOT NULL,
    -- 'submitted' | 'analyzed' | 'qualified' | 'assignment_emailed' |
    -- 'github_invited' | 'github_invite_failed' | 'assignment_submitted' |
    -- 'assignment_scored' | 'shortlisted' | 'status_changed' | 'repo_deleted'

    title VARCHAR(255) NOT NULL,
    description TEXT,

    from_status VARCHAR(50),
    to_status VARCHAR(50),

    actor_type VARCHAR(20) NOT NULL DEFAULT 'system',
    -- 'system' | 'admin' | 'candidate'
    actor_id UUID,
    -- administrators.id or candidates.id depending on actor_type (no FK on purpose)

    metadata JSONB,

    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
		`CREATE INDEX IF NOT EXISTS idx_job_application_events_app ON job_application_events(application_id, occurred_at)`,
		`CREATE INDEX IF NOT EXISTS idx_job_application_events_type ON job_application_events(event_type)`,

		`CREATE UNIQUE INDEX IF NOT EXISTS uq_job_application_events_once
    ON job_application_events(application_id, event_type)
    WHERE event_type IN ('submitted', 'analyzed', 'qualified', 'shortlisted',
                         'github_invited', 'assignment_emailed', 'repo_deleted')`,

		// ---------- Backfill from existing columns ----------
		// Safe to leave in; they become no-ops once rows exist. You can
		// delete them after the first production deploy if you want faster boots.

		`INSERT INTO job_application_events (application_id, event_type, title, actor_type, actor_id, metadata, occurred_at)
SELECT ja.id, 'submitted', 'Application submitted', 'candidate', ja.candidate_id,
       '{"backfilled": true}'::jsonb,
       COALESCE(ja.applied_at, ja.updated_at, CURRENT_TIMESTAMP)
FROM job_applications ja
ON CONFLICT DO NOTHING`,

		`INSERT INTO job_application_events (application_id, event_type, title, actor_type, metadata, occurred_at)
SELECT ra.job_application_id, 'analyzed', 'Profile analyzed', 'system',
       jsonb_build_object('backfilled', true, 'score', ja.overall_score, 'tier', ja.overall_tier),
       COALESCE(MIN(ra.created_at), CURRENT_TIMESTAMP)
FROM repo_analyses ra
JOIN job_applications ja ON ja.id = ra.job_application_id
WHERE ja.analyzed = TRUE
GROUP BY ra.job_application_id, ja.overall_score, ja.overall_tier
ON CONFLICT DO NOTHING`,

		`INSERT INTO job_application_events (application_id, event_type, title, actor_type, metadata, occurred_at)
SELECT ja.id, 'github_invited', 'Invited to assignment repo', 'system',
       jsonb_build_object('backfilled', true, 'repo_name', ja.github_repo_name, 'repo_url', ja.github_repo_url),
       ja.github_invited_at
FROM job_applications ja
WHERE ja.github_invited_at IS NOT NULL
  AND ja.github_invite_status IN ('invited', 'accepted')
ON CONFLICT DO NOTHING`,

		`INSERT INTO job_application_events (application_id, event_type, title, actor_type, metadata, occurred_at)
SELECT ja.id, 'assignment_emailed', 'Assignment sent to candidate', 'system',
       '{"backfilled": true}'::jsonb, ja.assignment_email_sent_at
FROM job_applications ja
WHERE ja.assignment_email_sent_at IS NOT NULL
ON CONFLICT DO NOTHING`,

		`INSERT INTO job_application_events (application_id, event_type, title, actor_type, metadata, occurred_at)
SELECT ja.id, 'shortlisted', 'Shortlisted by system', 'system',
       jsonb_build_object('backfilled', true, 'approximate_time', true,
                          'score', ja.assignment_overall_score, 'tier', ja.assignment_overall_tier),
       COALESCE(ja.assignment_last_scored_at, ja.updated_at, CURRENT_TIMESTAMP)
FROM job_applications ja
WHERE ja.is_shortlisted = TRUE
ON CONFLICT DO NOTHING`,

		`INSERT INTO job_application_events (application_id, event_type, title, actor_type, metadata, occurred_at)
SELECT ja.id, 'repo_deleted', 'Assignment repo deleted', 'system',
       '{"backfilled": true}'::jsonb, ja.github_repo_deleted_at
FROM job_applications ja
WHERE ja.github_repo_deleted_at IS NOT NULL
ON CONFLICT DO NOTHING`,

		`INSERT INTO job_application_events (application_id, event_type, title, to_status, actor_type, metadata, occurred_at)
SELECT ja.id, 'status_changed',
       CASE ja.status
            WHEN 'screening'    THEN 'Moved to screening'
            WHEN 'interviewing' THEN 'Moved to interviewing'
            WHEN 'offered'      THEN 'Offer extended'
            WHEN 'hired'        THEN 'Hired'
            WHEN 'rejected'     THEN 'Application rejected'
            WHEN 'withdrawn'    THEN 'Candidate withdrew'
            ELSE 'Status changed to ' || ja.status
       END,
       ja.status, 'admin',
       '{"backfilled": true, "approximate_time": true}'::jsonb,
       COALESCE(ja.updated_at, CURRENT_TIMESTAMP)
FROM job_applications ja
WHERE ja.status IS NOT NULL
  AND ja.status <> 'applied'
  AND NOT EXISTS (
      SELECT 1 FROM job_application_events e
      WHERE e.application_id = ja.id AND e.event_type = 'status_changed'
  )`,
	}
}

func RunTimelineMigrations(db *sql.DB) error {
	for i, m := range timelineMigrations() {
		if _, err := db.Exec(m); err != nil {
			return fmt.Errorf("timeline migration %d failed: %w", i+1, err)
		}
	}
	log.Println("✅ Timeline migrations completed")
	return nil
}
