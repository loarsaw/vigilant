// ai/openai.go
package ai

import (
	"context"
	"fmt"

	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"

	"vigilant/models"
)

type OpenAIProvider struct {
	cfg *models.AIProviderConfig
}

func NewOpenAIProvider(cfg *models.AIProviderConfig) *OpenAIProvider {
	return &OpenAIProvider{cfg: cfg}
}

func (p *OpenAIProvider) Complete(ctx context.Context, systemPrompt, userPrompt, model string, temperature float64, maxTokens int) (string, error) {
	opts := []option.RequestOption{
		option.WithAPIKey(p.cfg.APIKey),
	}
	if p.cfg.BaseURL != nil && *p.cfg.BaseURL != "" {
		opts = append(opts, option.WithBaseURL(*p.cfg.BaseURL))
	}

	client := openai.NewClient(opts...)

	completion, err := client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Model: openai.ChatModel(model),
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage(systemPrompt),
			openai.UserMessage(userPrompt),
		},
		Temperature: openai.Float(temperature),
		MaxTokens:   openai.Int(int64(maxTokens)),
	})
	if err != nil {
		return "", fmt.Errorf("openai request failed: %w", err)
	}

	if len(completion.Choices) == 0 {
		return "", fmt.Errorf("openai returned no choices")
	}

	return completion.Choices[0].Message.Content, nil
}
