package admin

import (
	"database/sql"
	"net/http"

	"vigilant/models"

	"github.com/gin-gonic/gin"
)

// SaveLiveKitConfig saves or updates the LiveKit credentials in the DB
func (h *AdminHandlers) SaveLiveKitConfig(c *gin.Context) {
	var req struct {
		Host      string `json:"host" binding:"required"`
		APIKey    string `json:"api_key" binding:"required"`
		APISecret string `json:"api_secret" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Deactivate existing configs and insert the new one
	tx, err := h.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}

	_, _ = tx.Exec("UPDATE livekit_configs SET is_active = false")

	query := `
		INSERT INTO livekit_configs (host, api_key, api_secret, is_active)
		VALUES ($1, $2, $3, true)
		RETURNING id
	`
	var id int
	err = tx.QueryRow(query, req.Host, req.APIKey, req.APISecret).Scan(&id)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save configuration"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "LiveKit configuration saved successfully", "id": id})
}

// GetLiveKitConfig returns current active LiveKit configuration
func (h *AdminHandlers) GetLiveKitConfig(c *gin.Context) {
	var cfg models.LiveKitConfig
	query := `
		SELECT id, host, api_key, api_secret, is_active, created_at
		FROM livekit_configs
		WHERE is_active = true
		ORDER BY id DESC LIMIT 1
	`
	err := h.DB.QueryRow(query).Scan(&cfg.ID, &cfg.Host, &cfg.APIKey, &cfg.APISecret, &cfg.IsActive, &cfg.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "LiveKit configuration not set"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, cfg)
}
