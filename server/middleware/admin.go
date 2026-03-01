package middleware

import (
	"net"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"vigilant/config"
)

func AdminAuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cfg.AdminAuthToken == "" && cfg.AdminEmail == "" {
			c.Next()
			return
		}

		if !isAuthenticated(c, cfg) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "unauthorized: invalid credentials",
			})
			c.Abort()
			return
		}

		allowedIPs := cfg.GetAdminIPs()
		if len(allowedIPs) > 0 {
			clientIP := getClientIP(c)
			if !isIPAllowed(clientIP, allowedIPs) {
				c.JSON(http.StatusForbidden, gin.H{
					"error": "forbidden: IP address not authorized",
				})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

func isAuthenticated(c *gin.Context, cfg *config.Config) bool {
	if cfg.AdminAuthToken != "" {
		token := c.GetHeader("X-Admin-Token")
		if token == "" {
			token = c.Query("X-Admin-Token")
		}
		if token == cfg.AdminAuthToken {
			return true
		}
	}

	if cfg.AdminEmail != "" && cfg.AdminPassword != "" {
		email := c.GetHeader("X-Admin-Email")
		password := c.GetHeader("X-Admin-Password")
		if email == cfg.AdminEmail && password == cfg.AdminPassword {
			return true
		}
	}

	return false
}

func getClientIP(c *gin.Context) string {
	return c.ClientIP()
}

func isIPAllowed(clientIP string, allowedIPs []string) bool {
	client := net.ParseIP(clientIP)
	if client == nil {
		return true
	}

	for _, allowed := range allowedIPs {
		if strings.Contains(allowed, "/") {
			_, ipNet, err := net.ParseCIDR(allowed)
			if err != nil {
				continue
			}
			if ipNet.Contains(client) {
				return true
			}
		} else {
			if clientIP == allowed {
				return true
			}
		}
	}

	return false
}