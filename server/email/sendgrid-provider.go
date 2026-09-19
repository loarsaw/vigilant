// server/email/sendgrid_provider.go
package email

import (
	"context"
	"fmt"

	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

type sendGridProvider struct {
	client    *sendgrid.Client
	fromEmail string
}

func newSendGridProvider(cfg *EmailConfig) (Provider, error) {
	apiKey := cfg.Get("api_key")
	if apiKey == "" {
		return nil, fmt.Errorf("sendgrid: missing api_key in settings")
	}
	return &sendGridProvider{
		client:    sendgrid.NewSendClient(apiKey),
		fromEmail: cfg.FromEmail,
	}, nil
}

func (p *sendGridProvider) Name() string { return ProviderSendGrid }

func (p *sendGridProvider) Send(ctx context.Context, input EmailInput) error {
	from := mail.NewEmail("", p.fromEmail)
	to := mail.NewEmail("", input.ToEmail)

	plainText := input.Body
	htmlContent := input.BodyHTML
	if plainText == "" && htmlContent == "" {
		return fmt.Errorf("sendgrid: email to %s has no body content", input.ToEmail)
	}
	if plainText == "" {
		plainText = "This email contains HTML content. Please view it in an HTML-capable email client."
	}

	message := mail.NewSingleEmail(from, input.Subject, to, plainText, htmlContent)

	resp, err := p.client.SendWithContext(ctx, message)
	if err != nil {
		return fmt.Errorf("sendgrid: failed to send email to %s: %w", input.ToEmail, err)
	}
	if resp.StatusCode >= 300 {
		return fmt.Errorf("sendgrid: failed to send email to %s: status %d: %s", input.ToEmail, resp.StatusCode, resp.Body)
	}
	return nil
}
