// server/models/config.go
package models

import "time"

// ========================================
// GOOGLE CREDENTIALS MODELS
// ========================================

type GoogleCredential struct {
	ID                  int64      `json:"id"`
	CredentialName      string     `json:"credential_name"`
	ServiceAccountEmail string     `json:"service_account_email"`
	ProjectID           string     `json:"project_id"`
	PrivateKeyID        string     `json:"private_key_id"`
	PrivateKey          string     `json:"-"`
	ClientEmail         string     `json:"client_email"`
	ClientID            string     `json:"client_id"`
	AccessToken         *string    `json:"access_token,omitempty"`
	RefreshToken        *string    `json:"refresh_token,omitempty"`
	TokenExpiry         *time.Time `json:"token_expiry,omitempty"`
	Scopes              []string   `json:"scopes"`
	CredentialsJSON     string     `json:"-"`
	CredentialType      string     `json:"credential_type"`
	IsActive            bool       `json:"is_active"`
	IsDefault           bool       `json:"is_default"`
	DelegatedAdminEmail *string    `json:"delegated_admin_email,omitempty"`
	SubjectEmail        *string    `json:"subject_email,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
	CreatedBy           *string    `json:"created_by,omitempty"`
	LastUsedAt          *time.Time `json:"last_used_at,omitempty"`
}

type ServiceAccountJSON struct {
	Type                    string `json:"type"`
	ProjectID               string `json:"project_id"`
	PrivateKeyID            string `json:"private_key_id"`
	PrivateKey              string `json:"private_key"`
	ClientEmail             string `json:"client_email"`
	ClientID                string `json:"client_id"`
	AuthURI                 string `json:"auth_uri"`
	TokenURI                string `json:"token_uri"`
	AuthProviderX509CertURL string `json:"auth_provider_x509_cert_url"`
	ClientX509CertURL       string `json:"client_x509_cert_url"`
}

// ========================================
// TWILIO / LIVEKIT MODELS
// ========================================

type TwilioConfig struct {
	AccountSID   string `json:"account_sid" binding:"required"`
	APIKeySID    string `json:"api_key_sid" binding:"required"`
	APIKeySecret string `json:"api_key_secret" binding:"required"`
	TwiMLAppSID  string `json:"twiml_app_sid" binding:"required"`
	FromNumber   string `json:"from_number" binding:"required"`
}

type LiveKitConfig struct {
	ID        int       `json:"id"`
	Host      string    `json:"host"`
	APIKey    string    `json:"api_key"`
	APISecret string    `json:"api_secret"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ========================================
// AI PROVIDER / SCENARIO MODELS
// ========================================

type AIProviderConfig struct {
	Provider  string    `json:"provider"`
	APIKey    string    `json:"api_key"`
	Model     string    `json:"model"`
	BaseURL   *string   `json:"base_url,omitempty"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AIScenario struct {
	ScenarioKey  string    `json:"scenario_key"`
	Name         string    `json:"name"`
	Description  *string   `json:"description,omitempty"`
	Provider     string    `json:"provider"`
	Model        *string   `json:"model,omitempty"`
	SystemPrompt string    `json:"system_prompt"`
	Temperature  float64   `json:"temperature"`
	MaxTokens    int       `json:"max_tokens"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
