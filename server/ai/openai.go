// ai/openai.go
package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"vigilant/models"
)

type OpenAIProvider struct {
	cfg *models.AIProviderConfig
}

func NewOpenAIProvider(cfg *models.AIProviderConfig) *OpenAIProvider {
	return &OpenAIProvider{cfg: cfg}
}

func (p *OpenAIProvider) Complete(ctx context.Context, systemPrompt, userPrompt, model string, temperature float64, maxTokens int) (string, error) {
	baseURL := "https://api.openai.com/v1"
	if p.cfg.BaseURL != nil && *p.cfg.BaseURL != "" {
		baseURL = *p.cfg.BaseURL
	}

	payload := map[string]interface{}{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
		"temperature": temperature,
		"max_tokens":  maxTokens,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.cfg.APIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("openai request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("openai error (%d): %s", resp.StatusCode, string(respBody))
	}

	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("failed to parse openai response: %w", err)
	}
	if len(parsed.Choices) == 0 {
		return "", fmt.Errorf("openai returned no choices")
	}
	return parsed.Choices[0].Message.Content, nil
}
