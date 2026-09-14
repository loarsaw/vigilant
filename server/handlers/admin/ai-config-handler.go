// server/handlers/admin/ai-config-handler.go
package admin

import (
	"log"
	"net/http"
	"vigilant/ai"

	"github.com/gin-gonic/gin"
)

func (h *AdminHandlers) SaveAIProviderConfig(c *gin.Context) {
	if h.AIService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI service not configured"})
		return
	}

	var req struct {
		Provider string  `json:"provider" binding:"required,oneof=openai gemini claude"`
		APIKey   string  `json:"api_key" binding:"required"`
		Model    string  `json:"model" binding:"required"`
		BaseURL  *string `json:"base_url,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"details": err.Error(),
		})
		return
	}

	err := h.AIService.SaveProviderConfig(ai.SaveProviderConfigInput{
		Provider: req.Provider,
		APIKey:   req.APIKey,
		Model:    req.Model,
		BaseURL:  req.BaseURL,
	})
	if err != nil {
		log.Printf("Error saving AI provider config: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save provider config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "provider config saved successfully"})
}

func (h *AdminHandlers) ListAIProviderConfigs(c *gin.Context) {
	if h.AIService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI service not configured"})
		return
	}

	configs, err := h.AIService.ListProviderConfigs()
	if err != nil {
		log.Printf("Error listing AI provider configs: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list provider configs"})
		return
	}

	masked := make([]gin.H, 0, len(configs))
	for _, cfg := range configs {
		masked = append(masked, gin.H{
			"provider":   cfg.Provider,
			"model":      cfg.Model,
			"base_url":   cfg.BaseURL,
			"is_active":  cfg.IsActive,
			"has_key":    cfg.APIKey != "",
			"created_at": cfg.CreatedAt,
			"updated_at": cfg.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"providers": masked})
}
