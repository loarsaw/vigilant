// server/ai/verify.go
package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"vigilant/models"
)

const (
	ConnectionTestTemperature = 0
	ConnectionTestMaxTokens   = 32
)

const DefaultConnectionTestSystemPrompt = `You are testing connectivity for an AI provider integration.
You MUST respond with ONLY a single valid JSON object — no markdown code fences,
no commentary before or after. The JSON object must have exactly this shape:

{
  "status": "ok"
}

Do not include any text outside the JSON object.`

const connectionTestUserPrompt = "Confirm you are online."

type connectionTestResponse struct {
	Status string `json:"status"`
}

// TestProviderConfig makes a minimal, cheap text-generation call against the
// given provider config to confirm the API key, model, and base URL actually
// work before the config is persisted. It builds the call straight from the
// input the admin just submitted — it never touches any already-saved config,
// and reuses the same client(cfg) factory GenerateDirect relies on.
func (s *Service) TestProviderConfig(ctx context.Context, input models.SaveProviderConfigInput) error {
	cfg := &models.AIProviderConfig{
		Provider: input.Provider,
		APIKey:   input.APIKey,
		Model:    input.Model,
		BaseURL:  input.BaseURL,
	}

	provider, err := s.client(cfg)
	if err != nil {
		return err
	}

	raw, err := provider.Complete(
		ctx,
		DefaultConnectionTestSystemPrompt,
		connectionTestUserPrompt,
		input.Model,
		ConnectionTestTemperature,
		ConnectionTestMaxTokens,
	)
	if err != nil {
		return fmt.Errorf("provider %q model %q did not respond: %w", input.Provider, input.Model, err)
	}

	cleaned := strings.TrimSpace(raw)
	if cleaned == "" {
		return fmt.Errorf("provider %q model %q returned an empty response", input.Provider, input.Model)
	}

	// Some models still wrap JSON in code fences despite instructions; strip
	// them defensively before parsing.
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var parsed connectionTestResponse
	if err := json.Unmarshal([]byte(cleaned), &parsed); err != nil {
		return fmt.Errorf("provider %q model %q did not return valid JSON: %w (raw: %s)", input.Provider, input.Model, err, cleaned)
	}

	if strings.ToLower(parsed.Status) != "ok" {
		return fmt.Errorf("provider %q model %q returned unexpected status %q", input.Provider, input.Model, parsed.Status)
	}

	return nil
}
