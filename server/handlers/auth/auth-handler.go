// server/handlers/auth/auth-handler.go
package auth

import (
	"database/sql"
	"log"
	"net/http"

	"vigilant/config"
	"vigilant/models"
	"vigilant/utils"

	"github.com/gin-gonic/gin"
)

type AuthHandlers struct {
	DB  *sql.DB
	Cfg *config.Config
}

// GetMe returns the candidate's identity record. Resume/skills/experience
// now live per-application on job_applications, not here.
func (h *AuthHandlers) GetMe(c *gin.Context) {
	candidateIDVal, exists := c.Get("candidate_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}
	candidateID, ok := candidateIDVal.(string)
	if !ok || candidateID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
		return
	}

	query := `
		SELECT id, email, full_name, phone_number, is_active,
		       onboarding_complete, last_login, created_at, updated_at
		FROM candidates
		WHERE id = $1 AND is_active = true
	`

	var candidate models.Candidate
	err := h.DB.QueryRow(query, candidateID).Scan(
		&candidate.ID,
		&candidate.Email,
		&candidate.FullName,
		&candidate.PhoneNumber,
		&candidate.IsActive,
		&candidate.OnboardingComplete,
		&candidate.LastLogin,
		&candidate.CreatedAt,
		&candidate.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "candidate not found"})
		return
	}

	c.JSON(http.StatusOK, candidate)
}

func (h *AuthHandlers) Logout(c *gin.Context) {
	rawToken := c.GetHeader("X-Access-Token")
	if rawToken == "" {
		rawToken = c.Query("token")
	}
	if rawToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing access token"})
		return
	}
	tokenHash := utils.HashToken(rawToken)

	candidateIDVal, exists := c.Get("candidate_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}
	candidateID, _ := candidateIDVal.(string)

	result, err := h.DB.Exec(`
		UPDATE candidate_sessions
		SET logged_out_at = NOW(), is_active = false
		WHERE session_token = $1 AND candidate_id = $2 AND is_active = true
	`, tokenHash, candidateID)
	if err != nil {
		log.Printf("Error ending session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to end session"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found or already ended"})
		return
	}

	h.logAudit(candidateID, "logout", "candidate_session", nil, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{"status": "logged out"})
}

func (h *AuthHandlers) logAudit(candidateID string, action, entityType string, entityID *string, ip, userAgent string) {
	query := `
		INSERT INTO audit_log (candidate_id, action, entity_type, entity_id, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	h.DB.Exec(query, candidateID, action, entityType, entityID, ip, userAgent)
}
