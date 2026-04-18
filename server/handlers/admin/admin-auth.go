package admin

import (
	"database/sql"
	"log"
	"net/http"
	"time"

	"vigilant/middleware"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func (h *AdminHandlers) AdminLogin(c *gin.Context) {
	var req struct {
		Email    string `json:"email"    binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var adminID, passwordHash, role, fullName string
	var isActive bool

	err := h.DB.QueryRow(`
		SELECT id, password_hash, role, full_name, is_active
		FROM administrators WHERE email = $1
	`, req.Email).Scan(&adminID, &passwordHash, &role, &fullName, &isActive)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	if !isActive {
		c.JSON(http.StatusForbidden, gin.H{"error": "account is deactivated"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	h.DB.Exec("UPDATE administrators SET last_login = NOW() WHERE id = $1", adminID)

	token, err := middleware.IssueAdminJWT(h.Cfg, adminID, req.Email, role, fullName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue token"})
		return
	}

	_, err = h.DB.Exec(`
		INSERT INTO admin_sessions (admin_id, session_token, ip_address, user_agent, is_active)
		VALUES ($1, $2, $3::inet, $4, true)
	`, adminID, token, c.ClientIP(), c.GetHeader("User-Agent"))
	if err != nil {
		log.Printf("Error creating admin session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create session"})
		return
	}

	h.logAudit(adminID, "login", "admin_session", nil, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{
		"token":     token,
		"id":        adminID,
		"email":     req.Email,
		"full_name": fullName,
		"role":      role,
	})
}

func (h *AdminHandlers) GetAdminMe(c *gin.Context) {
	adminID := c.GetString("admin_id")
	adminRole := c.GetString("admin_role")

	if adminRole == "superadmin" {
		c.JSON(http.StatusOK, gin.H{
			"id":        middleware.SuperAdminUUID,
			"email":     "superadmin@system",
			"full_name": "Super Admin",
			"role":      "superadmin",
		})
		return
	}

	var id, email, fullName, role string
	var department, designation sql.NullString
	var isActive bool
	var lastLogin sql.NullTime
	var createdAt time.Time

	err := h.DB.QueryRow(`
		SELECT id, email, full_name, role, department, designation,
		       is_active, last_login, created_at
		FROM administrators WHERE id = $1
	`, adminID).Scan(&id, &email, &fullName, &role, &department,
		&designation, &isActive, &lastLogin, &createdAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "admin not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          id,
		"email":       email,
		"full_name":   fullName,
		"role":        role,
		"department":  department.String,
		"designation": designation.String,
		"is_active":   isActive,
		"last_login":  lastLogin.Time,
		"created_at":  createdAt,
	})
}

func (h *AdminHandlers) AdminLogout(c *gin.Context) {
	adminID := c.GetString("admin_id")
	adminRole := c.GetString("admin_role")

	if adminRole == "superadmin" {
		h.logAudit(middleware.SuperAdminUUID, "logout", "admin_session", nil, c.ClientIP(), c.GetHeader("User-Agent"))
		c.JSON(http.StatusOK, gin.H{"status": "logged out"})
		return
	}

	tokenString := c.GetHeader("Authorization")
	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authorization token"})
		return
	}
	if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
		tokenString = tokenString[7:]
	}

	result, err := h.DB.Exec(`
		UPDATE admin_sessions
		SET logged_out_at = NOW(), is_active = false
		WHERE session_token = $1 AND admin_id = $2 AND is_active = true
	`, tokenString, adminID)
	if err != nil {
		log.Printf("Error ending admin session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to end session"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found or already ended"})
		return
	}

	h.logAudit(adminID, "logout", "admin_session", nil, c.ClientIP(), c.GetHeader("User-Agent"))
	c.JSON(http.StatusOK, gin.H{"status": "logged out"})
}

func (h *AdminHandlers) logAudit(adminID, action, entityType string, entityID *string, ip, ua string) {
	_, err := h.DB.Exec(`
		INSERT INTO audit_log (admin_id, action, entity_type, entity_id, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5::inet, $6)
	`, adminID, action, entityType, entityID, ip, ua)
	if err != nil {
		log.Printf("Failed to write audit log: %v", err)
	}
}
