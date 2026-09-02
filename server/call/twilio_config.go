package call

import (
	"context"
	"database/sql"
	"fmt"
	"vigilant/email"
)

type TwilioConfig struct {
	AccountSID   string
	APIKeySID    string
	APIKeySecret string
	TwiMLAppSID  string
	FromNumber   string
}

func SaveTwilioConfig(ctx context.Context, db *sql.DB, key []byte, cfg *TwilioConfig) error {
	encSecret, err := email.Encrypt(cfg.APIKeySecret, key)

	if err != nil {
		return fmt.Errorf("failed to encrypt api key secret: %w", err)
	}

	_, err = db.ExecContext(ctx, `
        INSERT INTO twilio_config (account_sid, api_key_sid, api_key_secret, twiml_app_sid, from_number, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (id) DO UPDATE SET
            account_sid   = EXCLUDED.account_sid,
            api_key_sid   = EXCLUDED.api_key_sid,
            api_key_secret = EXCLUDED.api_key_secret,
            twiml_app_sid = EXCLUDED.twiml_app_sid,
            from_number   = EXCLUDED.from_number,
            updated_at    = NOW()
    `, cfg.AccountSID, cfg.APIKeySID, encSecret, cfg.TwiMLAppSID, cfg.FromNumber)
	return err
}

func LoadTwilioConfig(ctx context.Context, db *sql.DB, key []byte) (*TwilioConfig, error) {
	var cfg TwilioConfig
	var encSecret string

	err := db.QueryRowContext(ctx, `
        SELECT account_sid, api_key_sid, api_key_secret, twiml_app_sid, from_number
        FROM twilio_config
        ORDER BY id DESC LIMIT 1
    `).Scan(&cfg.AccountSID, &cfg.APIKeySID, &encSecret, &cfg.TwiMLAppSID, &cfg.FromNumber)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("twilio not configured")
	}
	if err != nil {
		return nil, err
	}

	cfg.APIKeySecret, err = email.Decrypt(encSecret, key)

	if err != nil {
		return nil, fmt.Errorf("failed to decrypt api key secret: %w", err)
	}

	return &cfg, nil
}
