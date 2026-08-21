package cron

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"vigilant/email"
	"vigilant/githubapi"
)

const RepoRetentionPeriod = 7 * 24 * time.Hour

func loadGithubClient(db *sql.DB, encryptionKey string) (*githubapi.Client, error) {
	key, err := email.DecodeKey(encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("decode encryption key: %w", err)
	}

	var orgName, patEncrypted string
	err = db.QueryRow(`SELECT org_name, pat_encrypted FROM github_credentials WHERE id = 1`).
		Scan(&orgName, &patEncrypted)
	if err != nil {
		return nil, fmt.Errorf("load github credentials: %w", err)
	}

	pat, err := email.Decrypt(patEncrypted, key)
	if err != nil {
		return nil, fmt.Errorf("decrypt github PAT: %w", err)
	}

	return githubapi.NewClient(pat, orgName), nil
}

func (s *Scheduler) CleanupExpiredGithubRepos() error {
	rows, err := s.db.Query(`
		SELECT id, github_repo_name
		FROM job_applications
		WHERE github_repo_name IS NOT NULL
		  AND github_repo_name != ''
		  AND github_invited_at IS NOT NULL
		  AND github_invited_at <= $1
		  AND github_repo_deleted_at IS NULL
	`, time.Now().Add(-RepoRetentionPeriod))
	if err != nil {
		return fmt.Errorf("query expired repos: %w", err)
	}

	type target struct {
		applicationID string
		repoName      string
	}
	var targets []target
	for rows.Next() {
		var t target
		if err := rows.Scan(&t.applicationID, &t.repoName); err != nil {
			log.Printf("cron: cleanup github repos: scan error: %v", err)
			continue
		}
		targets = append(targets, t)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate expired repos: %w", err)
	}

	if len(targets) == 0 {
		return nil
	}

	client, err := loadGithubClient(s.db, s.encryptionKey)
	if err != nil {
		return fmt.Errorf("build github client: %w", err)
	}

	for _, t := range targets {
		if err := client.DeleteRepo(t.repoName); err != nil {
			log.Printf("cron: cleanup github repos: failed to delete repo %q (application %s): %v",
				t.repoName, t.applicationID, err)
			continue // don't let one failure block the rest of the batch
		}

		if _, err := s.db.Exec(`
			UPDATE job_applications
			SET github_repo_deleted_at = CURRENT_TIMESTAMP
			WHERE id = $1
		`, t.applicationID); err != nil {
			log.Printf("cron: cleanup github repos: deleted repo %q but failed to mark application %s: %v",
				t.repoName, t.applicationID, err)
			continue
		}

		log.Printf("cron: cleanup github repos: deleted %q for application %s", t.repoName, t.applicationID)
	}

	return nil
}
