package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"vigilant/config"
)

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.URL.Path == "/health" {
			c.Next()
			return
		}

		if cfg.AuthToken == "" {
			c.Next()
			return
		}

		token := c.GetHeader("X-Vigilant-Token")
		if token == "" {
			token = c.Query("X-Vigilant-Token")
		}

		if token != cfg.AuthToken {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "unauthorized: invalid or missing token",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
