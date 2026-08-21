// server/handler/admin/github-handler.go
package admin

import (
	"database/sql"
	"log"
	"net/http"
	"vigilant/email"
	"vigilant/models"

	"github.com/gin-gonic/gin"
)

func (h *AdminHandlers) SaveGithubConfig(c *gin.Context) {
	var req models.SaveGithubCredentialsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"details": err.Error(),
		})
		return
	}

	key, err := email.DecodeKey(h.Cfg.EncryptionKey)
	if err != nil {
		log.Printf("Error decoding encryption key: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save github config"})
		return
	}

	encryptedToken, err := email.Encrypt(req.Token, key)
	if err != nil {
		log.Printf("Error encrypting github token: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save github config"})
		return
	}

	adminID, _ := c.Get("admin_id")
	adminIDStr, _ := adminID.(string)

	_, err = h.DB.Exec(`
		INSERT INTO github_credentials (id, org_name, pat_encrypted, created_by, updated_at)
		VALUES (1, $1, $2, $3, CURRENT_TIMESTAMP)
		ON CONFLICT (id) DO UPDATE
		SET org_name = EXCLUDED.org_name,
		    pat_encrypted = EXCLUDED.pat_encrypted,
		    created_by = EXCLUDED.created_by,
		    updated_at = CURRENT_TIMESTAMP
	`, req.OrgName, encryptedToken, adminIDStr)

	if err != nil {
		log.Printf("Error saving github config: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save github config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "github config saved successfully"})
}

func (h *AdminHandlers) GetGithubConfig(c *gin.Context) {
	var orgName string
	var updatedAt sql.NullTime
	var hasToken bool

	err := h.DB.QueryRow(`
		SELECT org_name, updated_at,
		       (pat_encrypted IS NOT NULL AND pat_encrypted != '') as has_token
		FROM github_credentials
		WHERE id = 1
	`).Scan(&orgName, &updatedAt, &hasToken)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusOK, gin.H{"configured": false})
		return
	}
	if err != nil {
		log.Printf("Error fetching github config: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch github config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"configured": true,
		"org_name":   orgName,
		"has_token":  hasToken,
		"updated_at": updatedAt.Time,
	})
}
