// models/retention.go
package models

import "time"

type DataRetentionPolicy struct {
	ID                      int        `json:"id"`
	EntityType              string     `json:"entity_type"`
	RetentionDays           int        `json:"retention_days"`
	ReferenceColumn         string     `json:"reference_column"`
	DeleteOrphanedCandidate bool       `json:"delete_orphaned_candidate"`
	IsActive                bool       `json:"is_active"`
	LastRunAt               *time.Time `json:"last_run_at,omitempty"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at"`
}

type DataRetentionRun struct {
	ID                   int64      `json:"id"`
	EntityType           string     `json:"entity_type"`
	RunStartedAt         time.Time  `json:"run_started_at"`
	RunCompletedAt       *time.Time `json:"run_completed_at,omitempty"`
	ApplicationsDeleted  int        `json:"applications_deleted"`
	CandidatesDeleted    int        `json:"candidates_deleted"`
	ReposDeleted         int        `json:"repos_deleted"`
	RepoDeletionFailures int        `json:"repo_deletion_failures"`
	Status               string     `json:"status"`
	Error                string     `json:"error,omitempty"`
}
