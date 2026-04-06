package utils

import (
	"context"
	"database/sql"
	"vigilant/email"
	"vigilant/models"

	"github.com/lib/pq"

	"fmt"
)

type GoogleCredentialsRepository struct {
	DB *sql.DB
}

func (r *GoogleCredentialsRepository) GetDefaultCredentials(ctx context.Context) (*models.GoogleCredential, error) {
	query := `
        SELECT
            id, credential_name, organization_id, user_id,
            service_account_email, project_id, private_key_id, private_key,
            client_email, client_id, access_token, refresh_token, token_expiry,
            scopes, credentials_json, credential_type, is_active, is_default,
            delegated_admin_email, subject_email,
            created_at, updated_at, created_by, last_used_at
        FROM google_credentials
        WHERE is_default = true AND is_active = true
        LIMIT 1
    `

	cred := &models.GoogleCredential{}
	var scopesArray pq.StringArray

	err := r.DB.QueryRowContext(ctx, query).Scan(
		&cred.ID, &cred.CredentialName, &cred.OrganizationID, &cred.UserID,
		&cred.ServiceAccountEmail, &cred.ProjectID, &cred.PrivateKeyID, &cred.PrivateKey,
		&cred.ClientEmail, &cred.ClientID, &cred.AccessToken, &cred.RefreshToken, &cred.TokenExpiry,
		&scopesArray, &cred.CredentialsJSON, &cred.CredentialType, &cred.IsActive, &cred.IsDefault,
		&cred.DelegatedAdminEmail, &cred.SubjectEmail,
		&cred.CreatedAt, &cred.UpdatedAt, &cred.CreatedBy, &cred.LastUsedAt,
	)

	if err != nil {
		return nil, err
	}

	cred.Scopes = scopesArray
	return cred, nil
}

func (r *GoogleCredentialsRepository) GetCredentialsByName(ctx context.Context, name string) (*models.GoogleCredential, error) {
	query := `
        SELECT
            id, credential_name, organization_id, user_id,
            service_account_email, project_id, private_key_id, private_key,
            client_email, client_id, access_token, refresh_token, token_expiry,
            scopes, credentials_json, credential_type, is_active, is_default,
            delegated_admin_email, subject_email,
            created_at, updated_at, created_by, last_used_at
        FROM google_credentials
        WHERE credential_name = $1 AND is_active = true
    `

	cred := &models.GoogleCredential{}
	var scopesArray pq.StringArray

	err := r.DB.QueryRowContext(ctx, query, name).Scan(
		&cred.ID, &cred.CredentialName, &cred.OrganizationID, &cred.UserID,
		&cred.ServiceAccountEmail, &cred.ProjectID, &cred.PrivateKeyID, &cred.PrivateKey,
		&cred.ClientEmail, &cred.ClientID, &cred.AccessToken, &cred.RefreshToken, &cred.TokenExpiry,
		&scopesArray, &cred.CredentialsJSON, &cred.CredentialType, &cred.IsActive, &cred.IsDefault,
		&cred.DelegatedAdminEmail, &cred.SubjectEmail,
		&cred.CreatedAt, &cred.UpdatedAt, &cred.CreatedBy, &cred.LastUsedAt,
	)

	if err != nil {
		return nil, err
	}

	cred.Scopes = scopesArray
	return cred, nil
}

func (r *GoogleCredentialsRepository) CreateCredential(ctx context.Context, cred *models.GoogleCredential) error {
	query := `
        INSERT INTO google_credentials (
            credential_name, organization_id, user_id,
            service_account_email, project_id, private_key_id, private_key,
            client_email, client_id, scopes, credentials_json,
            credential_type, is_active, is_default,
            delegated_admin_email, subject_email, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, created_at, updated_at
    `

	return r.DB.QueryRowContext(ctx, query,
		cred.CredentialName, cred.OrganizationID, cred.UserID,
		cred.ServiceAccountEmail, cred.ProjectID, cred.PrivateKeyID, cred.PrivateKey,
		cred.ClientEmail, cred.ClientID, pq.Array(cred.Scopes), cred.CredentialsJSON,
		cred.CredentialType, cred.IsActive, cred.IsDefault,
		cred.DelegatedAdminEmail, cred.SubjectEmail, cred.CreatedBy,
	).Scan(&cred.ID, &cred.CreatedAt, &cred.UpdatedAt)
}

func (r *GoogleCredentialsRepository) UpdateLastUsed(ctx context.Context, id int64) error {
	query := `UPDATE google_credentials SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1`
	_, err := r.DB.ExecContext(ctx, query, id)
	return err
}

func LoadDefaultCredential(ctx context.Context, repo *GoogleCredentialsRepository, encryptionKey string) ([]byte, error) {
	cred, err := repo.GetDefaultCredentials(ctx)
	if err != nil {
		return nil, fmt.Errorf("fetch default credential: %w", err)
	}

	keyBytes, err := email.DecodeKey(encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("decode encryption key: %w", err)
	}

	plainKey, err := email.Decrypt(cred.PrivateKey, keyBytes)
	if err != nil {
		return nil, fmt.Errorf("decrypt private key: %w", err)
	}

	raw := []byte(fmt.Sprintf(`{
		"type": "service_account",
		"project_id": %q,
		"private_key_id": %q,
		"private_key": %q,
		"client_email": %q,
		"client_id": %q,
		"auth_uri": "https://accounts.google.com/o/oauth2/auth",
		"token_uri": "https://oauth2.googleapis.com/token"
	}`, cred.ProjectID, cred.PrivateKeyID, plainKey, cred.ClientEmail, cred.ClientID))

	return raw, nil
}
