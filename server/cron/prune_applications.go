// server/cron/prune_applications.go
package cron

import (
	"database/sql"
	"fmt"
	"log"

	"vigilant/audit"
	"vigilant/githubapi"
)

type retentionPolicy struct {
	RetentionDays           int
	ReferenceColumn         string
	DeleteOrphanedCandidate bool
	IsActive                bool
}

// PruneExpiredApplications deletes job_applications (and, per policy,
// their now-orphaned candidates) once they're older than the configured
// retention window. Any still-live GitHub assignment repo is deleted
// first, before the DB row is dropped — same client/credential pattern
// as CleanupExpiredGithubRepos.
func (s *Scheduler) PruneExpiredApplications() error {
	const entityType = "job_applications"

	policy, err := s.loadRetentionPolicy(entityType)
	if err != nil {
		return fmt.Errorf("load retention policy: %w", err)
	}
	if policy == nil || !policy.IsActive {
		return nil // not configured, or paused — nothing to do
	}

	// only these columns are allowed by the admin handler's whitelist,
	// so it's safe to interpolate here
	allowedColumns := map[string]bool{
		"applied_at": true, "created_at": true, "updated_at": true,
	}
	if !allowedColumns[policy.ReferenceColumn] {
		return fmt.Errorf("refusing to run: invalid reference_column %q", policy.ReferenceColumn)
	}

	runID, err := s.startRetentionRun(entityType)
	if err != nil {
		return fmt.Errorf("start retention run: %w", err)
	}

	query := fmt.Sprintf(`
		SELECT id, candidate_id, github_repo_name, github_repo_deleted_at
		FROM job_applications
		WHERE do_not_prune = FALSE
		  AND status NOT IN ('offered', 'hired')
		  AND %s < NOW() - ($1 || ' days')::interval
	`, policy.ReferenceColumn)

	rows, err := s.db.Query(query, policy.RetentionDays)
	if err != nil {
		s.failRetentionRun(runID, err)
		return fmt.Errorf("query expired applications: %w", err)
	}

	type candidateApp struct {
		appID         string
		candidateID   string
		repoName      sql.NullString
		repoDeletedAt sql.NullTime
	}
	var toProcess []candidateApp

	for rows.Next() {
		var a candidateApp
		if err := rows.Scan(&a.appID, &a.candidateID, &a.repoName, &a.repoDeletedAt); err != nil {
			log.Printf("cron: prune applications: scan error: %v", err)
			continue
		}
		toProcess = append(toProcess, a)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		s.failRetentionRun(runID, err)
		return fmt.Errorf("iterate expired applications: %w", err)
	}

	if len(toProcess) == 0 {
		s.completeRetentionRun(runID, 0, 0, 0, 0)
		return nil
	}

	// only build the github client if we actually have repos to touch
	var client *githubapi.Client
	needsClient := false
	for _, a := range toProcess {
		if a.repoName.Valid && a.repoName.String != "" && !a.repoDeletedAt.Valid {
			needsClient = true
			break
		}
	}
	if needsClient {
		client, err = loadGithubClient(s.db, s.encryptionKey)
		if err != nil {
			s.failRetentionRun(runID, err)
			return fmt.Errorf("build github client: %w", err)
		}
	}

	var appsDeleted, candsDeleted, reposDeleted, repoFailures int

	for _, a := range toProcess {
		// 1. Delete the GitHub repo first, if still live. Skip the row
		// entirely on failure so it's retried on the next run rather than
		// silently losing the repo.
		if a.repoName.Valid && a.repoName.String != "" && !a.repoDeletedAt.Valid {
			if err := client.DeleteRepo(a.repoName.String); err != nil {
				repoFailures++
				log.Printf("cron: prune applications: failed to delete repo %q (application %s): %v",
					a.repoName.String, a.appID, err)
				s.notifyRepoCleanupFailure(a.appID, a.repoName.String, "prune_delete_failed", err)
				continue
			}
			reposDeleted++
		}

		tx, err := s.db.Begin()
		if err != nil {
			log.Printf("cron: prune applications: begin tx failed for app %s: %v", a.appID, err)
			continue
		}

		// 2. Delete the application. Cascades to assignment_submissions,
		// repo_analyses, assignment_scores, job_application_repos.
		if _, err := tx.Exec(`DELETE FROM job_applications WHERE id = $1::uuid`, a.appID); err != nil {
			log.Printf("cron: prune applications: delete failed for app %s: %v", a.appID, err)
			tx.Rollback()
			continue
		}
		appsDeleted++

		audit.LogCandidateAction(tx, a.candidateID, "application_pruned", "job_applications", &a.appID, "", "system:retention_cron")

		// 3. Orphan check.
		if policy.DeleteOrphanedCandidate {
			var remaining int
			if err := tx.QueryRow(
				`SELECT COUNT(*) FROM job_applications WHERE candidate_id = $1::uuid`,
				a.candidateID,
			).Scan(&remaining); err != nil {
				log.Printf("cron: prune applications: orphan check failed for candidate %s: %v", a.candidateID, err)
			} else if remaining == 0 {
				if _, err := tx.Exec(`DELETE FROM candidates WHERE id = $1::uuid`, a.candidateID); err != nil {
					log.Printf("cron: prune applications: candidate delete failed %s: %v", a.candidateID, err)
				} else {
					candsDeleted++
					audit.LogCandidateAction(tx, a.candidateID, "candidate_pruned", "candidates", &a.candidateID, "", "system:retention_cron")

				}
			}
		}

		if err := tx.Commit(); err != nil {
			log.Printf("cron: prune applications: commit failed for app %s: %v", a.appID, err)
		}
	}

	s.completeRetentionRun(runID, appsDeleted, candsDeleted, reposDeleted, repoFailures)

	if _, err := s.db.Exec(
		`UPDATE data_retention_policies SET last_run_at = CURRENT_TIMESTAMP WHERE entity_type = $1`,
		entityType,
	); err != nil {
		log.Printf("cron: prune applications: failed to update last_run_at: %v", err)
	}

	log.Printf("cron: prune applications: done — %d apps, %d candidates, %d repos deleted (%d repo failures)",
		appsDeleted, candsDeleted, reposDeleted, repoFailures)

	return nil
}

func (s *Scheduler) loadRetentionPolicy(entityType string) (*retentionPolicy, error) {
	var p retentionPolicy
	err := s.db.QueryRow(`
		SELECT retention_days, reference_column, delete_orphaned_candidate, is_active
		FROM data_retention_policies
		WHERE entity_type = $1
	`, entityType).Scan(&p.RetentionDays, &p.ReferenceColumn, &p.DeleteOrphanedCandidate, &p.IsActive)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *Scheduler) startRetentionRun(entityType string) (int64, error) {
	var id int64
	err := s.db.QueryRow(`
		INSERT INTO data_retention_runs (entity_type, run_started_at, status)
		VALUES ($1, CURRENT_TIMESTAMP, 'running')
		RETURNING id
	`, entityType).Scan(&id)
	return id, err
}

func (s *Scheduler) completeRetentionRun(runID int64, appsDeleted, candsDeleted, reposDeleted, repoFailures int) {
	_, err := s.db.Exec(`
		UPDATE data_retention_runs
		SET run_completed_at = CURRENT_TIMESTAMP,
		    applications_deleted = $1,
		    candidates_deleted = $2,
		    repos_deleted = $3,
		    repo_deletion_failures = $4,
		    status = 'completed'
		WHERE id = $5
	`, appsDeleted, candsDeleted, reposDeleted, repoFailures, runID)
	if err != nil {
		log.Printf("cron: prune applications: failed to complete run record: %v", err)
	}
}

func (s *Scheduler) failRetentionRun(runID int64, runErr error) {
	_, err := s.db.Exec(`
		UPDATE data_retention_runs
		SET run_completed_at = CURRENT_TIMESTAMP, status = 'failed', error = $1
		WHERE id = $2
	`, runErr.Error(), runID)
	if err != nil {
		log.Printf("cron: prune applications: failed to record run failure: %v", err)
	}
}
