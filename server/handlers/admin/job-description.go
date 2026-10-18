// server/handlers/admin/job-description-handler.go
package admin

import (
	"log"
	"net/http"
	"strings"

	"vigilant/models"

	"github.com/gin-gonic/gin"
)

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

	result.Skills = normalizeSkills(result.Skills, 15)

	c.JSON(http.StatusOK, gin.H{"data": result})
}

func normalizeSkills(in []string, max int) []string {
	out := make([]string, 0, len(in))
	seen := make(map[string]struct{}, len(in))
	for _, s := range in {
		s = strings.TrimSpace(strings.ReplaceAll(s, ",", " "))
		if s == "" || len(s) > 50 {
			continue
		}
		key := strings.ToLower(s)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, s)
		if len(out) == max {
			break
		}
	}
	return out
}
