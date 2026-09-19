// server/email/provider.go
package email

import (
	"context"
	"fmt"
)

type EmailInput struct {
	ToEmail  string
	Subject  string
	Body     string
	BodyHTML string
}

type Provider interface {
	Send(ctx context.Context, input EmailInput) error

	Name() string
}

type SendResult struct {
	Email   string
	Success bool
	Error   string
}

func SendBulk(ctx context.Context, p Provider, inputs []EmailInput) []SendResult {
	results := make([]SendResult, 0, len(inputs))
	for _, input := range inputs {
		if err := p.Send(ctx, input); err != nil {
			results = append(results, SendResult{Email: input.ToEmail, Success: false, Error: err.Error()})
		} else {
			results = append(results, SendResult{Email: input.ToEmail, Success: true})
		}
	}
	return results
}

// Provider identifiers stored in email_config.provider and used in the switch below.
const (
	ProviderSES      = "ses"
	ProviderSendGrid = "sendgrid"
	ProviderResend   = "resend"
)

// NewProvider builds the configured Provider from an EmailConfig loaded from the DB.
// This is the single place that knows about every concrete provider implementation.
func NewProvider(ctx context.Context, cfg *EmailConfig) (Provider, error) {
	switch cfg.Provider {
	case ProviderSES:
		return newSESProvider(ctx, cfg)
	case ProviderSendGrid:
		return newSendGridProvider(cfg)
	case ProviderResend:
		return newResendProvider(cfg)
	default:
		return nil, fmt.Errorf("email: unknown provider %q", cfg.Provider)
	}
}
