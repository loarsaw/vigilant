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

type SaveProviderConfigInput struct {
	Provider string
	APIKey   string
	Model    string
	BaseURL  *string
}

func (s *Service) SaveProviderConfig(in SaveProviderConfigInput) error {
	if in.Provider != "openai" && in.Provider != "gemini" && in.Provider != "claude" {
		return fmt.Errorf("unsupported provider: %s", in.Provider)
	}

	query := `
		INSERT INTO ai_provider_configs (provider, api_key, model, base_url, is_active, updated_at)
		VALUES ($1, $2, $3, $4, true, now())
		ON CONFLICT (provider)
		DO UPDATE SET
			api_key = EXCLUDED.api_key,
			model = EXCLUDED.model,
			base_url = EXCLUDED.base_url,
			is_active = true,
			updated_at = now()
	`
	_, err := s.db.Exec(query, in.Provider, in.APIKey, in.Model, in.BaseURL)
	if err != nil {
		return fmt.Errorf("failed to save %s config: %w", in.Provider, err)
	}
	return nil
}

func (s *Service) GetScenario(key string) (*models.AIScenario, error) {
	var sc models.AIScenario
	var description, model sql.NullString

	query := `
		SELECT scenario_key, name, description, provider, model, system_prompt,
		       temperature, max_tokens, is_active, created_at, updated_at
		FROM ai_scenarios
		WHERE scenario_key = $1
	`
	err := s.db.QueryRow(query, key).Scan(
		&sc.ScenarioKey, &sc.Name, &description, &sc.Provider, &model, &sc.SystemPrompt,
		&sc.Temperature, &sc.MaxTokens, &sc.IsActive, &sc.CreatedAt, &sc.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("scenario %s not found", key)
		}
		return nil, fmt.Errorf("failed to fetch scenario: %w", err)
	}
	if description.Valid {
		sc.Description = &description.String
	}
	if model.Valid {
		sc.Model = &model.String
	}
	return &sc, nil
}

func (s *Service) ListScenarios() ([]models.AIScenario, error) {
	rows, err := s.db.Query(`
		SELECT scenario_key, name, description, provider, model, system_prompt,
		       temperature, max_tokens, is_active, created_at, updated_at
		FROM ai_scenarios ORDER BY scenario_key
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to list scenarios: %w", err)
	}
	defer rows.Close()

	var scenarios []models.AIScenario
	for rows.Next() {
		var sc models.AIScenario
		var description, model sql.NullString
		if err := rows.Scan(
			&sc.ScenarioKey, &sc.Name, &description, &sc.Provider, &model, &sc.SystemPrompt,
			&sc.Temperature, &sc.MaxTokens, &sc.IsActive, &sc.CreatedAt, &sc.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if description.Valid {
			sc.Description = &description.String
		}
		if model.Valid {
			sc.Model = &model.String
		}
		scenarios = append(scenarios, sc)
	}
	return scenarios, nil
}

type SaveScenarioInput struct {
	ScenarioKey  string
	Name         string
	Description  *string
	Provider     string
	Model        *string
	SystemPrompt string
	Temperature  float64
	MaxTokens    int
}

func (s *Service) SaveScenario(in SaveScenarioInput) error {
	query := `
		INSERT INTO ai_scenarios
			(scenario_key, name, description, provider, model, system_prompt, temperature, max_tokens, is_active, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, now())
		ON CONFLICT (scenario_key)
		DO UPDATE SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			provider = EXCLUDED.provider,
			model = EXCLUDED.model,
			system_prompt = EXCLUDED.system_prompt,
			temperature = EXCLUDED.temperature,
			max_tokens = EXCLUDED.max_tokens,
			is_active = true,
			updated_at = now()
	`
	_, err := s.db.Exec(query,
		in.ScenarioKey, in.Name, in.Description, in.Provider, in.Model,
		in.SystemPrompt, in.Temperature, in.MaxTokens,
	)
	if err != nil {
		return fmt.Errorf("failed to save scenario: %w", err)
	}
	return nil
}

func (s *Service) DeactivateScenario(key string) error {
	_, err := s.db.Exec(`UPDATE ai_scenarios SET is_active = false, updated_at = now() WHERE scenario_key = $1`, key)
	return err
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

func (s *Service) Generate(ctx context.Context, scenarioKey, userPrompt string) (string, error) {
	scenario, err := s.GetScenario(scenarioKey)
	if err != nil {
		return "", err
	}
	if !scenario.IsActive {
		return "", fmt.Errorf("scenario %s is not active", scenarioKey)
	}

	cfg, err := s.GetProviderConfig(scenario.Provider)
	if err != nil {
		return "", err
	}
	if !cfg.IsActive {
		return "", fmt.Errorf("provider %s is not active", cfg.Provider)
	}

	model := cfg.Model
	if scenario.Model != nil && *scenario.Model != "" {
		model = *scenario.Model
	}

	client, err := s.client(cfg)
	if err != nil {
		return "", err
	}

	return client.Complete(ctx, scenario.SystemPrompt, userPrompt, model, scenario.Temperature, scenario.MaxTokens)
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
