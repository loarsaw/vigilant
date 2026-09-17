// ai/service.go
package ai

import (
	"context"
	"database/sql"
	"fmt"

	"vigilant/models"
)

type Service struct {
	db *sql.DB
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}

func (s *Service) GetProviderConfig(provider string) (*models.AIProviderConfig, error) {
	var cfg models.AIProviderConfig
	var baseURL sql.NullString

	query := `
		SELECT provider, api_key, model, base_url, is_active, created_at, updated_at
		FROM ai_provider_configs
		WHERE provider = $1
	`
	err := s.db.QueryRow(query, provider).Scan(
		&cfg.Provider, &cfg.APIKey, &cfg.Model, &baseURL, &cfg.IsActive, &cfg.CreatedAt, &cfg.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("%s configuration not found", provider)
		}
		return nil, fmt.Errorf("failed to fetch %s config: %w", provider, err)
	}
	if baseURL.Valid {
		cfg.BaseURL = &baseURL.String
	}
	return &cfg, nil
}

func (s *Service) SaveProviderConfig(in models.SaveProviderConfigInput) error {
	query := `
		INSERT INTO ai_provider_configs
			(provider, api_key, model, base_url, is_active, updated_at)
		VALUES ($1, $2, $3, $4, true, now())
		ON CONFLICT (provider)
		DO UPDATE SET
			api_key    = EXCLUDED.api_key,
			model      = EXCLUDED.model,
			base_url   = EXCLUDED.base_url,
			is_active  = true,
			updated_at = now()
	`
	_, err := s.db.Exec(query, in.Provider, in.APIKey, in.Model, in.BaseURL)
	if err != nil {
		return fmt.Errorf("failed to save provider config: %w", err)
	}
	return nil
}

func (s *Service) ListProviderConfigs() ([]models.AIProviderConfig, error) {
	rows, err := s.db.Query(`
		SELECT provider, api_key, model, base_url, is_active, created_at, updated_at
		FROM ai_provider_configs ORDER BY provider
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to list provider configs: %w", err)
	}
	defer rows.Close()

	var configs []models.AIProviderConfig
	for rows.Next() {
		var cfg models.AIProviderConfig
		var baseURL sql.NullString
		if err := rows.Scan(&cfg.Provider, &cfg.APIKey, &cfg.Model, &baseURL, &cfg.IsActive, &cfg.CreatedAt, &cfg.UpdatedAt); err != nil {
			return nil, err
		}
		if baseURL.Valid {
			cfg.BaseURL = &baseURL.String
		}
		configs = append(configs, cfg)
	}
	return configs, nil
}

type Provider interface {
	Complete(ctx context.Context, systemPrompt, userPrompt, model string, temperature float64, maxTokens int) (string, error)
}

func (s *Service) client(cfg *models.AIProviderConfig) (Provider, error) {
	switch cfg.Provider {
	case "gemini":
		return NewGeminiProvider(cfg), nil
	case "openai":
		return NewOpenAIProvider(cfg), nil
	case "claude":
		return NewClaudeProvider(cfg), nil
	default:
		return nil, fmt.Errorf("unsupported provider: %s", cfg.Provider)
	}
}

var DefaultProviderPriority = []string{"claude", "gemini", "openai"}

func (s *Service) firstActiveProvider() (*models.AIProviderConfig, error) {
	var lastErr error
	for _, name := range DefaultProviderPriority {
		cfg, err := s.GetProviderConfig(name)
		if err != nil {
			lastErr = err
			continue
		}
		if cfg.IsActive {
			return cfg, nil
		}
		lastErr = fmt.Errorf("provider %s is not active", name)
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("no providers configured")
	}
	return nil, fmt.Errorf("no active AI provider found: %w", lastErr)
}

func (s *Service) GenerateDirect(ctx context.Context, systemPrompt, userPrompt string, temperature float64, maxTokens int) (string, error) {
	cfg, err := s.firstActiveProvider()
	if err != nil {
		return "", err
	}

	client, err := s.client(cfg)
	if err != nil {
		return "", err
	}

	return client.Complete(ctx, systemPrompt, userPrompt, cfg.Model, temperature, maxTokens)
}
