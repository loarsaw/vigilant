package email

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// SESConfig holds the decrypted SES credentials.
type SESConfig struct {
	AWSRegion           string
	AWSAccessKeyID      string
	AWSSecretAccessKey  string
	SESFromEmail        string
	SESLoginURL         string
}

// SaveSESConfig encrypts and upserts SES credentials into the email_config table.
// Only one row ever exists — it is replaced on each save.
func SaveSESConfig(ctx context.Context, db *sql.DB, cfg SESConfig, encryptionKey []byte) error {
	encrypt := func(val string) (string, error) {
		return Encrypt(val, encryptionKey)
	}

	region, err := encrypt(cfg.AWSRegion)
	if err != nil {
		return fmt.Errorf("encrypt region: %w", err)
	}
	keyID, err := encrypt(cfg.AWSAccessKeyID)
	if err != nil {
		return fmt.Errorf("encrypt access key id: %w", err)
	}
	secret, err := encrypt(cfg.AWSSecretAccessKey)
	if err != nil {
		return fmt.Errorf("encrypt secret: %w", err)
	}
	fromEmail, err := encrypt(cfg.SESFromEmail)
	if err != nil {
		return fmt.Errorf("encrypt from email: %w", err)
	}
	loginURL, err := encrypt(cfg.SESLoginURL)
	if err != nil {
		return fmt.Errorf("encrypt login url: %w", err)
	}

	_, err = db.ExecContext(ctx, `
		INSERT INTO email_config (
			id, aws_region, aws_access_key_id, aws_secret_access_key,
			ses_from_email, ses_login_url, created_at, updated_at
		)
		VALUES (1, $1, $2, $3, $4, $5, NOW(), NOW())
		ON CONFLICT (id) DO UPDATE SET
			aws_region            = EXCLUDED.aws_region,
			aws_access_key_id     = EXCLUDED.aws_access_key_id,
			aws_secret_access_key = EXCLUDED.aws_secret_access_key,
			ses_from_email        = EXCLUDED.ses_from_email,
			ses_login_url         = EXCLUDED.ses_login_url,
			updated_at            = NOW()
	`, region, keyID, secret, fromEmail, loginURL)

	return err
}

// LoadSESConfig reads and decrypts SES credentials from the email_config table.
// Returns sql.ErrNoRows if credentials have not been configured yet.
func LoadSESConfig(ctx context.Context, db *sql.DB, encryptionKey []byte) (*SESConfig, error) {
	var (
		region    string
		keyID     string
		secret    string
		fromEmail string
		loginURL  string
		_         time.Time // created_at — not needed
	)

	err := db.QueryRowContext(ctx, `
		SELECT aws_region, aws_access_key_id, aws_secret_access_key,
		       ses_from_email, ses_login_url
		FROM email_config WHERE id = 1
	`).Scan(&region, &keyID, &secret, &fromEmail, &loginURL)
	if err != nil {
		return nil, err // caller checks for sql.ErrNoRows
	}

	decrypt := func(val string) (string, error) {
		return Decrypt(val, encryptionKey)
	}

	decRegion, err := decrypt(region)
	if err != nil {
		return nil, fmt.Errorf("decrypt region: %w", err)
	}
	decKeyID, err := decrypt(keyID)
	if err != nil {
		return nil, fmt.Errorf("decrypt access key id: %w", err)
	}
	decSecret, err := decrypt(secret)
	if err != nil {
		return nil, fmt.Errorf("decrypt secret: %w", err)
	}
	decFromEmail, err := decrypt(fromEmail)
	if err != nil {
		return nil, fmt.Errorf("decrypt from email: %w", err)
	}
	decLoginURL, err := decrypt(loginURL)
	if err != nil {
		return nil, fmt.Errorf("decrypt login url: %w", err)
	}

	return &SESConfig{
		AWSRegion:          decRegion,
		AWSAccessKeyID:     decKeyID,
		AWSSecretAccessKey: decSecret,
		SESFromEmail:       decFromEmail,
		SESLoginURL:        decLoginURL,
	}, nil
}
