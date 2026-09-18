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
)

func validateSESConfigFields(req models.SESConfigRequest) string {
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
	case strings.TrimSpace(req.SESFromEmail) == "":
		return "From Email is required"
	case !basicEmailRegex.MatchString(req.SESFromEmail):
		return "From Email doesn't look like a valid email address"
	case strings.TrimSpace(req.SESLoginURL) == "":
		return "App Login URL is required"
	case strings.TrimSpace(req.TestEmail) == "":
		return "A test email address is required to verify the configuration"
	case !basicEmailRegex.MatchString(req.TestEmail):
		return "Test email doesn't look like a valid email address"
	}
	return ""
}

func (h *AdminHandlers) SaveEmailConfig(c *gin.Context) {
	var req models.SESConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if msg := validateSESConfigFields(req); msg != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}

	candidate := email.SESConfig{
		AWSRegion:          req.AWSRegion,
		AWSAccessKeyID:     req.AWSAccessKeyID,
		AWSSecretAccessKey: req.AWSSecretAccessKey,
		SESFromEmail:       req.SESFromEmail,
		SESLoginURL:        req.SESLoginURL,
	}

	body, err := email.Render(email.TemplateConfigVerification, models.ConfigVerificationData{
		LoginURL: req.SESLoginURL,
	})
	if err != nil {
		log.Printf("SaveEmailConfig: render verification email: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to render verification email"})
		return
	}

	if err := email.SendTestEmail(c.Request.Context(), candidate, req.TestEmail,
		"Vigilant — email configuration verified", body); err != nil {
		log.Printf("SaveEmailConfig: verification send failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Couldn't send a test email with these credentials. Check the Access Key, Secret Key, Region, and that the From Email is verified in SES, then try again.",
		})
		return
	}

	key, err := email.DecodeKey(h.Cfg.EncryptionKey)
	if err != nil {
		log.Printf("SaveEmailConfig: decode key: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if err := email.SaveSESConfig(c.Request.Context(), h.DB, candidate, key); err != nil {
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

	cfg, err := email.LoadSESConfig(c.Request.Context(), h.DB, key)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "email config not configured"})
		return
	}
	if err != nil {
		log.Printf("GetEmailConfig: load: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load email config"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"aws_region": cfg.AWSRegion,
		// I wonder if I should even send the Access Key
		"aws_access_key_id": cfg.AWSAccessKeyID,
		"ses_from_email":    cfg.SESFromEmail,
		"ses_login_url":     cfg.SESLoginURL,
	})
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
	sesCfg, err := email.LoadSESConfig(c.Request.Context(), h.DB, key)
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
		FromEmail:   sesCfg.SESFromEmail,
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
