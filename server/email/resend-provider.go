// server/email/resend_provider.go
package email

import (
	"context"
	"fmt"

	"github.com/resend/resend-go/v2"
)

type resendProvider struct {
	client    *resend.Client
	fromEmail string
}

func newResendProvider(cfg *EmailConfig) (Provider, error) {
	apiKey := cfg.Get("api_key")
	if apiKey == "" {
		return nil, fmt.Errorf("resend: missing api_key in settings")
	}
	return &resendProvider{
		client:    resend.NewClient(apiKey),
		fromEmail: cfg.FromEmail,
	}, nil
}

func (p *resendProvider) Name() string { return ProviderResend }

func (p *resendProvider) Send(ctx context.Context, input EmailInput) error {
	if input.Body == "" && input.BodyHTML == "" {
		return fmt.Errorf("resend: email to %s has no body content", input.ToEmail)
	}

	req := &resend.SendEmailRequest{
		From:    p.fromEmail,
		To:      []string{input.ToEmail},
		Subject: input.Subject,
		Html:    input.BodyHTML,
		Text:    input.Body,
	}

	_, err := p.client.Emails.SendWithContext(ctx, req)
	if err != nil {
		return fmt.Errorf("resend: failed to send email to %s: %w", input.ToEmail, err)
	}
	return nil
}
