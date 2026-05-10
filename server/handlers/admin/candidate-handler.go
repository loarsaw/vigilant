package admin

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"
	"vigilant/email"
	"vigilant/models"
	"vigilant/websocket"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func (h *AdminHandlers) CreateCandidate(c *gin.Context) {
	var req models.CreateCandidateRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid payload. 'type' and 'payload' are required.",
			"details": err.Error(),
		})
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if len(req.Password) > 72 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password must be 72 characters or fewer"})
		return
	}

	bcryptCost := bcrypt.DefaultCost
	if parsed, err := strconv.Atoi(h.Cfg.BcryptCost); err == nil && parsed >= bcrypt.MinCost && parsed <= bcrypt.MaxCost {
		bcryptCost = parsed
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
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

	key, err := email.DecodeKey(h.Cfg.EncryptionKey)
	if err != nil {
		log.Printf("CreateCandidate: failed to decode encryption key: %v", err)
	} else {
		sesCfg, err := email.LoadSESConfig(ctx, h.DB, key)
		if err != nil {
			log.Printf("CreateCandidate: failed to load SES config: %v", err)
		} else {
			body, err := email.Render(email.TemplateCandidateCredentials, email.CandidateCredentialsData{
				CandidateName: req.FullName,
				Email:         req.Email,
				Password:      req.Password,
				LoginURL:      sesCfg.SESLoginURL,
			})
			if err != nil {
				log.Printf("CreateCandidate: failed to render email: %v", err)
			} else {
				_, err = email.Enqueue(ctx, h.DB, email.EmailJob{
					ToEmail:     req.Email,
					ToName:      req.FullName,
					FromEmail:   sesCfg.SESFromEmail,
					Subject:     "Your Vigilant Account Credentials",
					BodyHTML:    body,
					Template:    email.TemplateCandidateCredentials,
					EntityType:  "candidate",
					EntityID:    candidate.ID,
					TriggeredBy: "create_candidate",
					Priority:    email.PriorityHigh,
				})
				if err != nil {
					log.Printf("CreateCandidate: failed to enqueue email: %v", err)
				}
			}
		}
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
		       COALESCE(resume_url, '') as resume_url,
		       COALESCE(github_url, '') as github_url,
		       COALESCE(skills, '') as skills,
		       COALESCE(phone_number, '') as phone_number,
		       COALESCE(experience_years, 0) as experience_years,
		       onboarding_complete,
		       COALESCE(last_login, '1970-01-01'::timestamp) as last_login
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

		if err := rows.Scan(
			&cand.ID, &cand.Email, &cand.FullName, &cand.CreatedAt, &cand.UpdatedAt,
			&cand.IsActive,
			&cand.ResumeUrl, &cand.GithubUrl, &cand.Skills, &cand.PhoneNumber, &cand.ExperienceYears,
			&cand.OnboardingComplete,
			&cand.LastLogin,
		); err != nil {
			log.Printf("Error scanning candidate: %v", err)
			continue
		}

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

	err := h.DB.QueryRow(`
		SELECT id, email, full_name, created_at, updated_at, is_active,
		       COALESCE(resume_url, '') as resume_url,
		       COALESCE(github_url, '') as github_url,
		       COALESCE(skills, '') as skills,
		       COALESCE(phone_number, '') as phone_number,
		       COALESCE(experience_years, 0) as experience_years,
		       onboarding_complete,
		       COALESCE(last_login, '1970-01-01'::timestamp) as last_login
		FROM candidates WHERE id = $1::uuid
	`, candidateID).Scan(
		&cand.ID, &cand.Email, &cand.FullName, &cand.CreatedAt, &cand.UpdatedAt,
		&cand.IsActive,
		&cand.ResumeUrl, &cand.GithubUrl, &cand.Skills, &cand.PhoneNumber, &cand.ExperienceYears,
		&cand.OnboardingComplete,
		&cand.LastLogin,
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

	c.JSON(http.StatusOK, gin.H{
		"candidate": cand,
		"is_online": websocket.Manager.IsActive(cand.ID),
	})
}

func (h *AdminHandlers) UpdateCandidate(c *gin.Context) {
	candidateID := c.Param("id")

	var req struct {
		FullName *string `json:"full_name"`
		IsActive *bool   `json:"is_active"`
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

func (h *AdminHandlers) UpdateCandidatePassword(c *gin.Context) {
	callerRole := c.GetString("admin_role")
	if callerRole == "interviewer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	candidateID := c.Param("id")

	var req models.AdminUpdatePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.NewPassword) > 72 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password must be 72 characters or fewer"})
		return
	}

	ctx := c.Request.Context()

	var candidateEmail, fullName string
	var isActive bool
	err := h.DB.QueryRowContext(ctx, `
		SELECT email, full_name, is_active FROM candidates WHERE id = $1
	`, candidateID).Scan(&candidateEmail, &fullName, &isActive)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "candidate not found"})
		return
	}
	if err != nil {
		log.Printf("UpdateCandidatePassword: failed to fetch candidate: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch candidate"})
		return
	}
	if !isActive {
		c.JSON(http.StatusForbidden, gin.H{"error": "candidate account is deactivated"})
		return
	}

	bcryptCost := bcrypt.DefaultCost
	if parsed, err := strconv.Atoi(h.Cfg.BcryptCost); err == nil && parsed >= bcrypt.MinCost && parsed <= bcrypt.MaxCost {
		bcryptCost = parsed
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcryptCost)
	if err != nil {
		log.Printf("UpdateCandidatePassword: failed to hash password: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process password"})
		return
	}

	_, err = h.DB.ExecContext(ctx, `
		UPDATE candidates SET password_hash = $1 WHERE id = $2
	`, string(hashedPassword), candidateID)
	if err != nil {
		log.Printf("UpdateCandidatePassword: failed to update password: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update password"})
		return
	}

	key, err := email.DecodeKey(h.Cfg.EncryptionKey)
	if err != nil {
		log.Printf("UpdateCandidatePassword: failed to decode encryption key: %v", err)
	} else {
		sesCfg, err := email.LoadSESConfig(ctx, h.DB, key)
		if err != nil {
			log.Printf("UpdateCandidatePassword: failed to load SES config: %v", err)
		} else {
			body, err := email.Render(email.TemplateCandidateCredentials, email.CandidateCredentialsData{
				CandidateName: fullName,
				Email:         candidateEmail,
				Password:      req.NewPassword,
				LoginURL:      sesCfg.SESLoginURL,
			})
			if err != nil {
				log.Printf("UpdateCandidatePassword: failed to render email: %v", err)
			} else {
				_, err = email.Enqueue(ctx, h.DB, email.EmailJob{
					ToEmail:     candidateEmail,
					ToName:      fullName,
					FromEmail:   sesCfg.SESFromEmail,
					Subject:     "Your Vigilant Account Password Has Been Updated",
					BodyHTML:    body,
					Template:    email.TemplateCandidateCredentials,
					EntityType:  "candidate",
					EntityID:    candidateID,
					TriggeredBy: "update_candidate_password",
					Priority:    email.PriorityHigh,
				})
				if err != nil {
					log.Printf("UpdateCandidatePassword: failed to enqueue email: %v", err)
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "password updated successfully"})
}

func (h *AdminHandlers) GetProcessReports(c *gin.Context) {
	sessionID := c.Param("session_id")

	query := `
		SELECT id, session_id, reported_at, processes, alert_count, high_memory_alerts, unknown_electron_alerts
		FROM process_reports
		WHERE session_id = $1
		ORDER BY reported_at DESC
	`

	rows, err := h.DB.Query(query, sessionID)
	if err != nil {
		log.Printf("Error querying process reports: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve reports"})
		return
	}
	defer rows.Close()

	reports := []gin.H{}

	for rows.Next() {
		var id int64
		var sessID string
		var reportedAt time.Time
		var processesJSON []byte
		var alertCount, highMemAlerts, electronAlerts int

		if err := rows.Scan(&id, &sessID, &reportedAt, &processesJSON, &alertCount, &highMemAlerts, &electronAlerts); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		var processes []models.Process
		if err := json.Unmarshal(processesJSON, &processes); err != nil {
			log.Printf("Error unmarshaling processes: %v", err)
			continue
		}

		reports = append(reports, gin.H{
			"id":                      id,
			"session_id":              sessID,
			"timestamp":               reportedAt,
			"processes":               processes,
			"alert_count":             alertCount,
			"high_memory_alerts":      highMemAlerts,
			"unknown_electron_alerts": electronAlerts,
		})
	}

	c.JSON(http.StatusOK, reports)
}
