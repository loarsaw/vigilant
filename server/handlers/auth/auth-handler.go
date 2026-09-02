// server/handlers/auth/auth-handler.go
package auth

import (
	"database/sql"
	"log"
	"net/http"
	"time"

	"vigilant/config"
	"vigilant/models"
	"vigilant/utils"

	"github.com/gin-gonic/gin"
)

type AuthHandlers struct {
	DB  *sql.DB
	Cfg *config.Config
}

func (h *AuthHandlers) VerifyAccessLink(c *gin.Context) {
	rawToken := c.Query("token")
	if rawToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "token is required"})
		return
	}
	tokenHash := utils.HashToken(rawToken)

	ctx := c.Request.Context()

	var linkID, email string
	var candidateID sql.NullString
	var positionID sql.NullString
	var expiresAt time.Time
	var revokedAt sql.NullTime

	err := h.DB.QueryRowContext(ctx, `
		SELECT id, candidate_id, email, position_id, expires_at, revoked_at
		FROM candidate_access_links
		WHERE token_hash = $1
	`, tokenHash).Scan(&linkID, &candidateID, &email, &positionID, &expiresAt, &revokedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid link"})
		return
	}
	if err != nil {
		log.Printf("Error looking up access link: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "verification failed"})
		return
	}
	if revokedAt.Valid || time.Now().After(expiresAt) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "link expired or revoked"})
		return
	}

	cid := candidateID.String
	if cid == "" {
		err = h.DB.QueryRowContext(ctx, `
			INSERT INTO candidates (email) VALUES ($1)
			ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
			RETURNING id
		`, email).Scan(&cid)
		if err != nil {
			log.Printf("Error resolving candidate: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "verification failed"})
			return
		}
		if _, err := h.DB.ExecContext(ctx,
			`UPDATE candidate_access_links SET candidate_id = $1 WHERE id = $2`, cid, linkID,
		); err != nil {
			log.Printf("Warning: failed to attach candidate to link %s: %v", linkID, err)
		}
	}

	clientIP := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	systemType := c.GetHeader("X-System-Type")

	var sessionID string
	var loggedInAt time.Time
	err = h.DB.QueryRowContext(ctx, `
		INSERT INTO candidate_sessions (
			candidate_id, session_token, ip_address, user_agent, system_type, is_active
		)
		VALUES ($1, $2, $3::inet, $4, $5, true)
		RETURNING id, logged_in_at
	`, cid, tokenHash, clientIP, userAgent, systemType).Scan(&sessionID, &loggedInAt)
	if err != nil {
		log.Printf("Error creating session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "verification failed"})
		return
	}

	if _, err := h.DB.ExecContext(ctx,
		`UPDATE candidates SET last_login = NOW() WHERE id = $1`, cid,
	); err != nil {
		log.Printf("Warning: failed to update last_login for candidate %s: %v", cid, err)
	}

	if _, err := h.DB.ExecContext(ctx, `
		UPDATE candidate_access_links
		SET last_used_at = CURRENT_TIMESTAMP, use_count = use_count + 1
		WHERE id = $1
	`, linkID); err != nil {
		log.Printf("Warning: failed to bump use_count for link %s: %v", linkID, err)
	}

	h.logAudit(cid, "access_link_verified", "candidate_session", &sessionID, clientIP, userAgent)

	resp := gin.H{
		"candidate_id": cid,
		"email":        email,
		"session_id":   sessionID,
		"logged_in_at": loggedInAt,
		"expires_at":   expiresAt,
	}
	if positionID.Valid {
		resp["position_id"] = positionID.String
	}
	c.JSON(http.StatusOK, resp)
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
