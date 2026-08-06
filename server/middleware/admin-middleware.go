package middleware

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

	"vigilant/config"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// SuperAdminUUID is a sentinel UUID assigned to requests authenticated
// via X-Admin-Token. It is NOT stored in the administrators table —
// it is only used as created_by/updated_by for system-level operations.
const SuperAdminUUID = "00000000-0000-0000-0000-000000000001"

// AdminClaims are embedded in JWTs issued to admin users on login.
type AdminClaims struct {
	AdminID  string `json:"admin_id"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	FullName string `json:"full_name"`
	jwt.RegisteredClaims
}

// AdminAuthMiddleware protects admin routes.
// Authentication is accepted in three ways (checked in order):
//
//  1. X-Admin-Token header — matches cfg.AdminToken → SuperAdminUUID identity
//  2. X-Admin-Email + X-Admin-Password headers → credentials checked against DB
//  3. Authorization: Bearer <jwt> → JWT issued by /api/v1/admin/login
func AdminAuthMiddleware(cfg *config.Config, db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {

		adminToken := c.GetHeader("X-Admin-Token")
		if adminToken != "" && cfg.AdminAuthToken != "" && adminToken == cfg.AdminAuthToken {
			setSuperAdminContext(c)
			c.Next()
			return
		}

		adminEmail := c.GetHeader("X-Admin-Email")
		adminPassword := c.GetHeader("X-Admin-Password")
		if adminEmail != "" && adminPassword != "" {
			if authenticateAdminByCredentials(c, db, adminEmail, adminPassword) {
				c.Next()
			}
			return
		}

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized: missing credentials"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized: malformed authorization header"})
			c.Abort()
			return
		}

		claims := &AdminClaims{}
		jwtToken, err := jwt.ParseWithClaims(parts[1], claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !jwtToken.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized: invalid or expired token"})
			c.Abort()
			return
		}

		setAdminContext(c, claims.AdminID, claims.Email, claims.Role, claims.FullName)
		c.Next()
	}
}

// IssueAdminJWT generates a signed JWT for an admin after successful login.
// Call this from your POST /api/v1/admin/login handler.
func IssueAdminJWT(cfg *config.Config, adminID, email, role, fullName string) (string, error) {
	claims := AdminClaims{
		AdminID:  adminID,
		Email:    email,
		Role:     role,
		FullName: fullName,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(12 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   adminID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

func authenticateAdminByCredentials(c *gin.Context, db *sql.DB, email, password string) bool {
	var adminID, passwordHash, role, fullName string
	var isActive bool

	err := db.QueryRow(`
		SELECT id, password_hash, role, full_name, is_active
		FROM administrators
		WHERE email = $1
	`, email).Scan(&adminID, &passwordHash, &role, &fullName, &isActive)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized: invalid credentials"})
		c.Abort()
		return false
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		c.Abort()
		return false
	}
	if !isActive {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: account is deactivated"})
		c.Abort()
		return false
	}
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized: invalid credentials"})
		c.Abort()
		return false
	}

	setAdminContext(c, adminID, email, role, fullName)
	return true
}

func setAdminContext(c *gin.Context, adminID, email, role, fullName string) {
	c.Set("admin_id", adminID)
	c.Set("user_id", adminID) // used by created_by / updated_by in handlers
	c.Set("user_email", email)
	c.Set("admin_role", role)
	c.Set("admin_full_name", fullName)
	c.Set("is_admin", true)
}

func setSuperAdminContext(c *gin.Context) {
	c.Set("admin_id", SuperAdminUUID)
	c.Set("user_id", SuperAdminUUID)
	c.Set("user_email", "superadmin@system")
	c.Set("admin_role", "superadmin")
	c.Set("admin_full_name", "Super Admin")
	c.Set("is_admin", true)
	c.Set("is_super_admin", true)
}
