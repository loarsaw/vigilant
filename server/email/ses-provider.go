// server/email/ses_provider.go
//
// Replaces the Mailer type in aws_ses.go. Same SES-sending logic, now behind
// the Provider interface so the worker doesn't need to know it's talking to SES.
package email

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sesv2"
	"github.com/aws/aws-sdk-go-v2/service/sesv2/types"
)

type sesProvider struct {
	client    *sesv2.Client
	fromEmail string
}

func newSESProvider(ctx context.Context, cfg *EmailConfig) (Provider, error) {
	region := cfg.Get("aws_region")
	accessKeyID := cfg.Get("aws_access_key_id")
	secretAccessKey := cfg.Get("aws_secret_access_key")

	if region == "" || accessKeyID == "" || secretAccessKey == "" {
		return nil, fmt.Errorf("ses: missing aws_region/aws_access_key_id/aws_secret_access_key in settings")
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(region),
		awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, ""),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("ses: load aws config: %w", err)
	}

	return &sesProvider{
		client:    sesv2.NewFromConfig(awsCfg),
		fromEmail: cfg.FromEmail,
	}, nil
}

func (p *sesProvider) Name() string { return ProviderSES }

func (p *sesProvider) Send(ctx context.Context, input EmailInput) error {
	body := &types.Body{}

	if input.BodyHTML != "" {
		body.Html = &types.Content{Data: aws.String(input.BodyHTML), Charset: aws.String("UTF-8")}
	}

	textFallback := input.Body
	if textFallback == "" && input.BodyHTML != "" {
		textFallback = "This email contains HTML content. Please view it in an HTML-capable email client."
	}
	if textFallback != "" {
		body.Text = &types.Content{Data: aws.String(textFallback), Charset: aws.String("UTF-8")}
	}

	if body.Html == nil && body.Text == nil {
		return fmt.Errorf("ses: email to %s has no body content", input.ToEmail)
	}

	_, err := p.client.SendEmail(ctx, &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(p.fromEmail),
		Destination:      &types.Destination{ToAddresses: []string{input.ToEmail}},
		Content: &types.EmailContent{
			Simple: &types.Message{
				Subject: &types.Content{Data: aws.String(input.Subject), Charset: aws.String("UTF-8")},
				Body:    body,
			},
		},
	})
	if err != nil {
		return fmt.Errorf("ses: failed to send email to %s: %w", input.ToEmail, err)
	}
	return nil
}
