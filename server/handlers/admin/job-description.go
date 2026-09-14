// server/handlers/admin/job-description-handler.go
package admin

import (
	"log"
	"net/http"

	"vigilant/models"

	"github.com/gin-gonic/gin"
)

// POST /api/v1/admin/ai/positions/generate-description
func (h *AdminHandlers) GenerateJobDescription(c *gin.Context) {
	if h.AIService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI service not configured"})
		return
	}

	var req models.GenerateJobDescriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"details": err.Error(),
		})
		return
	}

	result, err := h.AIService.GenerateJobDescription(c.Request.Context(), req)
	if err != nil {
		log.Printf("Error generating job description: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to generate job description"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}
