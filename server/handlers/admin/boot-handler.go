// server/handlers/admin/boot-handler.go
package admin

import (
	"database/sql"
	"net/http"
	"vigilant/ai"
	"vigilant/analyzer"
	"vigilant/config"
	"vigilant/email"
	"vigilant/livekit"
	"vigilant/notifications"

	"github.com/gin-gonic/gin"
)

type UserData struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type AdminHandlers struct {
	DB  *sql.DB
	Cfg *config.Config
	// Twilio *call.TwilioClient
	AIService       *ai.Service
	AnalyzerService *analyzer.Service
	Notifications   *notifications.Service
	LiveKitService  *livekit.Service
}

func (h *AdminHandlers) loadMailer(c *gin.Context) (*email.Mailer, *email.SESConfig, error) {
	key, err := email.DecodeKey(h.Cfg.EncryptionKey)
	if err != nil {
		return nil, nil, err
	}

	sesCfg, err := email.LoadSESConfig(c.Request.Context(), h.DB, key)
	if err != nil {
		return nil, nil, err
	}

	mailer, err := email.NewMailerFromConfig(c.Request.Context(), sesCfg)
	if err != nil {
		return nil, nil, err
	}

	return mailer, sesCfg, nil
}

func (h *AdminHandlers) VerifyToken(c *gin.Context) {
	token := h.Cfg.AdminAuthToken
	adminToken := c.GetHeader("X-Admin-Token")

	if token == adminToken {
		c.JSON(http.StatusOK, gin.H{
			"success":       true,
			"message":       "Token is valid",
			"authenticated": true,
		})
	} else {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success":       false,
			"message":       "Token is not valid",
			"authenticated": false,
		})
	}
}
