// server/handlers/admin/boot-handler.go
package admin

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"vigilant/ai"
	"vigilant/analyzer"
	"vigilant/config"
	"vigilant/email"
	"vigilant/livekit"
	"vigilant/models"
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

// ------------------------------------------------------------------
// System readiness check
// ------------------------------------------------------------------
//
// Call h.CheckSystemReadiness once at boot, right after RunMigrations /
// InitDB succeed. It checks whether Email, LiveKit, GitHub, and AI
// Provider have been configured. If anything is missing, it raises a
// broadcast notification (admin_id = NULL, so every Super Admin/HR sees
// it) via the existing admin_notifications table. If everything is
// configured and an open "not ready" notification exists from before,
// it's auto-resolved (marked read).
//
// Re-running this on every boot won't spam duplicate notifications: it
// looks for an existing unread notification of this type first and
// updates it in place instead of inserting a new row.

const (
	systemReadinessEntityType = "system_config"
	systemReadinessEntityID   = "boot_check"
	systemReadinessNotifType  = "system_not_ready"
)

// CheckSystemReadiness inspects the config tables for each integration and,
// if anything required hasn't been saved yet, raises (or refreshes) a
// broadcast notification for Super Admins. It's a plain function (not a
// method on AdminHandlers) so it can be called from main.go right after
// db.RunMigrations, without constructing a full AdminHandlers and its
// AI/Analyzer/Notifications/LiveKit dependencies.
func CheckSystemReadiness(ctx context.Context, dbConn *sql.DB) error {
	missing, err := findMissingConfig(ctx, dbConn)
	if err != nil {
		return fmt.Errorf("system readiness check: %w", err)
	}

	openID, hasOpen, err := findOpenReadinessNotification(ctx, dbConn)
	if err != nil {
		return fmt.Errorf("system readiness check: %w", err)
	}

	// Nothing missing: resolve any stale open notification and stop.
	if len(missing) == 0 {
		if hasOpen {
			if err := resolveReadinessNotification(ctx, dbConn, openID); err != nil {
				return fmt.Errorf("system readiness check: %w", err)
			}
		}
		return nil
	}

	labels := make([]string, 0, len(missing))
	for _, m := range missing {
		labels = append(labels, m.Label)
	}
	message := fmt.Sprintf("The following integrations still need to be configured in Settings: %s.", joinWithCommas(labels))

	metadata, err := json.Marshal(gin.H{"missing": missing})
	if err != nil {
		return fmt.Errorf("system readiness check: %w", err)
	}

	if hasOpen {
		return updateReadinessNotification(ctx, dbConn, openID, message, metadata)
	}
	return insertReadinessNotification(ctx, dbConn, message, metadata)
}

// findMissingConfig checks each integration's config table and returns the
// ones that have no active row saved yet.
func findMissingConfig(ctx context.Context, dbConn *sql.DB) ([]models.MissingConfigItem, error) {
	checks := []struct {
		key, label, query string
	}{
		{"email", "Email (AWS SES)", `SELECT EXISTS(SELECT 1 FROM email_config)`},
		{"livekit", "LiveKit", `SELECT EXISTS(SELECT 1 FROM livekit_configs WHERE is_active = TRUE)`},
		{"github", "GitHub Integration", `SELECT EXISTS(SELECT 1 FROM github_credentials)`},
		{"ai_provider", "AI Provider", `SELECT EXISTS(SELECT 1 FROM ai_provider_configs WHERE is_active = TRUE)`},
	}

	var missing []models.MissingConfigItem
	for _, chk := range checks {
		var configured bool
		if err := dbConn.QueryRowContext(ctx, chk.query).Scan(&configured); err != nil {
			return nil, fmt.Errorf("checking %s config: %w", chk.key, err)
		}
		if !configured {
			missing = append(missing, models.MissingConfigItem{Key: chk.key, Label: chk.label})
		}
	}
	return missing, nil
}

// findOpenReadinessNotification returns the id of an existing unread
// "system_not_ready" broadcast notification, if any.
func findOpenReadinessNotification(ctx context.Context, dbConn *sql.DB) (id int64, found bool, err error) {
	row := dbConn.QueryRowContext(ctx, `
		SELECT id FROM admin_notifications
		WHERE type = $1 AND entity_type = $2 AND entity_id = $3 AND is_read = FALSE
		ORDER BY created_at DESC
		LIMIT 1
	`, systemReadinessNotifType, systemReadinessEntityType, systemReadinessEntityID)

	if scanErr := row.Scan(&id); scanErr != nil {
		if scanErr == sql.ErrNoRows {
			return 0, false, nil
		}
		return 0, false, scanErr
	}
	return id, true, nil
}

func insertReadinessNotification(ctx context.Context, dbConn *sql.DB, message string, metadata []byte) error {
	_, err := dbConn.ExecContext(ctx, `
		INSERT INTO admin_notifications (admin_id, type, title, message, entity_type, entity_id, metadata, severity)
		VALUES (NULL, $1, $2, $3, $4, $5, $6, 'critical')
	`, systemReadinessNotifType, "System setup incomplete", message, systemReadinessEntityType, systemReadinessEntityID, metadata)
	return err
}

func updateReadinessNotification(ctx context.Context, dbConn *sql.DB, id int64, message string, metadata []byte) error {
	_, err := dbConn.ExecContext(ctx, `
		UPDATE admin_notifications
		SET message = $1, metadata = $2, created_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`, message, metadata, id)
	return err
}

func resolveReadinessNotification(ctx context.Context, dbConn *sql.DB, id int64) error {
	_, err := dbConn.ExecContext(ctx, `
		UPDATE admin_notifications
		SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`, id)
	return err
}

func joinWithCommas(items []string) string {
	switch len(items) {
	case 0:
		return ""
	case 1:
		return items[0]
	default:
		out := items[0]
		for _, it := range items[1:] {
			out += ", " + it
		}
		return out
	}
}
