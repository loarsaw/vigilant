// server/middleware/client-middleware.go
package middleware

import (
	"database/sql"
	"net/http"
	"strings"

	"vigilant/config"
	"vigilant/utils"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware protects candidate routes. Candidates authenticate with:
//
//	Authorization: Bearer <jwt> : a candidate ACCESS JWT issued via
//	utils.IssueCandidateJWT (interview passcode verify), scoped to one
//	interview session via claims.SessionID.
func AuthMiddleware(db *sql.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "access token required"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "access token required"})
			c.Abort()
			return
		}

		claims, err := utils.ParseCandidateJWT(cfg, parts[1])
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized: invalid or expired token"})
			c.Abort()
			return
		}

		var isActive bool
		if err := db.QueryRow(`SELECT is_active FROM candidates WHERE id = $1`, claims.CandidateID).Scan(&isActive); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized: candidate not found"})
			c.Abort()
			return
		}
		if !isActive {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: account is deactivated"})
			c.Abort()
			return
		}

		c.Set("candidate_id", claims.CandidateID)
		c.Set("candidate_email", claims.Email)
		c.Set("auth_method", "candidate_jwt")
		if claims.SessionID != "" {
			c.Set("invited_session_id", claims.SessionID)
		}
		c.Next()
	}
}

func RequireInviteSessionMatch() gin.HandlerFunc {
	return func(c *gin.Context) {
		invitedSessionID, exists := c.Get("invited_session_id")
		if !exists {
			c.Next()
			return
		}

		pathSessionID := c.Param("session_id")
		if pathSessionID == "" {
			pathSessionID = c.Param("id")
		}

		if pathSessionID == "" || invitedSessionID.(string) != pathSessionID {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: token not valid for this interview session"})
			c.Abort()
			return
		}

		c.Next()
	}
}
