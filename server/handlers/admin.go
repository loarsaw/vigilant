package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"vigilant/models"
)

type AdminHandlers struct {
	DB *sql.DB
}

func (h *AdminHandlers) CreateCandidate(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		FullName string `json:"full_name"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if req.Email == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email and password are required"})
		return
	}

	if len(req.Password) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 8 characters"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	query := `
		INSERT INTO candidates (email, password_hash, full_name, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		RETURNING id, email, full_name, created_at, is_active
	`

	var candidate models.Candidate
	err = h.DB.QueryRow(query, req.Email, string(hashedPassword), req.FullName).Scan(
		&candidate.ID,
		&candidate.Email,
		&candidate.FullName,
		&candidate.CreatedAt,
		&candidate.IsActive,
	)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			c.JSON(http.StatusConflict, gin.H{"error": "email already exists"})
			return
		}
		log.Printf("Error creating candidate: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create candidate"})
		return
	}

	c.JSON(http.StatusCreated, candidate)
}

func (h *AdminHandlers) ListCandidates(c *gin.Context) {
	query := `
		SELECT id, email, full_name, created_at, updated_at, is_active, last_login
		FROM candidates
		ORDER BY created_at DESC
	`

	rows, err := h.DB.Query(query)
	if err != nil {
		log.Printf("Error querying candidates: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve candidates"})
		return
	}
	defer rows.Close()

	candidates := []models.Candidate{}

	for rows.Next() {
		var cand models.Candidate
		err := rows.Scan(
			&cand.ID,
			&cand.Email,
			&cand.FullName,
			&cand.CreatedAt,
			&cand.UpdatedAt,
			&cand.IsActive,
			&cand.LastLogin,
		)
		if err != nil {
			log.Printf("Error scanning candidate: %v", err)
			continue
		}
		candidates = append(candidates, cand)
	}

	c.JSON(http.StatusOK, candidates)
}

func (h *AdminHandlers) GetCandidate(c *gin.Context) {
	candidateID := c.Param("id")

	query := `
		SELECT id, email, full_name, created_at, updated_at, is_active, last_login
		FROM candidates
		WHERE id = $1
	`

	var cand models.Candidate
	err := h.DB.QueryRow(query, candidateID).Scan(
		&cand.ID,
		&cand.Email,
		&cand.FullName,
		&cand.CreatedAt,
		&cand.UpdatedAt,
		&cand.IsActive,
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

	c.JSON(http.StatusOK, cand)
}

func (h *AdminHandlers) UpdateCandidate(c *gin.Context) {
	candidateID := c.Param("id")

	var req struct {
		FullName *string `json:"full_name"`
		IsActive *bool   `json:"is_active"`
		Password *string `json:"password"`
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

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields to update"})
		return
	}

	updates = append(updates, "updated_at = NOW()")
	args = append(args, candidateID)

	query := fmt.Sprintf("UPDATE candidates SET %s WHERE id = $%d", strings.Join(updates, ", "), argID)

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

	c.JSON(http.StatusOK, gin.H{
		"status": "updated",
		"id":     candidateID,
	})
}

func (h *AdminHandlers) DeleteCandidate(c *gin.Context) {
	candidateID := c.Param("id")

	query := `UPDATE candidates SET is_active = false, updated_at = NOW() WHERE id = $1`

	result, err := h.DB.Exec(query, candidateID)
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

	c.JSON(http.StatusOK, gin.H{
		"status": "deleted",
		"id":     candidateID,
	})
}

func (h *AdminHandlers) GetDashboardStats(c *gin.Context) {
	stats := gin.H{}

	var totalCandidates int
	h.DB.QueryRow("SELECT COUNT(*) FROM candidates WHERE is_active = true").Scan(&totalCandidates)
	stats["total_candidates"] = totalCandidates

	var activeInterviews int
	h.DB.QueryRow("SELECT COUNT(*) FROM interview_sessions WHERE status = 'in_progress'").Scan(&activeInterviews)
	stats["active_interviews"] = activeInterviews

	var interviewsToday int
	h.DB.QueryRow("SELECT COUNT(*) FROM interview_sessions WHERE started_at >= CURRENT_DATE").Scan(&interviewsToday)
	stats["interviews_today"] = interviewsToday

	var highRiskSessions int
	h.DB.QueryRow("SELECT COUNT(*) FROM alert_summary WHERE risk_score > 50").Scan(&highRiskSessions)
	stats["high_risk_sessions"] = highRiskSessions

	var recentLogins int
	h.DB.QueryRow("SELECT COUNT(*) FROM candidate_sessions WHERE logged_in_at >= NOW() - INTERVAL '24 hours'").Scan(&recentLogins)
	stats["recent_logins"] = recentLogins

	c.JSON(http.StatusOK, stats)
}
