package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"vigilant/config"
)

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.URL.Path == "/health" {
			c.Next()
			return
		}

		if cfg.AuthToken == "" && cfg.JWTSecret == "" {

			c.Next()
			return
		}

		token := c.GetHeader("X-Vigilant-Token")
		if token == "" {
			token = c.Query("X-Vigilant-Token")
		}

		if token != "" && cfg.AuthToken != "" && token == cfg.AuthToken {
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized: invalid or missing token"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized: malformed authorization header"})
			c.Abort()
			return
		}

		jwtToken, err := jwt.Parse(parts[1], func(t *jwt.Token) (interface{}, error) {
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

		if claims, ok := jwtToken.Claims.(jwt.MapClaims); ok {
			c.Set("candidate_id", claims["candidate_id"])
			c.Set("email", claims["email"])
		}

		c.Next()
	}
}