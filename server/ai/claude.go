// ai/claude.go
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

type ClaudeProvider struct {
	cfg *models.AIProviderConfig
}

func NewClaudeProvider(cfg *models.AIProviderConfig) *ClaudeProvider {
	return &ClaudeProvider{cfg: cfg}
}

func (p *ClaudeProvider) Complete(ctx context.Context, systemPrompt, userPrompt, model string, temperature float64, maxTokens int) (string, error) {
	baseURL := "https://api.anthropic.com/v1"
	if p.cfg.BaseURL != nil && *p.cfg.BaseURL != "" {
		baseURL = *p.cfg.BaseURL
	}

	payload := map[string]interface{}{
		"model":       model,
		"system":      systemPrompt,
		"max_tokens":  maxTokens,
		"temperature": temperature,
		"messages": []map[string]string{
			{"role": "user", "content": userPrompt},
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/messages", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", p.cfg.APIKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("claude request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("claude error (%d): %s", resp.StatusCode, string(respBody))
	}

	var parsed struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("failed to parse claude response: %w", err)
	}
	if len(parsed.Content) == 0 {
		return "", fmt.Errorf("claude returned no content")
	}
	return parsed.Content[0].Text, nil
}
