// server/email/test_send.go
package email

import (
	"context"
	"fmt"
)

func SendTestEmail(ctx context.Context, cfg EmailConfig, toEmail, subject, bodyHTML string) error {
	provider, err := NewProvider(ctx, &cfg)
	if err != nil {
		return fmt.Errorf("build provider %q: %w", cfg.Provider, err)
	}

	if err := provider.Send(ctx, EmailInput{
		ToEmail:  toEmail,
		Subject:  subject,
		BodyHTML: bodyHTML,
	}); err != nil {
		return fmt.Errorf("%s: %w", provider.Name(), err)
	}

	return nil
}
