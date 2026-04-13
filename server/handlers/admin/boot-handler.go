package admin

import (
	"database/sql"
	"net/http"
	"vigilant/config"
	"vigilant/email"

	"github.com/gin-gonic/gin"
)

type UserData struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type AdminHandlers struct {
	DB  *sql.DB
	Cfg *config.Config
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
	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"message":       "Token is valid",
		"authenticated": true,
	})
}
