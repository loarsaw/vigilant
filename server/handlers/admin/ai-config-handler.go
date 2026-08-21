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

func (h *AdminHandlers) SaveAIScenario(c *gin.Context) {
	if h.AIService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI service not configured"})
		return
	}

	var req struct {
		ScenarioKey  string  `json:"scenario_key" binding:"required"`
		Name         string  `json:"name" binding:"required"`
		Description  *string `json:"description,omitempty"`
		Provider     string  `json:"provider" binding:"required,oneof=openai gemini claude"`
		Model        *string `json:"model,omitempty"`
		SystemPrompt string  `json:"system_prompt" binding:"required"`
		Temperature  float64 `json:"temperature"`
		MaxTokens    int     `json:"max_tokens" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"details": err.Error(),
		})
		return
	}

	err := h.AIService.SaveScenario(ai.SaveScenarioInput{
		ScenarioKey:  req.ScenarioKey,
		Name:         req.Name,
		Description:  req.Description,
		Provider:     req.Provider,
		Model:        req.Model,
		SystemPrompt: req.SystemPrompt,
		Temperature:  req.Temperature,
		MaxTokens:    req.MaxTokens,
	})
	if err != nil {
		log.Printf("Error saving AI scenario: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save scenario"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "scenario saved successfully"})
}

func (h *AdminHandlers) ListAIScenarios(c *gin.Context) {
	if h.AIService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI service not configured"})
		return
	}

	scenarios, err := h.AIService.ListScenarios()
	if err != nil {
		log.Printf("Error listing AI scenarios: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list scenarios"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"scenarios": scenarios})
}

func (h *AdminHandlers) DeactivateAIScenario(c *gin.Context) {
	if h.AIService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI service not configured"})
		return
	}

	key := c.Param("key")
	if err := h.AIService.DeactivateScenario(key); err != nil {
		log.Printf("Error deactivating AI scenario: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to deactivate scenario"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "scenario deactivated"})
}
