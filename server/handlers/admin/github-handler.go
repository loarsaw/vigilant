// server/handler/admin/github-handler.go
package admin

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
	"vigilant/audit"
	"vigilant/email"
	"vigilant/githubapi"
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

	req.OrgName = strings.TrimSpace(req.OrgName)
	req.Token = strings.TrimSpace(req.Token)

	if req.OrgName == "" || req.Token == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "org_name and token are required",
		})
		return
	}

	if !models.IsValidGithubOrgName(req.OrgName) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "org_name must be a valid GitHub organization name (alphanumeric and hyphens, max 39 chars)",
		})
		return
	}

	if !models.IsValidGithubToken(req.Token) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "token does not match a known GitHub token format (expected ghp_, github_pat_, gho_, ghu_, ghs_, or a 40-char classic token)",
		})
		return
	}

	if err := verifyGithubTokenPermissions(h.DB, req.Token, req.OrgName, adminActor(c)); err != nil {
		log.Printf("github token permission check failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "github token does not have sufficient permissions",
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

func verifyGithubTokenPermissions(db *sql.DB, token, orgName, actor string) error {
	client := githubapi.NewClient(token, orgName)

	testRepoName := fmt.Sprintf("vigilant-permission-check-%d", time.Now().UnixNano())

	repoURL, err := client.CreateRepo(testRepoName)
	if err != nil {
		audit.LogSystemAction(
			db,
			"github_token_check_create_failed",
			"github_repo",
			testRepoName,
			fmt.Sprintf("Token permission check failed to create repo %s in org %s: %s", testRepoName, orgName, err.Error()),
			map[string]interface{}{
				"org_name": orgName,
				"repo":     testRepoName,
			},
			actor,
		)
		return fmt.Errorf("token could not create a repo in org %q: %w", orgName, err)
	}

	audit.LogSystemAction(
		db,
		"github_token_check_repo_created",
		"github_repo",
		testRepoName,
		fmt.Sprintf("Token permission check created test repo %s in org %s", testRepoName, orgName),
		map[string]interface{}{
			"org_name": orgName,
			"repo":     testRepoName,
			"repo_url": repoURL,
		},
		actor,
	)

	if err := client.DeleteRepo(testRepoName); err != nil {
		audit.LogSystemAction(
			db,
			"github_token_check_delete_failed",
			"github_repo",
			testRepoName,
			fmt.Sprintf("Token permission check created test repo %s in org %s but failed to delete it: %s", testRepoName, orgName, err.Error()),
			map[string]interface{}{
				"org_name": orgName,
				"repo":     testRepoName,
				"repo_url": repoURL,
			},
			actor,
		)
		return fmt.Errorf("token created a test repo but could not delete it (repo %q may need manual cleanup): %w", testRepoName, err)
	}

	audit.LogSystemAction(
		db,
		"github_token_check_repo_deleted",
		"github_repo",
		testRepoName,
		fmt.Sprintf("Token permission check deleted test repo %s in org %s", testRepoName, orgName),
		map[string]interface{}{
			"org_name": orgName,
			"repo":     testRepoName,
		},
		actor,
	)

	return nil
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
