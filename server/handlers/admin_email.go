package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strings"
	"vigilant/email"

	"github.com/gin-gonic/gin"
)

type SESConfigRequest struct {
	AWSRegion          string `json:"aws_region"`
	AWSAccessKeyID     string `json:"aws_access_key_id"`
	AWSSecretAccessKey string `json:"aws_secret_access_key"`
	SESFromEmail       string `json:"ses_from_email"`
	SESLoginURL        string `json:"ses_login_url"`
}

type SendEmailRequest struct {
	Recipients []struct {
		FullName string `json:"full_name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	} `json:"recipients"`
}

func (h *AdminHandlers) SaveEmailConfig(c *gin.Context) {
	var req SESConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if req.AWSRegion == "" || req.AWSAccessKeyID == "" || req.AWSSecretAccessKey == "" || req.SESFromEmail == "" || req.SESLoginURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "all fields are required"})
		return
	}

	key, err := email.DecodeKey(h.Cfg.EncryptionKey)
	if err != nil {
		log.Printf("SaveEmailConfig: decode key: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if err := email.SaveSESConfig(c.Request.Context(), h.DB, email.SESConfig{
		AWSRegion:          req.AWSRegion,
		AWSAccessKeyID:     req.AWSAccessKeyID,
		AWSSecretAccessKey: req.AWSSecretAccessKey,
		SESFromEmail:       req.SESFromEmail,
		SESLoginURL:        req.SESLoginURL,
	}, key); err != nil {
		log.Printf("SaveEmailConfig: save: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save email config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "email config saved"})
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

	// aws_secret_access_key is intentionally omitted
	c.JSON(http.StatusOK, gin.H{
		"aws_region":        cfg.AWSRegion,
		"aws_access_key_id": cfg.AWSAccessKeyID,
		"ses_from_email":    cfg.SESFromEmail,
		"ses_login_url":     cfg.SESLoginURL,
	})
}

func (h *AdminHandlers) SendCredentialsEmail(c *gin.Context) {
	var req SendEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if len(req.Recipients) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no recipients provided"})
		return
	}

	mailer, sesCfg, err := h.loadMailer(c)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email config not configured"})
		return
	}
	if err != nil {
		log.Printf("SendCredentialsEmail: load mailer: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to initialize mailer"})
		return
	}

	for i, r := range req.Recipients {
		r.Email = strings.ToLower(strings.TrimSpace(r.Email))
		if r.Email == "" || r.Password == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "email and password are required for each recipient",
				"index": i,
			})
			return
		}
	}

	candidates := make([]email.CandidateEmailData, 0, len(req.Recipients))
	for _, r := range req.Recipients {
		candidates = append(candidates, email.CandidateEmailData{
			FullName: r.FullName,
			Email:    strings.ToLower(strings.TrimSpace(r.Email)),
			Password: r.Password,
		})
	}

	results := mailer.SendBulk(c.Request.Context(), email.BuildBulkCredentialsEmails(candidates, sesCfg.SESLoginURL))

	succeeded, failed := 0, 0
	var failures []gin.H
	for _, r := range results {
		if r.Success {
			succeeded++
		} else {
			failed++
			failures = append(failures, gin.H{"email": r.Email, "error": r.Error})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"sent":     succeeded,
		"failed":   failed,
		"failures": failures,
	})
}