// server/handlers/admin/slack-handler.go
package admin

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"vigilant/audit"
	"vigilant/slack"

	"github.com/gin-gonic/gin"
)

type saveSlackConfigRequest struct {
	// Omit (or send empty) to keep the stored webhook and only change toggles.
	WebhookURL         *string `json:"webhook_url"`
	NotifyShortlisted  *bool   `json:"notify_shortlisted"`
	NotifyHired        *bool   `json:"notify_hired"`
	DailyDigestEnabled *bool   `json:"daily_digest_enabled"`
	DailyDigestHour    *int    `json:"daily_digest_hour"`
	Timezone           *string `json:"timezone"`
}

type testSlackRequest struct {
	Kind       string `json:"kind"`        // "ping" (default) | "digest"
	WebhookURL string `json:"webhook_url"` // optional: test a pasted URL before saving
}

// Only HR and super admins may manage integrations; interviewers may not.
func requireSlackManager(c *gin.Context) bool {
	switch c.GetString("admin_role") {
	case "hr", "superadmin":
		return true
	}
	c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: only HR or super admins can manage Slack settings"})
	return false
}

func slackSettingsJSON(st *slack.Settings) gin.H {
	if !st.Configured {
		return gin.H{"configured": false}
	}
	out := gin.H{
		"configured":           true,
		"webhook_url_masked":   slack.MaskWebhookURL(st.WebhookURL),
		"notify_shortlisted":   st.NotifyShortlisted,
		"notify_hired":         st.NotifyHired,
		"daily_digest_enabled": st.DigestEnabled,
		"daily_digest_hour":    st.DigestHour,
		"timezone":             st.Timezone,
		"updated_at":           st.UpdatedAt,
		"last_success_at":      st.LastSuccessAt,
		"last_error":           nil,
		"last_error_at":        st.LastErrorAt,
	}
	if st.LastError != "" {
		out["last_error"] = st.LastError
	}
	return out
}

func (h *AdminHandlers) GetSlackConfig(c *gin.Context) {
	if !requireSlackManager(c) {
		return
	}
	st, err := h.Slack.LoadSettings(c.Request.Context())
	if err != nil {
		log.Printf("Error loading slack config: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load slack config"})
		return
	}
	c.JSON(http.StatusOK, slackSettingsJSON(st))
}

func (h *AdminHandlers) SaveSlackConfig(c *gin.Context) {
	if !requireSlackManager(c) {
		return
	}
	var req saveSlackConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "validation failed", "details": err.Error()})
		return
	}

	st, err := h.Slack.Save(c.Request.Context(), slack.SaveInput{
		WebhookURL:        req.WebhookURL,
		NotifyShortlisted: req.NotifyShortlisted,
		NotifyHired:       req.NotifyHired,
		DigestEnabled:     req.DailyDigestEnabled,
		DigestHour:        req.DailyDigestHour,
		Timezone:          req.Timezone,
	}, c.GetString("admin_id"))
	if err != nil {
		var ve slack.ValidationError
		if errors.As(err, &ve) {
			c.JSON(http.StatusBadRequest, gin.H{"error": ve.Error()})
			return
		}
		log.Printf("Error saving slack config: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save slack config"})
		return
	}

	// Never put the webhook URL in the audit log: it is a bearer secret.
	audit.LogAdminAction(h.DB, c.GetString("admin_id"), "update_slack_config", "slack_settings", "1",
		"Admin updated Slack integration settings",
		map[string]interface{}{
			"admin_email":        c.GetString("user_email"),
			"webhook_changed":    req.WebhookURL != nil && *req.WebhookURL != "",
			"notify_shortlisted": st.NotifyShortlisted,
			"notify_hired":       st.NotifyHired,
			"daily_digest":       st.DigestEnabled,
			"digest_hour":        st.DigestHour,
			"timezone":           st.Timezone,
		}, c.ClientIP(), c.Request.UserAgent())

	c.JSON(http.StatusOK, slackSettingsJSON(st))
}

func (h *AdminHandlers) DeleteSlackConfig(c *gin.Context) {
	if !requireSlackManager(c) {
		return
	}
	if err := h.Slack.Delete(c.Request.Context()); err != nil {
		log.Printf("Error deleting slack config: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to disconnect slack"})
		return
	}
	audit.LogAdminAction(h.DB, c.GetString("admin_id"), "delete_slack_config", "slack_settings", "1",
		"Admin disconnected the Slack integration",
		map[string]interface{}{"admin_email": c.GetString("user_email")},
		c.ClientIP(), c.Request.UserAgent())
	c.JSON(http.StatusOK, gin.H{"message": "slack disconnected"})
}

// TestSlack sends synchronously so the admin sees Slack's real answer.
func (h *AdminHandlers) TestSlack(c *gin.Context) {
	if !requireSlackManager(c) {
		return
	}
	var req testSlackRequest
	_ = c.ShouldBindJSON(&req) // body is optional

	ctx, cancel := context.WithTimeout(c.Request.Context(), 25*time.Second)
	defer cancel()

	var err error
	switch req.Kind {
	case "", "ping":
		if req.WebhookURL != "" {
			if verr := slack.ValidateWebhookURL(req.WebhookURL); verr != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": verr.Error()})
				return
			}
		}
		err = h.Slack.SendTest(ctx, req.WebhookURL)
	case "digest":
		err = h.Slack.SendDigestNow(ctx)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": `kind must be "ping" or "digest"`})
		return
	}

	if err != nil {
		var ve slack.ValidationError
		if errors.As(err, &ve) {
			c.JSON(http.StatusBadRequest, gin.H{"error": ve.Error()})
			return
		}
		var se *slack.SendError
		if errors.As(err, &se) {
			c.JSON(http.StatusBadGateway, gin.H{"error": "slack delivery failed", "details": se.UserMessage()})
			return
		}
		log.Printf("Error sending slack test: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send test message"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "test message sent"})
}
