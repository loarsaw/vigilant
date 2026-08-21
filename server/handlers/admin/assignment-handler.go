// server/admin/assignment-handler.go
package admin

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"vigilant/models"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

func (h *AdminHandlers) CreateAssignment(c *gin.Context) {
	var req models.CreateAssignmentRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"details": err.Error(),
		})
		return
	}

	adminID, _ := c.Get("admin_id")
	adminIDStr, _ := adminID.(string)

	var createdBy *string
	if adminIDStr != "" {
		createdBy = &adminIDStr
	}

	var assignment models.Assignment
	err := h.DB.QueryRow(`
		INSERT INTO assignments (
			title, description, instructions, resource_links,
			duration_minutes, passing_score, created_by, updated_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
		RETURNING id, title, description, instructions, resource_links,
			duration_minutes, passing_score, status, is_active,
			created_at, updated_at, created_by, updated_by
	`,
		req.Title,
		req.Description,
		req.Instructions,
		pq.Array(req.ResourceLinks),
		req.DurationMinutes,
		req.PassingScore,
		createdBy,
	).Scan(
		&assignment.ID, &assignment.Title, &assignment.Description,
		&assignment.Instructions, pq.Array(&assignment.ResourceLinks),
		&assignment.DurationMinutes, &assignment.PassingScore,
		&assignment.Status, &assignment.IsActive,
		&assignment.CreatedAt, &assignment.UpdatedAt,
		&assignment.CreatedBy, &assignment.UpdatedBy,
	)

	if err != nil {
		log.Printf("Error creating assignment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create assignment"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "assignment created successfully",
		"data":    assignment,
	})
}

func (h *AdminHandlers) GetAssignment(c *gin.Context) {
	assignmentID := c.Param("id")

	var assignment models.Assignment

	err := h.DB.QueryRow(`
		SELECT id, title, description, instructions, resource_links,
			duration_minutes, passing_score, status, is_active,
			created_at, updated_at, created_by, updated_by
		FROM assignments
		WHERE id = $1::uuid
	`, assignmentID).Scan(
		&assignment.ID, &assignment.Title, &assignment.Description,
		&assignment.Instructions, pq.Array(&assignment.ResourceLinks),
		&assignment.DurationMinutes, &assignment.PassingScore,
		&assignment.Status, &assignment.IsActive,
		&assignment.CreatedAt, &assignment.UpdatedAt,
		&assignment.CreatedBy, &assignment.UpdatedBy,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "assignment not found"})
		return
	}
	if err != nil {
		log.Printf("Error fetching assignment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch assignment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": assignment})
}

// ListAssignments powers the create-position dropdown (?is_active=true&limit=100)
// as well as a general admin listing view with pagination.
func (h *AdminHandlers) ListAssignments(c *gin.Context) {
	isActiveParam := c.Query("is_active")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := `
		SELECT id, title, description, instructions, resource_links,
			duration_minutes, passing_score, status, is_active,
			created_at, updated_at, created_by, updated_by
		FROM assignments
		WHERE 1=1
	`
	countQuery := `SELECT COUNT(*) FROM assignments WHERE 1=1`

	args := []interface{}{}
	argCount := 1

	if isActiveParam != "" {
		isActive, err := strconv.ParseBool(isActiveParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "is_active must be true or false"})
			return
		}
		query += " AND is_active = $" + strconv.Itoa(argCount)
		countQuery += " AND is_active = $" + strconv.Itoa(argCount)
		args = append(args, isActive)
		argCount++
	}

	var totalCount int
	if err := h.DB.QueryRow(countQuery, args...).Scan(&totalCount); err != nil {
		log.Printf("Error counting assignments: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count assignments"})
		return
	}

	query += " ORDER BY created_at DESC LIMIT $" + strconv.Itoa(argCount) + " OFFSET $" + strconv.Itoa(argCount+1)
	args = append(args, limit, offset)

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		log.Printf("Error querying assignments: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch assignments"})
		return
	}
	defer rows.Close()

	assignments := []models.Assignment{}
	for rows.Next() {
		var a models.Assignment
		if err := rows.Scan(
			&a.ID, &a.Title, &a.Description, &a.Instructions, pq.Array(&a.ResourceLinks),
			&a.DurationMinutes, &a.PassingScore, &a.Status, &a.IsActive,
			&a.CreatedAt, &a.UpdatedAt, &a.CreatedBy, &a.UpdatedBy,
		); err != nil {
			log.Printf("Error scanning assignment: %v", err)
			continue
		}
		assignments = append(assignments, a)
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error iterating assignments: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch assignments"})
		return
	}

	totalPages := (totalCount + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"assignments": assignments,
		"pagination": gin.H{
			"current_page": page,
			"per_page":     limit,
			"total_count":  totalCount,
			"total_pages":  totalPages,
			"has_next":     page < totalPages,
			"has_prev":     page > 1,
		},
	})
}

func (h *AdminHandlers) UpdateAssignment(c *gin.Context) {
	assignmentID := c.Param("id")

	var req models.UpdateAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"details": err.Error(),
		})
		return
	}

	// Confirm it exists first so we can return a clean 404 instead of a
	// silent no-op update.
	var exists bool
	if err := h.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM assignments WHERE id = $1::uuid)`, assignmentID).Scan(&exists); err != nil {
		log.Printf("Error checking assignment existence: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update assignment"})
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "assignment not found"})
		return
	}

	adminID, _ := c.Get("admin_id")
	adminIDStr, _ := adminID.(string)
	var updatedBy *string
	if adminIDStr != "" {
		updatedBy = &adminIDStr
	}

	// Build the SET clause dynamically so omitted fields are left untouched.
	setClauses := []string{}
	args := []interface{}{}
	argCount := 1

	addClause := func(column string, value interface{}) {
		setClauses = append(setClauses, column+" = $"+strconv.Itoa(argCount))
		args = append(args, value)
		argCount++
	}

	if req.Title != "" {
		addClause("title", req.Title)
	}
	if req.Description != "" {
		addClause("description", req.Description)
	}
	if req.Instructions != "" {
		addClause("instructions", req.Instructions)
	}
	if req.ResourceLinks != nil {
		addClause("resource_links", pq.Array(req.ResourceLinks))
	}
	if req.DurationMinutes != nil {
		addClause("duration_minutes", req.DurationMinutes)
	}
	if req.PassingScore != nil {
		addClause("passing_score", req.PassingScore)
	}
	if req.Status != "" {
		addClause("status", req.Status)
	}
	// IsActive is a plain bool, so `omitempty` can't distinguish "false" from
	// "not provided" — same caveat as UpdateHiringPositionRequest.IsActive.
	// If you need explicit deactivation, switch this to *bool.

	if len(setClauses) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields to update"})
		return
	}

	addClause("updated_by", updatedBy)
	setClauses[len(setClauses)-1] = "updated_by = $" + strconv.Itoa(argCount-1)

	query := "UPDATE assignments SET " + joinClauses(setClauses) + ", updated_at = CURRENT_TIMESTAMP WHERE id = $" + strconv.Itoa(argCount) + "::uuid RETURNING id, title, description, instructions, resource_links, duration_minutes, passing_score, status, is_active, created_at, updated_at, created_by, updated_by"
	args = append(args, assignmentID)

	var assignment models.Assignment
	err := h.DB.QueryRow(query, args...).Scan(
		&assignment.ID, &assignment.Title, &assignment.Description,
		&assignment.Instructions, pq.Array(&assignment.ResourceLinks),
		&assignment.DurationMinutes, &assignment.PassingScore,
		&assignment.Status, &assignment.IsActive,
		&assignment.CreatedAt, &assignment.UpdatedAt,
		&assignment.CreatedBy, &assignment.UpdatedBy,
	)

	if err != nil {
		log.Printf("Error updating assignment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update assignment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "assignment updated successfully",
		"data":    assignment,
	})
}

// DeleteAssignment soft-deletes (deactivates) rather than hard-deleting, since
// hiring_positions.assignment_id and assignment_submissions.assignment_id
// reference this row — hard delete would need ON DELETE RESTRICT to block it
// anyway if submissions exist.
func (h *AdminHandlers) DeleteAssignment(c *gin.Context) {
	assignmentID := c.Param("id")

	res, err := h.DB.Exec(`
		UPDATE assignments
		SET is_active = FALSE, status = 'archived', updated_at = CURRENT_TIMESTAMP
		WHERE id = $1::uuid
	`, assignmentID)

	if err != nil {
		log.Printf("Error deactivating assignment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete assignment"})
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "assignment not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "assignment deactivated successfully"})
}

// ---------- Assignment Submissions ----------

// assignment-handler.go, replacing/extending its existing doc comment:

// CreateAssignmentSubmission is candidate-facing: submit or resubmit work for
// the assignment attached to the position they applied to.
// NOTE: this is a SEPARATE path from the automated GitHub flow
// (analyzer.ScoreAssignmentRepos) — that one clones the candidate's invited
// GitHub repo directly and scores it on a daily cron; it never touches this
// table. This endpoint exists for candidates submitting via text/file
// links instead of (or in addition to) pushing to GitHub, and for admins
// who want to manually review/score outside the automated pipeline via
// ReviewAssignmentSubmission. Neither path sets is_shortlisted from here —
// only analyzer.scoreOneAssignmentRepo does that. If you want a manual
// review here to also affect is_shortlisted, that wiring doesn't exist yet.
// CreateAssignmentSubmission lets a candidate submit (or resubmit) work
// against the assignment attached to the position they applied to.
// Route: POST /applications/:id/submissions
// CreateAssignmentSubmission is candidate-facing: submit or resubmit work for
// the assignment attached to the position they applied to.
// func (h *AdminHandlers) CreateAssignmentSubmission(c *gin.Context) {
// 	var req models.CreateAssignmentSubmissionRequest

// 	if err := c.ShouldBindJSON(&req); err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{
// 			"error":   "validation failed",
// 			"details": err.Error(),
// 		})
// 		return
// 	}

// 	// Verify the application actually has this assignment attached via its
// 	// position, so candidates can't submit against an arbitrary assignment_id.
// 	var attachedAssignmentID sql.NullString
// 	err := h.DB.QueryRow(`
// 		SELECT p.assignment_id
// 		FROM job_applications ja
// 		JOIN hiring_positions p ON ja.position_id = p.id
// 		WHERE ja.id = $1::uuid
// 	`, req.JobApplicationID).Scan(&attachedAssignmentID)

// 	if err == sql.ErrNoRows {
// 		c.JSON(http.StatusNotFound, gin.H{"error": "job application not found"})
// 		return
// 	}
// 	if err != nil {
// 		log.Printf("Error verifying application/assignment link: %v", err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create submission"})
// 		return
// 	}
// 	if !attachedAssignmentID.Valid || attachedAssignmentID.String != req.AssignmentID {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "this assignment is not attached to the given application"})
// 		return
// 	}

// 	// Determine next attempt number for this application+assignment pair.
// 	var nextAttempt int
// 	err = h.DB.QueryRow(`
// 		SELECT COALESCE(MAX(attempt_number), 0) + 1
// 		FROM assignment_submissions
// 		WHERE job_application_id = $1::uuid AND assignment_id = $2::uuid
// 	`, req.JobApplicationID, req.AssignmentID).Scan(&nextAttempt)

// 	if err != nil {
// 		log.Printf("Error computing attempt number: %v", err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create submission"})
// 		return
// 	}

// 	var submission models.AssignmentSubmission
// 	err = h.DB.QueryRow(`
// 		INSERT INTO assignment_submissions (
// 			job_application_id, assignment_id, attempt_number,
// 			submission_text, submission_files, submission_links, status
// 		) VALUES ($1, $2, $3, $4, $5, $6, 'submitted')
// 		RETURNING id, job_application_id, assignment_id, attempt_number,
// 			submission_text, submission_files, submission_links, status,
// 			score, feedback, submitted_at, reviewed_at, reviewed_by,
// 			created_at, updated_at
// 	`,
// 		req.JobApplicationID,
// 		req.AssignmentID,
// 		nextAttempt,
// 		req.SubmissionText,
// 		pq.Array(req.SubmissionFiles),
// 		pq.Array(req.SubmissionLinks),
// 	).Scan(
// 		&submission.ID, &submission.JobApplicationID, &submission.AssignmentID,
// 		&submission.AttemptNumber, &submission.SubmissionText,
// 		pq.Array(&submission.SubmissionFiles), pq.Array(&submission.SubmissionLinks),
// 		&submission.Status, &submission.Score, &submission.Feedback,
// 		&submission.SubmittedAt, &submission.ReviewedAt, &submission.ReviewedBy,
// 		&submission.CreatedAt, &submission.UpdatedAt,
// 	)

// 	if err != nil {
// 		log.Printf("Error creating assignment submission: %v", err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create submission"})
// 		return
// 	}

// 	c.JSON(http.StatusCreated, gin.H{
// 		"message": "submission received successfully",
// 		"data":    submission,
// 	})
// }

// ListSubmissionsForApplication is admin-facing: view every attempt for a
// given application (across all its attempts on the attached assignment).
func (h *AdminHandlers) ListSubmissionsForApplication(c *gin.Context) {
	applicationID := c.Param("id")

	rows, err := h.DB.Query(`
		SELECT id, job_application_id, assignment_id, attempt_number,
			submission_text, submission_files, submission_links, status,
			score, feedback, submitted_at, reviewed_at, reviewed_by,
			created_at, updated_at
		FROM assignment_submissions
		WHERE job_application_id = $1::uuid
		ORDER BY attempt_number DESC
	`, applicationID)

	if err != nil {
		log.Printf("Error querying submissions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch submissions"})
		return
	}
	defer rows.Close()

	submissions := []models.AssignmentSubmission{}
	for rows.Next() {
		var s models.AssignmentSubmission
		if err := rows.Scan(
			&s.ID, &s.JobApplicationID, &s.AssignmentID, &s.AttemptNumber,
			&s.SubmissionText, pq.Array(&s.SubmissionFiles), pq.Array(&s.SubmissionLinks),
			&s.Status, &s.Score, &s.Feedback, &s.SubmittedAt, &s.ReviewedAt, &s.ReviewedBy,
			&s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			log.Printf("Error scanning submission: %v", err)
			continue
		}
		submissions = append(submissions, s)
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error iterating submissions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch submissions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"application_id": applicationID,
		"submissions":    submissions,
	})
}

// ReviewAssignmentSubmission is admin-facing: grade/review a specific submission.
func (h *AdminHandlers) ReviewAssignmentSubmission(c *gin.Context) {
	submissionID := c.Param("id")

	var req models.ReviewAssignmentSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"details": err.Error(),
		})
		return
	}

	adminID, _ := c.Get("admin_id")
	adminIDStr, _ := adminID.(string)
	var reviewedBy *string
	if adminIDStr != "" {
		reviewedBy = &adminIDStr
	}

	var submission models.AssignmentSubmission
	err := h.DB.QueryRow(`
		UPDATE assignment_submissions
		SET status = $1, score = $2, feedback = $3,
			reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $4,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $5::uuid
		RETURNING id, job_application_id, assignment_id, attempt_number,
			submission_text, submission_files, submission_links, status,
			score, feedback, submitted_at, reviewed_at, reviewed_by,
			created_at, updated_at
	`, req.Status, req.Score, req.Feedback, reviewedBy, submissionID).Scan(
		&submission.ID, &submission.JobApplicationID, &submission.AssignmentID,
		&submission.AttemptNumber, &submission.SubmissionText,
		pq.Array(&submission.SubmissionFiles), pq.Array(&submission.SubmissionLinks),
		&submission.Status, &submission.Score, &submission.Feedback,
		&submission.SubmittedAt, &submission.ReviewedAt, &submission.ReviewedBy,
		&submission.CreatedAt, &submission.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "submission not found"})
		return
	}
	if err != nil {
		log.Printf("Error reviewing submission: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to review submission"})
		return
	}

	// Audit log the review action, same pattern as UpdateJobApplicationStatus.
	metadataBytes, merr := json.Marshal(map[string]interface{}{
		"admin_id":   adminIDStr,
		"submission": submission.ID,
		"new_status": req.Status,
		"score":      req.Score,
	})
	if merr != nil {
		metadataBytes = []byte(`{}`)
	}

	_, auditErr := h.DB.Exec(`
		INSERT INTO audit_log (
			candidate_id, action, entity_type, entity_id, description,
			metadata, ip_address, user_agent, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
	`,
		nil,
		"review_assignment_submission",
		"assignment_submission",
		submission.ID,
		"Admin reviewed assignment submission with status '"+req.Status+"'",
		metadataBytes,
		c.ClientIP(),
		c.Request.UserAgent(),
	)
	if auditErr != nil {
		log.Printf("Warning: Failed to create audit log: %v", auditErr)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "submission reviewed successfully",
		"data":    submission,
	})
}

// joinClauses is a tiny helper since strings.Join on a []string of SQL
// fragments is used in a couple of places above.
func joinClauses(clauses []string) string {
	out := ""
	for i, cl := range clauses {
		if i > 0 {
			out += ", "
		}
		out += cl
	}
	return out
}
