package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"vigilant/email"
	"vigilant/models"
	googleutils "vigilant/utils/google"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

func (h *AdminHandlers) CreateGoogleCredential(c *gin.Context) {
	var req struct {
		CredentialName      string   `json:"credential_name" binding:"required"`
		OrganizationID      *string  `json:"organization_id"`
		UserID              *string  `json:"user_id"`
		CredentialsJSON     string   `json:"credentials_json" binding:"required"`
		IsDefault           bool     `json:"is_default"`
		DelegatedAdminEmail *string  `json:"delegated_admin_email"`
		SubjectEmail        *string  `json:"subject_email"`
		Scopes              []string `json:"scopes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var sa models.ServiceAccountJSON
	if err := json.Unmarshal([]byte(req.CredentialsJSON), &sa); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid credentials_json: " + err.Error()})
		return
	}

	if sa.PrivateKey == "" || sa.ClientEmail == "" || sa.ProjectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "credentials_json missing required fields"})
		return
	}

	keyBytes, err := email.DecodeKey(h.Cfg.EncryptionKey)
	if err != nil {
		log.Printf("Error decoding encryption key: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server misconfiguration"})
		return
	}

	encryptedKey, err := email.Encrypt(sa.PrivateKey, keyBytes)
	if err != nil {
		log.Printf("Error encrypting private key: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to secure credentials"})
		return
	}

	createdBy, _ := c.Get("user_id")
	createdByStr, _ := createdBy.(string)

	var createdByPtr *string
	if createdByStr != "" {
		createdByPtr = &createdByStr
	}

	cred := &models.GoogleCredential{
		CredentialName:      req.CredentialName,
		OrganizationID:      req.OrganizationID,
		UserID:              req.UserID,
		ServiceAccountEmail: sa.ClientEmail,
		ProjectID:           sa.ProjectID,
		PrivateKeyID:        sa.PrivateKeyID,
		PrivateKey:          encryptedKey,
		ClientEmail:         sa.ClientEmail,
		ClientID:            sa.ClientID,
		Scopes:              req.Scopes,
		CredentialsJSON:     req.CredentialsJSON,
		CredentialType:      "service_account",
		IsActive:            true,
		IsDefault:           req.IsDefault,
		DelegatedAdminEmail: req.DelegatedAdminEmail,
		SubjectEmail:        req.SubjectEmail,
		CreatedBy:           createdByPtr,
	}

	ctx := c.Request.Context()
	repo := &googleutils.GoogleCredentialsRepository{DB: h.DB}

	if err := repo.CreateCredential(ctx, cred); err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			c.JSON(http.StatusConflict, gin.H{"error": "credential name already exists"})
			return
		}
		log.Printf("Error creating Google credential: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create credential"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":              cred.ID,
		"credential_name": cred.CredentialName,
		"client_email":    cred.ClientEmail,
		"project_id":      cred.ProjectID,
		"is_default":      cred.IsDefault,
		"is_active":       cred.IsActive,
		"created_at":      cred.CreatedAt,
	})
}
