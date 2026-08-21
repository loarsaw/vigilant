// server//handlers/admin/admin-handler.go
package admin

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"vigilant/email"
	"vigilant/middleware"
	"vigilant/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func (h *AdminHandlers) CreateAccessLink(c *gin.Context) {
	adminIDVal, _ := c.Get("admin_id")
	adminID, _ := adminIDVal.(string)

	var req struct {
		Email      string `json:"email" validate:"required,email"`
		PositionID string `json:"position_id,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "valid email is required"})
		return
	}
	toEmail := strings.ToLower(strings.TrimSpace(req.Email))

	rawToken, tokenHash, err := utils.GenerateToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate link"})
		return
	}

	var linkID string
	err = h.DB.QueryRow(`
		INSERT INTO candidate_access_links (email, position_id, token_hash, created_by)
		VALUES ($1, NULLIF($2, ''), $3, $4)
		RETURNING id
	`, toEmail, req.PositionID, tokenHash, adminID).Scan(&linkID)
	if err != nil {
		log.Printf("Error storing access link: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate link"})
		return
	}

	link := fmt.Sprintf("%s/apply?token=%s", h.Cfg.DomainName, rawToken)

	var fromEmail string
	err = h.DB.QueryRow(`SELECT ses_from_email FROM email_config LIMIT 1`).Scan(&fromEmail)
	if err != nil {
		log.Printf("Warning: failed to load ses_from_email, using fallback: %v", err)
		fromEmail = "no-reply@localhost"
	}

	body, err := email.Render(email.TemplateCandidateInvite, email.CandidateInviteData{
		ApplyURL: link,
	})
	if err != nil {
		log.Printf("Error rendering invite email: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate link"})
		return
	}

	_, err = h.DB.Exec(`
		INSERT INTO email_jobs (to_email, from_email, subject, body_html, template, entity_type, entity_id)
		VALUES ($1, $2, $3, $4, $5, 'access_link', $6)
	`, toEmail, fromEmail, "You've been invited to apply", body, email.TemplateCandidateInvite, linkID)
	if err != nil {
		log.Printf("Error queuing invite email: %v", err)
	}

	c.JSON(http.StatusCreated, gin.H{"link": link, "expires_in_days": 10})
}

func (h *AdminHandlers) CreateAdmin(c *gin.Context) {
	callerRole := c.GetString("admin_role")
	callerID := c.GetString("admin_id")

	if callerRole == "interviewer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: interviewers cannot create accounts"})
		return
	}

	var req struct {
		Email       string `json:"email"        binding:"required,email"`
		Password    string `json:"password"     binding:"required,min=8"`
		FullName    string `json:"full_name"    binding:"required"`
		Role        string `json:"role"         binding:"required,oneof=hr interviewer"`
		Department  string `json:"department"`
		Designation string `json:"designation"`
		PhoneNumber string `json:"phone_number"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if callerRole == "superadmin" && req.Role != "hr" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: super admin can only create HR accounts"})
		return
	}
	if callerRole == "hr" && req.Role != "interviewer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: HR can only create interviewer accounts"})
		return
	}

	bcryptCost := bcrypt.DefaultCost
	if parsed, err := strconv.Atoi(h.Cfg.BcryptCost); err == nil && parsed >= bcrypt.MinCost && parsed <= bcrypt.MaxCost {
		bcryptCost = parsed
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	var createdBy *string
	if callerID != middleware.SuperAdminUUID {
		createdBy = &callerID
	}

	var newID string
	err = h.DB.QueryRow(`
		INSERT INTO administrators (
			email, password_hash, full_name, role,
			department, designation, phone_number, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, req.Email, string(hash), req.FullName, req.Role,
		nullableString(req.Department), nullableString(req.Designation),
		nullableString(req.PhoneNumber), createdBy,
	).Scan(&newID)

	if err != nil {
		if strings.Contains(err.Error(), "unique") {
			c.JSON(http.StatusConflict, gin.H{"error": "email already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create admin"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":        newID,
		"email":     req.Email,
		"full_name": req.FullName,
		"role":      req.Role,
	})
}

func (h *AdminHandlers) ListAdmins(c *gin.Context) {
	callerRole := c.GetString("admin_role")

	if callerRole == "interviewer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	var query string
	if callerRole == "superadmin" {
		query = `
			SELECT id, email, full_name, role, department, designation,
			       phone_number, is_active, last_login, created_at
			FROM administrators
			ORDER BY created_at DESC
		`
	} else {
		// HR sees only interviewers
		query = `
			SELECT id, email, full_name, role, department, designation,
			       phone_number, is_active, last_login, created_at
			FROM administrators
			WHERE role = 'interviewer'
			ORDER BY created_at DESC
		`
	}

	rows, err := h.DB.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch admins"})
		return
	}
	defer rows.Close()

	var admins []gin.H
	for rows.Next() {
		var id, email, fullName, role string
		var department, designation, phoneNumber sql.NullString
		var isActive bool
		var lastLogin sql.NullTime
		var createdAt time.Time

		if err := rows.Scan(&id, &email, &fullName, &role, &department,
			&designation, &phoneNumber, &isActive, &lastLogin, &createdAt); err != nil {
			continue
		}

		admins = append(admins, gin.H{
			"id":           id,
			"email":        email,
			"full_name":    fullName,
			"role":         role,
			"department":   department.String,
			"designation":  designation.String,
			"phone_number": phoneNumber.String,
			"is_active":    isActive,
			"last_login":   lastLogin.Time,
			"created_at":   createdAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"admins": admins})
}

func (h *AdminHandlers) GetAdmin(c *gin.Context) {
	callerRole := c.GetString("admin_role")

	if callerRole == "interviewer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	targetID := c.Param("id")

	var id, email, fullName, role string
	var department, designation, phoneNumber sql.NullString
	var isActive bool
	var lastLogin sql.NullTime
	var createdAt time.Time

	err := h.DB.QueryRow(`
		SELECT id, email, full_name, role, department, designation,
		       phone_number, is_active, last_login, created_at
		FROM administrators
		WHERE id = $1
	`, targetID).Scan(&id, &email, &fullName, &role, &department,
		&designation, &phoneNumber, &isActive, &lastLogin, &createdAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "admin not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch admin"})
		return
	}

	// HR can only view interviewers
	if callerRole == "hr" && role != "interviewer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":           id,
		"email":        email,
		"full_name":    fullName,
		"role":         role,
		"department":   department.String,
		"designation":  designation.String,
		"phone_number": phoneNumber.String,
		"is_active":    isActive,
		"last_login":   lastLogin.Time,
		"created_at":   createdAt,
	})
}

func (h *AdminHandlers) UpdateAdmin(c *gin.Context) {
	callerRole := c.GetString("admin_role")

	if callerRole == "interviewer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	targetID := c.Param("id")

	var targetRole string
	err := h.DB.QueryRow("SELECT role FROM administrators WHERE id = $1", targetID).Scan(&targetRole)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "admin not found"})
		return
	}

	if callerRole == "superadmin" && targetRole != "hr" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: super admin can only update HR accounts"})
		return
	}
	if callerRole == "hr" && targetRole != "interviewer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: HR can only update interviewer accounts"})
		return
	}

	var req struct {
		FullName    string `json:"full_name"`
		Department  string `json:"department"`
		Designation string `json:"designation"`
		PhoneNumber string `json:"phone_number"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err = h.DB.Exec(`
		UPDATE administrators
		SET full_name    = COALESCE(NULLIF($1, ''), full_name),
		    department   = COALESCE(NULLIF($2, ''), department),
		    designation  = COALESCE(NULLIF($3, ''), designation),
		    phone_number = COALESCE(NULLIF($4, ''), phone_number)
		WHERE id = $5
	`, req.FullName, req.Department, req.Designation, req.PhoneNumber, targetID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update admin"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "admin updated"})
}

func (h *AdminHandlers) ToggleAdminActive(c *gin.Context) {
	callerRole := c.GetString("admin_role")

	if callerRole == "interviewer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	targetID := c.Param("id")

	var targetRole string
	var isActive bool
	err := h.DB.QueryRow("SELECT role, is_active FROM administrators WHERE id = $1", targetID).
		Scan(&targetRole, &isActive)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "admin not found"})
		return
	}

	if callerRole == "superadmin" && targetRole != "hr" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: super admin can only toggle HR accounts"})
		return
	}
	if callerRole == "hr" && targetRole != "interviewer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: HR can only toggle interviewer accounts"})
		return
	}

	_, err = h.DB.Exec("UPDATE administrators SET is_active = $1 WHERE id = $2", !isActive, targetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to toggle admin status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":        targetID,
		"is_active": !isActive,
	})
}

func (h *AdminHandlers) DeleteAdmin(c *gin.Context) {
	callerRole := c.GetString("admin_role")

	if callerRole == "interviewer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	targetID := c.Param("id")

	var targetRole string
	err := h.DB.QueryRow("SELECT role FROM administrators WHERE id = $1", targetID).Scan(&targetRole)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "admin not found"})
		return
	}

	if callerRole == "superadmin" && targetRole != "hr" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: super admin can only delete HR accounts"})
		return
	}
	if callerRole == "hr" && targetRole != "interviewer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: HR can only delete interviewer accounts"})
		return
	}

	_, err = h.DB.Exec("DELETE FROM administrators WHERE id = $1", targetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete admin"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "admin deleted"})
}

func (h *AdminHandlers) ResetAdminPassword(c *gin.Context) {
	callerRole := c.GetString("admin_role")

	if callerRole == "interviewer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	targetID := c.Param("id")

	var targetRole string
	err := h.DB.QueryRow("SELECT role FROM administrators WHERE id = $1", targetID).Scan(&targetRole)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "admin not found"})
		return
	}

	if callerRole == "superadmin" && targetRole != "hr" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: super admin can only reset HR passwords"})
		return
	}
	if callerRole == "hr" && targetRole != "interviewer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: HR can only reset interviewer passwords"})
		return
	}

	var req struct {
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	bcryptCost := bcrypt.DefaultCost
	if parsed, err := strconv.Atoi(h.Cfg.BcryptCost); err == nil && parsed >= bcrypt.MinCost && parsed <= bcrypt.MaxCost {
		bcryptCost = parsed
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcryptCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	_, err = h.DB.Exec("UPDATE administrators SET password_hash = $1 WHERE id = $2", string(hash), targetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reset password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "password reset successfully"})
}

func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
