// server/ai/gemini.go
package ai

import (
	"context"
	"fmt"
	"time"

	"vigilant/models"

	"google.golang.org/genai"
)

const geminiRequestTimeout = 90 * time.Second

type GeminiProvider struct {
	cfg *models.AIProviderConfig
}

func NewGeminiProvider(cfg *models.AIProviderConfig) *GeminiProvider {
	return &GeminiProvider{cfg: cfg}
}

func (p *GeminiProvider) Complete(ctx context.Context, systemPrompt, userPrompt, model string, temperature float64, maxTokens int) (string, error) {

	genCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), geminiRequestTimeout)
	defer cancel()

	clientConfig := &genai.ClientConfig{
		APIKey:  p.cfg.APIKey,
		Backend: genai.BackendGeminiAPI,
	}
	if p.cfg.BaseURL != nil && *p.cfg.BaseURL != "" {
		clientConfig.HTTPOptions = genai.HTTPOptions{BaseURL: *p.cfg.BaseURL}
	}

	client, err := genai.NewClient(genCtx, clientConfig)
	if err != nil {

		return "", fmt.Errorf("failed to create gemini client: %w", err)
	}

	genConfig := &genai.GenerateContentConfig{
		Temperature:     genai.Ptr(float32(temperature)),
		MaxOutputTokens: int32(maxTokens),
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{{Text: systemPrompt}},
		},
	}

	result, err := client.Models.GenerateContent(genCtx, model, genai.Text(userPrompt), genConfig)
	if err != nil {
		return "", fmt.Errorf("gemini request failed: %w", err)
	}

	text := result.Text()
	if text == "" {
		return "", fmt.Errorf("gemini returned no content")
	}
	return text, nil
}
