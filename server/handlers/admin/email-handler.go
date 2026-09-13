package admin

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
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
	candidateHTML, err := email.Render(email.TemplateInterviewInvite, models.InterviewInviteData{
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
	interviewerHTML, err := email.Render(email.TemplateInterviewInvite, models.InterviewInviteData{
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
