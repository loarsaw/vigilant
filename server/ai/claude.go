// ai/claude.go
package ai

import (
	"context"
	"fmt"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"

	"vigilant/models"
)

type ClaudeProvider struct {
	cfg *models.AIProviderConfig
}

func NewClaudeProvider(cfg *models.AIProviderConfig) *ClaudeProvider {
	return &ClaudeProvider{cfg: cfg}
}

func (p *ClaudeProvider) Complete(ctx context.Context, systemPrompt, userPrompt, model string, temperature float64, maxTokens int) (string, error) {
	opts := []option.RequestOption{
		option.WithAPIKey(p.cfg.APIKey),
	}
	if p.cfg.BaseURL != nil && *p.cfg.BaseURL != "" {
		opts = append(opts, option.WithBaseURL(*p.cfg.BaseURL))
	}

	client := anthropic.NewClient(opts...)

	message, err := client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:       anthropic.Model(model),
		MaxTokens:   int64(maxTokens),
		Temperature: anthropic.Float(temperature),
		System: []anthropic.TextBlockParam{
			{Text: systemPrompt},
		},
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(anthropic.NewTextBlock(userPrompt)),
		},
	})
	if err != nil {
		return "", fmt.Errorf("claude request failed: %w", err)
	}

	if len(message.Content) == 0 {
		return "", fmt.Errorf("claude returned no content")
	}

	for _, block := range message.Content {
		if block.Type == "text" {
			return block.Text, nil
		}
	}

	return "", fmt.Errorf("claude returned no text content")
}
