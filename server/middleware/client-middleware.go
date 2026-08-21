// server/middleware/client-middleware.go
package middleware

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

	"vigilant/config"
	"vigilant/utils"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type CandidateClaims struct {
	CandidateID string `json:"candidate_id"`
	Email       string `json:"email"`
	SessionID   string `json:"session_id,omitempty"`
	jwt.RegisteredClaims
}

func IssueCandidateJWT(cfg *config.Config, candidateID, email, sessionID string, validFor time.Duration) (string, error) {
	claims := CandidateClaims{
		CandidateID: candidateID,
		Email:       email,
		SessionID:   sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(validFor)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   candidateID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

// AuthMiddleware protects candidate routes. Two ways to authenticate:
//
//  1. Authorization: Bearer <jwt> : a candidate JWT issued via
//     IssueCandidateJWT (interview invite login), scoped to one
//     interview session via claims.SessionID.
//  2. X-Access-Token header / ?token= query param : the original opaque
//     candidate_access_links flow (job application invite links).
func AuthMiddleware(db *sql.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
				claims := &CandidateClaims{}
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
				return
			}
		}

		// Fall back to the original opaque-token (candidate_access_links) flow.
		rawToken := c.GetHeader("X-Access-Token")
		if rawToken == "" {
			rawToken = c.Query("token")
		}
		if rawToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "access token required"})
			c.Abort()
			return
		}
		tokenHash := utils.HashToken(rawToken)

		var candidateID sql.NullString
		var email string
		var positionID sql.NullString
		var expiresAt time.Time
		var revokedAt sql.NullTime

		err := db.QueryRow(`
			SELECT candidate_id, email, position_id, expires_at, revoked_at
			FROM candidate_access_links WHERE token_hash = $1
		`, tokenHash).Scan(&candidateID, &email, &positionID, &expiresAt, &revokedAt)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid link"})
			c.Abort()
			return
		}
		if err != nil || revokedAt.Valid || time.Now().After(expiresAt) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "link expired or revoked"})
			c.Abort()
			return
		}

		cid := candidateID.String
		if cid == "" {
			err = db.QueryRow(`
				INSERT INTO candidates (email) VALUES ($1)
				ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
				RETURNING id
			`, email).Scan(&cid)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to resolve candidate"})
				c.Abort()
				return
			}
			db.Exec(`UPDATE candidate_access_links SET candidate_id = $1 WHERE token_hash = $2`, cid, tokenHash)
		}

		db.Exec(`
			UPDATE candidate_access_links
			SET last_used_at = CURRENT_TIMESTAMP, use_count = use_count + 1
			WHERE token_hash = $1
		`, tokenHash)

		c.Set("candidate_id", cid)
		c.Set("candidate_email", email)
		c.Set("auth_method", "access_link")
		if positionID.Valid {
			c.Set("invited_position_id", positionID.String)
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
