// server/email/config.go
package email

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

// Settings keys are provider-specific:
//
//	ses:       aws_region, aws_access_key_id, aws_secret_access_key
//	sendgrid:  api_key
type EmailConfig struct {
	Provider  string
	FromEmail string
	LoginURL  string
	Settings  map[string]string
}

func (c *EmailConfig) Get(key string) string {
	if c == nil || c.Settings == nil {
		return ""
	}
	return c.Settings[key]
}

// SaveEmailConfig encrypts the provider settings and upserts the single config row.
func SaveEmailConfig(ctx context.Context, db *sql.DB, cfg EmailConfig, encryptionKey []byte) error {
	settingsJSON, err := json.Marshal(cfg.Settings)
	if err != nil {
		return fmt.Errorf("marshal provider settings: %w", err)
	}

	encryptedSettings, err := Encrypt(string(settingsJSON), encryptionKey)
	if err != nil {
		return fmt.Errorf("encrypt provider settings: %w", err)
	}

	_, err = db.ExecContext(ctx, `
		INSERT INTO email_config (
			id, provider, from_email, login_url, settings_encrypted, created_at, updated_at
		)
		VALUES (1, $1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (id) DO UPDATE SET
			provider           = EXCLUDED.provider,
			from_email         = EXCLUDED.from_email,
			login_url          = EXCLUDED.login_url,
			settings_encrypted = EXCLUDED.settings_encrypted,
			updated_at         = NOW()
	`, cfg.Provider, cfg.FromEmail, cfg.LoginURL, encryptedSettings)

	return err
}

func LoadEmailConfig(ctx context.Context, db *sql.DB, encryptionKey []byte) (*EmailConfig, error) {
	var (
		provider          string
		fromEmail         string
		loginURL          string
		encryptedSettings string
	)

	err := db.QueryRowContext(ctx, `
		SELECT provider, from_email, login_url, settings_encrypted
		FROM email_config WHERE id = 1
	`).Scan(&provider, &fromEmail, &loginURL, &encryptedSettings)
	if err != nil {
		return nil, err
	}

	settingsJSON, err := Decrypt(encryptedSettings, encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("decrypt provider settings: %w", err)
	}

	var settings map[string]string
	if err := json.Unmarshal([]byte(settingsJSON), &settings); err != nil {
		return nil, fmt.Errorf("unmarshal provider settings: %w", err)
	}

	return &EmailConfig{
		Provider:  provider,
		FromEmail: fromEmail,
		LoginURL:  loginURL,
		Settings:  settings,
	}, nil
}
