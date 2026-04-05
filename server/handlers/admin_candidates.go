package handlers

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"vigilant/email"
	"vigilant/models"
	"vigilant/websocket"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func (h *AdminHandlers) CreateCandidate(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=8"`
		FullName string `json:"full_name"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if len(req.Password) > 72 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password must be 72 characters or fewer"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process password"})
		return
	}

	ctx := c.Request.Context()

	var candidate models.Candidate
	err = h.DB.QueryRowContext(ctx, `
		INSERT INTO candidates (email, password_hash, full_name)
		VALUES ($1, $2, $3)
		RETURNING id, email, full_name, created_at, is_active
	`, req.Email, string(hashedPassword), req.FullName).Scan(
		&candidate.ID,
		&candidate.Email,
		&candidate.FullName,
		&candidate.CreatedAt,
		&candidate.IsActive,
	)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			c.JSON(http.StatusConflict, gin.H{"error": "email already exists"})
			return
		}
		log.Printf("Error creating candidate: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create candidate"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":         candidate.ID,
		"email":      candidate.Email,
		"full_name":  candidate.FullName,
		"created_at": candidate.CreatedAt,
		"is_active":  candidate.IsActive,
	})
}

func (h *AdminHandlers) ListCandidates(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "10")
	search := strings.TrimSpace(c.Query("search"))

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	args := []interface{}{}
	where := ""
	if search != "" {
		where = "WHERE (email ILIKE $1 OR full_name ILIKE $1)"
		args = append(args, "%"+search+"%")
	}

	var total int
	if err := h.DB.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM candidates %s", where), args...).Scan(&total); err != nil {
		log.Printf("Error counting candidates: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count candidates"})
		return
	}

	limitPlaceholder := fmt.Sprintf("$%d", len(args)+1)
	offsetPlaceholder := fmt.Sprintf("$%d", len(args)+2)
	args = append(args, limit, offset)

	rows, err := h.DB.Query(fmt.Sprintf(`
		SELECT id, email, full_name, created_at, updated_at, is_active,
		       resume_url, github_url, skills, phone_number, experience_years,
		       onboarding_complete,
		       interview_current_stage, interview_next_stage,
		       current_stage_qualified, interview_completed, last_login
		FROM candidates %s
		ORDER BY created_at DESC
		LIMIT %s OFFSET %s
	`, where, limitPlaceholder, offsetPlaceholder), args...)
	if err != nil {
		log.Printf("Error querying candidates: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve candidates"})
		return
	}
	defer rows.Close()

	type CandidateWithPresence struct {
		models.Candidate
		IsOnline bool `json:"is_online"`
	}

	candidates := []CandidateWithPresence{}
	for rows.Next() {
		var cand models.Candidate
		var interviewCurrentStage, interviewNextStage sql.NullString

		if err := rows.Scan(
			&cand.ID, &cand.Email, &cand.FullName, &cand.CreatedAt, &cand.UpdatedAt,
			&cand.IsActive,
			&cand.ResumeUrl, &cand.GithubUrl, &cand.Skills, &cand.PhoneNumber, &cand.ExperienceYears,
			&cand.OnboadingComplete,
			&interviewCurrentStage, &interviewNextStage,
			&cand.CurrentStageQualified, &cand.InterviewCompleted, &cand.LastLogin,
		); err != nil {
			log.Printf("Error scanning candidate: %v", err)
			continue
		}

		cand.InterviewCurrentStage = interviewCurrentStage.String
		cand.InterviewNextStage = interviewNextStage.String

		candidates = append(candidates, CandidateWithPresence{
			Candidate: cand,
			IsOnline:  websocket.Manager.IsActive(cand.ID),
		})
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error iterating candidates: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve candidates"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":        candidates,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": int(math.Ceil(float64(total) / float64(limit))),
	})
}

func (h *AdminHandlers) GetCandidate(c *gin.Context) {
	candidateID := c.Param("id")

	var cand models.Candidate
	var interviewCurrentStage, interviewNextStage sql.NullString

	err := h.DB.QueryRow(`
		SELECT id, email, full_name, created_at, updated_at, is_active,
		       resume_url, github_url, skills, phone_number, experience_years,
		       onboarding_complete,
		       interview_current_stage, interview_next_stage,
		       current_stage_qualified, interview_completed, last_login
		FROM candidates WHERE id = $1::uuid
	`, candidateID).Scan(
		&cand.ID, &cand.Email, &cand.FullName, &cand.CreatedAt, &cand.UpdatedAt,
		&cand.IsActive,
		&cand.ResumeUrl, &cand.GithubUrl, &cand.Skills, &cand.PhoneNumber, &cand.ExperienceYears,
		&cand.OnboadingComplete,
		&interviewCurrentStage, &interviewNextStage,
		&cand.CurrentStageQualified, &cand.InterviewCompleted, &cand.LastLogin,
	)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "candidate not found"})
		return
	}
	if err != nil {
		log.Printf("Error querying candidate: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve candidate"})
		return
	}

	cand.InterviewCurrentStage = interviewCurrentStage.String
	cand.InterviewNextStage = interviewNextStage.String

	c.JSON(http.StatusOK, gin.H{
		"candidate": cand,
		"is_online": websocket.Manager.IsActive(cand.ID),
	})
}

func (h *AdminHandlers) UpdateCandidate(c *gin.Context) {
	candidateID := c.Param("id")

	var req struct {
		FullName              *string `json:"full_name"`
		IsActive              *bool   `json:"is_active"`
		Password              *string `json:"password"`
		InterviewCurrentStage *string `json:"interview_current_stage"`
		InterviewNextStage    *string `json:"interview_next_stage"`
		CurrentStageQualified *bool   `json:"current_stage_qualified"`
		InterviewCompleted    *bool   `json:"interview_completed"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	updates := []string{}
	args := []interface{}{}
	argID := 1

	if req.FullName != nil {
		updates = append(updates, fmt.Sprintf("full_name = $%d", argID))
		args = append(args, *req.FullName)
		argID++
	}
	if req.IsActive != nil {
		updates = append(updates, fmt.Sprintf("is_active = $%d", argID))
		args = append(args, *req.IsActive)
		argID++
	}
	if req.Password != nil {
		if len(*req.Password) < 8 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 8 characters"})
			return
		}
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
			return
		}
		updates = append(updates, fmt.Sprintf("password_hash = $%d", argID))
		args = append(args, string(hashedPassword))
		argID++
	}
	if req.InterviewCurrentStage != nil {
		updates = append(updates, fmt.Sprintf("interview_current_stage = $%d", argID))
		args = append(args, *req.InterviewCurrentStage)
		argID++
	}
	if req.InterviewNextStage != nil {
		updates = append(updates, fmt.Sprintf("interview_next_stage = $%d", argID))
		args = append(args, *req.InterviewNextStage)
		argID++
	}
	if req.CurrentStageQualified != nil {
		updates = append(updates, fmt.Sprintf("current_stage_qualified = $%d", argID))
		args = append(args, *req.CurrentStageQualified)
		argID++
	}
	if req.InterviewCompleted != nil {
		updates = append(updates, fmt.Sprintf("interview_completed = $%d", argID))
		args = append(args, *req.InterviewCompleted)
		argID++
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields to update"})
		return
	}

	updates = append(updates, "updated_at = NOW()")
	args = append(args, candidateID)

	query := fmt.Sprintf("UPDATE candidates SET %s WHERE id = $%d::uuid", strings.Join(updates, ", "), argID)

	result, err := h.DB.Exec(query, args...)
	if err != nil {
		log.Printf("Error updating candidate: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update candidate"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "candidate not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated", "id": candidateID})
}

func (h *AdminHandlers) DeleteCandidate(c *gin.Context) {
	candidateID := c.Param("id")

	result, err := h.DB.Exec(`UPDATE candidates SET is_active = false, updated_at = NOW() WHERE id = $1`, candidateID)
	if err != nil {
		log.Printf("Error deleting candidate: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete candidate"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "candidate not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "deleted", "id": candidateID})
}

func (h *AdminHandlers) BulkCreateCandidates(c *gin.Context) {
	var req []struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		FullName string `json:"full_name"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if len(req) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no candidates provided"})
		return
	}

	const maxBatchSize = 500
	if len(req) > maxBatchSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("batch size exceeds maximum of %d", maxBatchSize)})
		return
	}

	type preparedCandidate struct {
		ID            string
		Email         string
		PasswordHash  string
		FullName      string
		PlainPassword string
	}

	var validationErrors []gin.H
	prepared := make([]preparedCandidate, 0, len(req))

	for i, candidate := range req {
		candidate.Email = strings.ToLower(strings.TrimSpace(candidate.Email))

		rowErrors := gin.H{}
		hasError := false

		if candidate.Email == "" {
			rowErrors["email"] = "email is required"
			hasError = true
		}
		if len(candidate.Password) < 8 {
			rowErrors["password"] = "password must be at least 8 characters"
			hasError = true
		}
		if len(candidate.Password) > 72 {
			rowErrors["password"] = "password must be 72 characters or fewer"
			hasError = true
		}

		if hasError {
			rowErrors["index"] = i
			rowErrors["email"] = candidate.Email
			validationErrors = append(validationErrors, rowErrors)
			continue
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(candidate.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("Error hashing password for %s: %v", candidate.Email, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process passwords"})
			return
		}

		prepared = append(prepared, preparedCandidate{
			ID:            uuid.New().String(),
			Email:         candidate.Email,
			PasswordHash:  string(hashedPassword),
			FullName:      candidate.FullName,
			PlainPassword: candidate.Password,
		})
	}

	if len(validationErrors) > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "validation failed for one or more candidates",
			"errors": validationErrors,
		})
		return
	}

	ctx := c.Request.Context()

	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	defer func() {
		if err := tx.Rollback(); err != nil && err != sql.ErrTxDone {
			log.Printf("Error rolling back transaction: %v", err)
		}
	}()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO candidates (id, email, password_hash, full_name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (email) DO UPDATE SET
			password_hash = EXCLUDED.password_hash,
			updated_at = NOW()
		RETURNING (xmax = 0) AS was_inserted
	`)
	if err != nil {
		log.Printf("Error preparing statement: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to prepare statement"})
		return
	}
	defer stmt.Close()

	inserted := 0
	updated := 0
	var newCandidates []preparedCandidate

	for _, candidate := range prepared {
		var wasInserted bool
		err = stmt.QueryRowContext(ctx,
			candidate.ID, candidate.Email, candidate.PasswordHash, candidate.FullName,
		).Scan(&wasInserted)

		if err != nil {
			log.Printf("Error upserting candidate %s: %v", candidate.Email, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process candidates"})
			return
		}

		if wasInserted {
			inserted++
			newCandidates = append(newCandidates, candidate)
		} else {
			updated++
		}
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit transaction"})
		return
	}

	// Send welcome emails to newly inserted candidates only — non-fatal
	emailsFailed := 0
	if len(newCandidates) > 0 {
		mailer, sesCfg, err := h.loadMailer(c)
		if err != nil {
			log.Printf("BulkCreateCandidates: email config not available, skipping emails: %v", err)
		} else {
			candidates := make([]email.CandidateEmailData, 0, len(newCandidates))
			for _, nc := range newCandidates {
				candidates = append(candidates, email.CandidateEmailData{
					FullName: nc.FullName,
					Email:    nc.Email,
					Password: nc.PlainPassword,
				})
			}

			results := mailer.SendBulk(ctx, email.BuildBulkCredentialsEmails(candidates, sesCfg.SESLoginURL))
			for _, r := range results {
				if !r.Success {
					emailsFailed++
					log.Printf("BulkCreateCandidates: failed to send email to %s: %s", r.Email, r.Error)
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "import completed",
		"inserted":      inserted,
		"updated":       updated,
		"emails_sent":   len(newCandidates) - emailsFailed,
		"emails_failed": emailsFailed,
	})
}