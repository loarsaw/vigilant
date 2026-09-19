// server/handlers/admin/email-handler.go
package admin

import (
	"database/sql"
	"log"
	"net/http"
	"regexp"
	"strings"
	"vigilant/email"
	"vigilant/models"

	"github.com/gin-gonic/gin"
)

var (
	awsRegionRegex    = regexp.MustCompile(`^[a-z]{2}(-gov|-iso[a-z]*)?-[a-z]+-\d$`)
	awsAccessKeyRegex = regexp.MustCompile(`^(AKIA|ASIA|AROA|AIDA)[A-Z0-9]{16}$`)
	awsSecretKeyRegex = regexp.MustCompile(`^[A-Za-z0-9/+=]{40}$`)
	basicEmailRegex   = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
	sendgridKeyRegex  = regexp.MustCompile(`^SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$`)
)

func validateEmailConfigFields(req models.EmailConfigRequest) string {
	switch req.Provider {
	case email.ProviderSES:
		region := strings.TrimSpace(req.AWSRegion)
		accessKey := strings.TrimSpace(req.AWSAccessKeyID)
		secretKey := strings.TrimSpace(req.AWSSecretAccessKey)

		switch {
		case region == "":
			return "AWS Region is required"
		case !awsRegionRegex.MatchString(region):
			return "AWS Region doesn't look valid, e.g. us-east-1, eu-west-2"
		case accessKey == "":
			return "AWS Access Key ID is required"
		case len(accessKey) != 20 || !awsAccessKeyRegex.MatchString(accessKey):
			return "AWS Access Key ID doesn't look valid"
		case secretKey == "":
			return "AWS Secret Access Key is required"
		case len(secretKey) != 40 || !awsSecretKeyRegex.MatchString(secretKey):
			return "AWS Secret Access Key doesn't look valid"
		}

	case email.ProviderSendGrid:
		apiKey := strings.TrimSpace(req.APIKey)
		switch {
		case apiKey == "":
			return "SendGrid API Key is required"
		case !sendgridKeyRegex.MatchString(apiKey):
			return "SendGrid API Key doesn't look valid, expected format SG.xxxxx.yyyyy"
		}

	default:
		return "Provider must be one of: ses, sendgrid"
	}

	switch {
	case strings.TrimSpace(req.FromEmail) == "":
		return "From Email is required"
	case !basicEmailRegex.MatchString(req.FromEmail):
		return "From Email doesn't look like a valid email address"
	case strings.TrimSpace(req.LoginURL) == "":
		return "App Login URL is required"
	case strings.TrimSpace(req.TestEmail) == "":
		return "A test email address is required to verify the configuration"
	case !basicEmailRegex.MatchString(req.TestEmail):
		return "Test email doesn't look like a valid email address"
	}
	return ""
}

// buildSettings extracts the provider-specific settings map from the request.
func buildSettings(req models.EmailConfigRequest) map[string]string {
	switch req.Provider {
	case email.ProviderSES:
		return map[string]string{
			"aws_region":            req.AWSRegion,
			"aws_access_key_id":     req.AWSAccessKeyID,
			"aws_secret_access_key": req.AWSSecretAccessKey,
		}
	case email.ProviderSendGrid:
		return map[string]string{
			"api_key": req.APIKey,
		}
	default:
		return nil
	}
}

func (h *AdminHandlers) SaveEmailConfig(c *gin.Context) {
	var req models.EmailConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if msg := validateEmailConfigFields(req); msg != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}

	candidate := email.EmailConfig{
		Provider:  req.Provider,
		FromEmail: req.FromEmail,
		LoginURL:  req.LoginURL,
		Settings:  buildSettings(req),
	}

	verificationData := models.ConfigVerificationData{
		Provider:  req.Provider,
		FromEmail: req.FromEmail,
		LoginURL:  req.LoginURL,
	}
	if req.Provider == email.ProviderSES {
		verificationData.AWSRegion = req.AWSRegion
	}

	body, err := email.Render(email.TemplateConfigVerification, verificationData)

	if err != nil {
		log.Printf("SaveEmailConfig: render verification email: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to render verification email"})
		return
	}

	if err := email.SendTestEmail(c.Request.Context(), candidate, req.TestEmail,
		"Vigilant — email configuration verified", body); err != nil {
		log.Printf("SaveEmailConfig: verification send failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Couldn't send a test email with these credentials. Double check them (and, for SES, that the From Email is verified in SES), then try again.",
		})
		return
	}

	key, err := email.DecodeKey(h.Cfg.EncryptionKey)
	if err != nil {
		log.Printf("SaveEmailConfig: decode key: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if err := email.SaveEmailConfig(c.Request.Context(), h.DB, candidate, key); err != nil {
		log.Printf("SaveEmailConfig: save: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save email config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "test email sent and config saved"})
}

func (h *AdminHandlers) GetEmailConfig(c *gin.Context) {
	key, err := email.DecodeKey(h.Cfg.EncryptionKey)
	if err != nil {
		log.Printf("GetEmailConfig: decode key: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	cfg, err := email.LoadEmailConfig(c.Request.Context(), h.DB, key)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "email config not configured"})
		return
	}
	if err != nil {
		log.Printf("GetEmailConfig: load: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load email config"})
		return
	}

	resp := gin.H{
		"provider":   cfg.Provider,
		"from_email": cfg.FromEmail,
		"login_url":  cfg.LoginURL,
	}

	switch cfg.Provider {
	case email.ProviderSES:
		resp["aws_region"] = cfg.Get("aws_region")
		resp["aws_access_key_id"] = cfg.Get("aws_access_key_id")
	case email.ProviderSendGrid:
		resp["api_key_configured"] = cfg.Get("api_key") != ""
	}

	c.JSON(http.StatusOK, resp)
}

func (h *AdminHandlers) SendCustomEmail(c *gin.Context) {
	var req models.SendCustomEmailRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	key, err := email.DecodeKey(h.Cfg.EncryptionKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server misconfiguration"})
		return
	}
	cfg, err := email.LoadEmailConfig(c.Request.Context(), h.DB, key)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email not configured"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load email config"})
		return
	}

	body, err := email.Render(email.TemplateCustomMessage, models.CustomMessageData{
		CandidateName: req.CandidateName,
		Message:       req.Message,
	})
	if err != nil {
		log.Printf("SendCustomEmail: render: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to render email"})
		return
	}

	_, err = email.Enqueue(c.Request.Context(), h.DB, email.EmailJob{
		ToEmail:     req.ToEmail,
		ToName:      req.CandidateName,
		FromEmail:   cfg.FromEmail,
		Subject:     req.Subject,
		BodyHTML:    body,
		Template:    email.TemplateCustomMessage,
		EntityType:  "candidate",
		TriggeredBy: "admin_custom_email",
		Priority:    email.PriorityHigh,
	})
	if err != nil {
		log.Printf("SendCustomEmail: enqueue: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to queue email"})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"message": "email queued", "to": req.ToEmail})
}
