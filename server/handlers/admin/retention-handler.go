// server/handlers/admin/retention-handler.go
package admin

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"
	"vigilant/models"

	"github.com/gin-gonic/gin"
)

// GetRetentionPolicies returns every configured retention policy.
func (h *AdminHandlers) GetRetentionPolicies(c *gin.Context) {
	rows, err := h.DB.Query(`
		SELECT id, entity_type, retention_days, reference_column,
		       delete_orphaned_candidate, is_active, last_run_at,
		       created_at, updated_at
		FROM data_retention_policies
		ORDER BY entity_type
	`)
	if err != nil {
		log.Printf("Error fetching retention policies: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch retention policies"})
		return
	}
	defer rows.Close()

	policies := []models.DataRetentionPolicy{}
	for rows.Next() {
		var p models.DataRetentionPolicy
		var lastRunAt sql.NullTime

		if err := rows.Scan(
			&p.ID, &p.EntityType, &p.RetentionDays, &p.ReferenceColumn,
			&p.DeleteOrphanedCandidate, &p.IsActive, &lastRunAt,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			log.Printf("Error scanning retention policy: %v", err)
			continue
		}

		if lastRunAt.Valid {
			p.LastRunAt = &lastRunAt.Time
		}
		policies = append(policies, p)
	}

	c.JSON(http.StatusOK, gin.H{"data": policies})
}

// UpdateRetentionPolicy upserts the retention config for a given entity_type,
// e.g. PUT /admin/retention-policies/job_applications
func (h *AdminHandlers) UpdateRetentionPolicy(c *gin.Context) {
	entityType := c.Param("entity_type")

	var req struct {
		RetentionDays           int    `json:"retention_days" binding:"required,min=1"`
		ReferenceColumn         string `json:"reference_column" binding:"required"`
		DeleteOrphanedCandidate bool   `json:"delete_orphaned_candidate"`
		IsActive                bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"details": err.Error(),
		})
		return
	}

	// whitelist reference_column to prevent arbitrary column references
	// creeping in via this endpoint later (defensive, even though it's
	// not interpolated into SQL here)
	allowedColumns := map[string]bool{
		"applied_at": true, "created_at": true, "updated_at": true,
	}
	if !allowedColumns[req.ReferenceColumn] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid reference_column"})
		return
	}

	var currentPolicy models.DataRetentionPolicy
	var lastRunAt sql.NullTime
	err := h.DB.QueryRow(`
		SELECT id, entity_type, retention_days, reference_column,
		       delete_orphaned_candidate, is_active, last_run_at
		FROM data_retention_policies
		WHERE entity_type = $1
	`, entityType).Scan(
		&currentPolicy.ID, &currentPolicy.EntityType, &currentPolicy.RetentionDays,
		&currentPolicy.ReferenceColumn, &currentPolicy.DeleteOrphanedCandidate,
		&currentPolicy.IsActive, &lastRunAt,
	)

	isNew := err == sql.ErrNoRows
	if err != nil && !isNew {
		log.Printf("Error fetching retention policy: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch policy"})
		return
	}

	adminID, _ := c.Get("user_id")
	adminIDStr, _ := adminID.(string)

	var updatedAt time.Time
	err = h.DB.QueryRow(`
		INSERT INTO data_retention_policies (
			entity_type, retention_days, reference_column,
			delete_orphaned_candidate, is_active, created_by, updated_by
		) VALUES ($1, $2, $3, $4, $5, $6::uuid, $6::uuid)
		ON CONFLICT (entity_type) DO UPDATE SET
			retention_days = EXCLUDED.retention_days,
			reference_column = EXCLUDED.reference_column,
			delete_orphaned_candidate = EXCLUDED.delete_orphaned_candidate,
			is_active = EXCLUDED.is_active,
			updated_by = EXCLUDED.updated_by,
			updated_at = CURRENT_TIMESTAMP
		RETURNING updated_at
	`,
		entityType, req.RetentionDays, req.ReferenceColumn,
		req.DeleteOrphanedCandidate, req.IsActive, adminIDStr,
	).Scan(&updatedAt)

	if err != nil {
		log.Printf("Error upserting retention policy: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save retention policy"})
		return
	}

	// --- audit log ---
	adminEmail, _ := c.Get("user_email")
	adminEmailStr, _ := adminEmail.(string)
	ipAddress := c.ClientIP()
	userAgent := c.Request.UserAgent()

	action := "update_retention_policy"
	description := fmt.Sprintf(
		"Admin set retention policy for '%s' to %d days (was %d)",
		entityType, req.RetentionDays, currentPolicy.RetentionDays,
	)
	if isNew {
		action = "create_retention_policy"
		description = fmt.Sprintf(
			"Admin created retention policy for '%s': %d days",
			entityType, req.RetentionDays,
		)
	}

	metadataBytes, merr := json.Marshal(map[string]interface{}{
		"admin_email":        adminEmailStr,
		"old_retention_days": currentPolicy.RetentionDays,
		"new_retention_days": req.RetentionDays,
		"is_active":          req.IsActive,
	})
	if merr != nil {
		log.Printf("Warning: Failed to marshal audit metadata: %v", merr)
		metadataBytes = []byte(`{}`)
	}

	_, err = h.DB.Exec(`
		INSERT INTO audit_log (
			admin_id, action, entity_type, entity_id, description,
			metadata, ip_address, user_agent, created_at
		) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
	`,
		adminIDStr, action, "data_retention_policy", entityType, description,
		metadataBytes, ipAddress, userAgent,
	)
	if err != nil {
		log.Printf("Warning: Failed to create audit log: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "retention policy saved successfully",
		"data": gin.H{
			"entity_type":               entityType,
			"retention_days":            req.RetentionDays,
			"reference_column":          req.ReferenceColumn,
			"delete_orphaned_candidate": req.DeleteOrphanedCandidate,
			"is_active":                 req.IsActive,
			"updated_at":                updatedAt,
		},
	})
}

// GetRetentionRuns returns paginated cron run history.
// GET /admin/retention-policies/:entity_type/runs?limit=20&offset=0&status=failed
func (h *AdminHandlers) GetRetentionRuns(c *gin.Context) {
	entityType := c.Param("entity_type")

	limit := 20
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	offset := 0
	if o := c.Query("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	statusFilter := c.Query("status") // "", "completed", "failed", "running"

	query := `
		SELECT id, entity_type, run_started_at, run_completed_at,
		       applications_deleted, candidates_deleted, repos_deleted,
		       repo_deletion_failures, status, error
		FROM data_retention_runs
		WHERE entity_type = $1
	`
	args := []interface{}{entityType}
	argN := 2

	if statusFilter != "" {
		query += fmt.Sprintf(" AND status = $%d", argN)
		args = append(args, statusFilter)
		argN++
	}

	query += fmt.Sprintf(" ORDER BY run_started_at DESC LIMIT $%d OFFSET $%d", argN, argN+1)
	args = append(args, limit, offset)

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		log.Printf("Error fetching retention runs: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch retention runs"})
		return
	}
	defer rows.Close()

	runs := []models.DataRetentionRun{}
	for rows.Next() {
		var r models.DataRetentionRun
		var completedAt sql.NullTime
		var errMsg sql.NullString

		if err := rows.Scan(
			&r.ID, &r.EntityType, &r.RunStartedAt, &completedAt,
			&r.ApplicationsDeleted, &r.CandidatesDeleted, &r.ReposDeleted,
			&r.RepoDeletionFailures, &r.Status, &errMsg,
		); err != nil {
			log.Printf("Error scanning retention run: %v", err)
			continue
		}

		if completedAt.Valid {
			r.RunCompletedAt = &completedAt.Time
		}
		r.Error = errMsg.String
		runs = append(runs, r)
	}

	var total int
	countQuery := `SELECT COUNT(*) FROM data_retention_runs WHERE entity_type = $1`
	countArgs := []interface{}{entityType}
	if statusFilter != "" {
		countQuery += " AND status = $2"
		countArgs = append(countArgs, statusFilter)
	}
	h.DB.QueryRow(countQuery, countArgs...).Scan(&total)

	c.JSON(http.StatusOK, gin.H{
		"data": runs,
		"pagination": gin.H{
			"limit":    limit,
			"offset":   offset,
			"total":    total,
			"has_more": offset+len(runs) < total,
		},
	})
}
