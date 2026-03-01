package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"time"
    "strings"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"github.com/golang-jwt/jwt/v5"
	"vigilant/config"
	"vigilant/models"
	"github.com/google/uuid"

)

type AuthHandlers struct {
	DB  *sql.DB
	Cfg *config.Config
}


func (h *AuthHandlers) Login(c *gin.Context) {
    var req models.CandidateLogin

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
        return
    }

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

    if req.Email == "" || req.Password == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "email and password are required"})
        return
    }

    ctx := c.Request.Context()

    query := `
        SELECT id, email, password_hash, full_name, is_active
        FROM candidates
        WHERE email = $1
    `

    var candidate models.Candidate
    err := h.DB.QueryRowContext(ctx, query, req.Email).Scan(
        &candidate.ID,
        &candidate.Email,
        &candidate.PasswordHash,
        &candidate.FullName,
        &candidate.IsActive,
    )

    if err == sql.ErrNoRows {
        bcrypt.CompareHashAndPassword([]byte("$2a$10$dummy.hash.to.waste.time"), []byte(req.Password))
        c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
        return
    }

    if err != nil {
        log.Printf("Error querying candidate: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "authentication failed"})
        return
    }

    if !candidate.IsActive {
        c.JSON(http.StatusForbidden, gin.H{"error": "account is disabled"})
        return
    }

    if err = bcrypt.CompareHashAndPassword([]byte(candidate.PasswordHash), []byte(req.Password)); err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
        return
    }

    clientIP := c.ClientIP()
    userAgent := c.GetHeader("User-Agent")
    systemType := c.GetHeader("X-System-Type")

    expiresAt := time.Now().Add(24 * time.Hour)

    tokenID := uuid.New().String()

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "jti":          tokenID,
        "candidate_id": candidate.ID,
        "email":        candidate.Email,
        "exp":          expiresAt.Unix(),
        "iat":          time.Now().Unix(),
    })

    tokenString, err := token.SignedString([]byte(h.Cfg.JWTSecret))
    if err != nil {
        log.Printf("Error generating token: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate session token"})
        return
    }

    sessionQuery := `
        INSERT INTO candidate_sessions (
            candidate_id, session_token, ip_address, user_agent, system_type, is_active
        )
        VALUES ($1, $2, $3::inet, $4, $5, true)
        RETURNING id, logged_in_at
    `

    var sessionID int64
    var loggedInAt time.Time
    err = h.DB.QueryRowContext(ctx, sessionQuery,
        candidate.ID, tokenString, clientIP, userAgent, systemType,
    ).Scan(&sessionID, &loggedInAt)

    if err != nil {
        log.Printf("Error creating session: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create session"})
        return
    }

    if _, err := h.DB.ExecContext(ctx, "UPDATE candidates SET last_login = NOW() WHERE id = $1", candidate.ID); err != nil {
		log.Printf("Warning: failed to update last_login for candidate %s: %v", candidate.ID, err)

    }

    h.logAudit(candidate.ID, "login", "candidate_session", &sessionID, clientIP, userAgent)

    c.JSON(http.StatusOK, gin.H{
        "token":        tokenString,
        "candidate_id": candidate.ID,
        "email":        candidate.Email,
        "full_name":    candidate.FullName,
        "session_id":   sessionID,
        "logged_in_at": loggedInAt,
        "expires_at":   expiresAt,
    })
}
func (h *AuthHandlers) Logout(c *gin.Context) {
	tokenString := c.GetHeader("Authorization")
	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authorization token"})
		return
	}

	if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
		tokenString = tokenString[7:]
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(h.Cfg.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token claims"})
		return
	}

	// candidateID := int64(claims["candidate_id"].(float64))
	candidateID := claims["candidate_id"].(string)


	query := `
		UPDATE candidate_sessions
		SET logged_out_at = NOW(), is_active = false
		WHERE session_token = $1 AND candidate_id = $2 AND is_active = true
	`

	result, err := h.DB.Exec(query, tokenString, candidateID)
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

	clientIP := c.ClientIP()
	h.logAudit(candidateID, "logout", "candidate_session", nil, clientIP, c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{
		"status": "logged out",
	})
}

func (h *AuthHandlers) GetMe(c *gin.Context) {
	candidateIDVal, exists := c.Get("candidate_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	candidateID := candidateIDVal.(int64)

	query := `
		SELECT id, email, full_name, created_at, last_login
		FROM candidates
		WHERE id = $1 AND is_active = true
	`

	var candidate models.Candidate
	err := h.DB.QueryRow(query, candidateID).Scan(
		&candidate.ID,
		&candidate.Email,
		&candidate.FullName,
		&candidate.CreatedAt,
		&candidate.LastLogin,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "candidate not found"})
		return
	}

	c.JSON(http.StatusOK, candidate)
}

func (h *AuthHandlers) logAudit(candidateID string, action, entityType string, entityID *int64, ip, userAgent string) {
	query := `
		INSERT INTO audit_log (candidate_id, action, entity_type, entity_id, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	h.DB.Exec(query, candidateID, action, entityType, entityID, ip, userAgent)
}
