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

type Mailer struct {
	client    *sesv2.Client
	fromEmail string
}

func NewMailerFromConfig(ctx context.Context, cfg *SESConfig) (*Mailer, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(cfg.AWSRegion),
		awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(cfg.AWSAccessKeyID, cfg.AWSSecretAccessKey, ""),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	return &Mailer{
		client:    sesv2.NewFromConfig(awsCfg),
		fromEmail: cfg.SESFromEmail,
	}, nil
}

type EmailInput struct {
	ToEmail string
	Subject string
	Body    string
}

func (m *Mailer) Send(ctx context.Context, input EmailInput) error {
	_, err := m.client.SendEmail(ctx, &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(m.fromEmail),
		Destination: &types.Destination{
			ToAddresses: []string{input.ToEmail},
		},
		Content: &types.EmailContent{
			Simple: &types.Message{
				Subject: &types.Content{
					Data:    aws.String(input.Subject),
					Charset: aws.String("UTF-8"),
				},
				Body: &types.Body{
					Text: &types.Content{
						Data:    aws.String(input.Body),
						Charset: aws.String("UTF-8"),
					},
				},
			},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to send email to %s: %w", input.ToEmail, err)
	}

	return nil
}

type SendResult struct {
	Email   string
	Success bool
	Error   string
}

func (m *Mailer) SendBulk(ctx context.Context, inputs []EmailInput) []SendResult {
	results := make([]SendResult, 0, len(inputs))
	for _, input := range inputs {
		err := m.Send(ctx, input)
		if err != nil {
			results = append(results, SendResult{Email: input.ToEmail, Success: false, Error: err.Error()})
		} else {
			results = append(results, SendResult{Email: input.ToEmail, Success: true})
		}
	}
	return results
}

func BuildCredentialsEmail(fullName, toEmail, password, loginURL string) EmailInput {
	body := fmt.Sprintf(
		"Hi %s,\n\nYour account has been created. Here are your login credentials:\n\nEmail: %s\nPassword: %s\n\nLogin here: %s\n\nPlease change your password after your first login.\n\nRegards,\nThe Team",
		fullName, toEmail, password, loginURL,
	)
	return EmailInput{
		ToEmail: toEmail,
		Subject: "Your Account Credentials",
		Body:    body,
	}
}

type CandidateEmailData struct {
	FullName string
	Email    string
	Password string
}

func BuildBulkCredentialsEmails(candidates []CandidateEmailData, loginURL string) []EmailInput {
	inputs := make([]EmailInput, 0, len(candidates))
	for _, c := range candidates {
		inputs = append(inputs, BuildCredentialsEmail(c.FullName, c.Email, c.Password, loginURL))
	}
	return inputs
}
