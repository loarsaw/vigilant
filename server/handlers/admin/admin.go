package admin

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

	"vigilant/middleware"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

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

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	// SuperAdminUUID is not in administrators table pass NULL
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

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
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

// Issues a JWT for HR and interviewers

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

	// Update last_login
	h.DB.Exec("UPDATE administrators SET last_login = NOW() WHERE id = $1", adminID)

	token, err := middleware.IssueAdminJWT(h.Cfg, adminID, req.Email, role, fullName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to issue token"})
		return
	}

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

	// Super admin has no DB row
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

func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
