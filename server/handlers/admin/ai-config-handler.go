// server/handlers/admin/ai-config-handler.go
package admin

import (
	"fmt"
	"log"
	"net/http"
	"vigilant/audit"
	"vigilant/models"

	"github.com/gin-gonic/gin"
)

func (h *AdminHandlers) SaveAIProviderConfig(c *gin.Context) {
	if h.AIService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI service not configured"})
		return
	}

	var req models.SaveAIProviderConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"details": err.Error(),
		})
		return
	}

	input := models.SaveProviderConfigInput{
		Provider: req.Provider,
		APIKey:   req.APIKey,
		Model:    req.Model,
		BaseURL:  req.BaseURL,
	}

	actor := adminActor(c)

	if err := h.AIService.TestProviderConfig(c.Request.Context(), input); err != nil {
		log.Printf("AI provider config test failed: %v", err)
		audit.LogSystemAction(
			h.DB,
			"ai_provider_test_failed",
			"ai_provider_config",
			req.Provider,
			fmt.Sprintf("AI provider config test failed for provider %s model %s: %s", req.Provider, req.Model, err.Error()),
			map[string]interface{}{
				"provider": req.Provider,
				"model":    req.Model,
			},
			actor,
		)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "provider config failed text generation test",
			"details": err.Error(),
		})
		return
	}

	audit.LogSystemAction(
		h.DB,
		"ai_provider_test_succeeded",
		"ai_provider_config",
		req.Provider,
		fmt.Sprintf("AI provider config test succeeded for provider %s model %s", req.Provider, req.Model),
		map[string]interface{}{
			"provider": req.Provider,
			"model":    req.Model,
		},
		actor,
	)

	if err := h.AIService.SaveProviderConfig(input); err != nil {
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
