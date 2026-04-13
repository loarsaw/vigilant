package admin

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strings"
	"vigilant/email"
	"vigilant/models"

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
	c.JSON(http.StatusOK, gin.H{
		"aws_region": cfg.AWSRegion,
		// I wonder if I should even send the Access Key
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

func (h *AdminHandlers) SendInterviewInvite(c *gin.Context) {
	var req struct {
		CandidateName    string `json:"candidate_name" binding:"required"`
		CandidateEmail   string `json:"candidate_email" binding:"required,email"`
		InterviewerEmail string `json:"interviewer_email" binding:"required,email"`
		Position         string `json:"position" binding:"required"`
		// InterviewType    string `json:"interview_type" binding:"required"`
		ScheduledAt string `json:"scheduled_at" binding:"required"`
		Duration    int    `json:"duration_minutes" binding:"required"`
		MeetLink    string `json:"meet_link"`
		EntityID    string `json:"entity_id"`
	}

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

	// Render template for candidate
	candidateHTML, err := email.Render(email.TemplateInterviewInvite, email.InterviewInviteData{
		CandidateName:    req.CandidateName,
		InterviewerEmail: req.InterviewerEmail,
		Position:         req.Position,
		// InterviewType:    req.InterviewType,
		ScheduledAt: req.ScheduledAt,
		Duration:    req.Duration,
		MeetLink:    req.MeetLink,
	})
	if err != nil {
		log.Printf("SendInterviewInvite: render candidate template: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to render email"})
		return
	}

	// Render template for interviewer
	interviewerHTML, err := email.Render(email.TemplateInterviewInvite, email.InterviewInviteData{
		CandidateName:    req.CandidateName,
		InterviewerEmail: req.InterviewerEmail,
		Position:         req.Position,
		// InterviewType:    req.InterviewType,
		ScheduledAt: req.ScheduledAt,
		Duration:    req.Duration,
		MeetLink:    req.MeetLink,
	})
	if err != nil {
		log.Printf("SendInterviewInvite: render interviewer template: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to render email"})
		return
	}

	ctx := c.Request.Context()

	// Enqueue email to candidate
	_, err = email.Enqueue(ctx, h.DB, email.EmailJob{
		ToEmail:     req.CandidateEmail,
		ToName:      req.CandidateName,
		FromEmail:   sesCfg.SESFromEmail,
		Subject:     fmt.Sprintf("Interview Scheduled: %s", req.Position),
		BodyHTML:    candidateHTML,
		Template:    email.TemplateInterviewInvite,
		EntityType:  "interview_session",
		EntityID:    req.EntityID,
		TriggeredBy: "send_interview_invite",
		Priority:    email.PriorityHigh,
	})
	if err != nil {
		log.Printf("SendInterviewInvite: enqueue candidate email: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to queue candidate email"})
		return
	}

	// Enqueue email to interviewer
	_, err = email.Enqueue(ctx, h.DB, email.EmailJob{
		ToEmail:     req.InterviewerEmail,
		FromEmail:   sesCfg.SESFromEmail,
		Subject:     fmt.Sprintf("Interview Scheduled: %s with %s", req.Position, req.CandidateName),
		BodyHTML:    interviewerHTML,
		Template:    email.TemplateInterviewInvite,
		EntityType:  "interview_session",
		EntityID:    req.EntityID,
		TriggeredBy: "send_interview_invite",
		Priority:    email.PriorityHigh,
	})
	if err != nil {
		log.Printf("SendInterviewInvite: enqueue interviewer email: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to queue interviewer email"})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"message":    "interview invites queued",
		"recipients": []string{req.CandidateEmail, req.InterviewerEmail},
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

	body, err := email.Render(email.TemplateCustomMessage, email.CustomMessageData{
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

func (h *AdminHandlers) SendCandidateCredentialsEmail(c *gin.Context) {
	var req models.CreateCandidateRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"details": err.Error(),
		})
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

	bodyHTML, err := email.Render(email.TemplateCandidateCredentials, email.CandidateCredentialsData{
		CandidateName: req.FullName,
		Email:         req.Email,
		Password:      req.Password,
		LoginURL:      sesCfg.SESLoginURL,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to render email"})
		return
	}

	jobID, err := email.Enqueue(c.Request.Context(), h.DB, email.EmailJob{
		ToEmail:     req.Email,
		ToName:      req.FullName,
		FromEmail:   sesCfg.SESFromEmail,
		Subject:     "Your Account Credentials",
		BodyHTML:    bodyHTML,
		Template:    email.TemplateCandidateCredentials,
		EntityType:  "candidate",
		TriggeredBy: "send_credentials",
		Priority:    email.PriorityHigh,
	})
	if err != nil {
		log.Printf("SendCandidateCredentialsEmail: enqueue: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to queue email"})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"message": "credentials email queued",
		"job_id":  jobID,
	})
}
