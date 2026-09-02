// server/handlers/admin/ai-assignment-handler.go
package admin

import (
	"log"
	"net/http"
	"vigilant/models"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

// GenerateAssignment uses the configured Gemini scenario to generate a new
// assignment at the requested difficulty level for the given position, then
// stores it as a normal row in `assignments` (flagged generated_by_ai=true)
// so it can be attached to a position's default assignment_id or a specific
// application's assignment_id override.
func (h *AdminHandlers) GenerateAssignment(c *gin.Context) {
	if h.AIService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI service not configured"})
		return
	}

	var req models.GenerateAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"details": err.Error(),
		})
		return
	}

	if !models.ValidDifficulties[req.Difficulty] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":              "invalid difficulty",
			"valid_difficulties": []string{"intern", "junior", "sde1", "sde2", "sde3"},
		})
		return
	}

	var positionTitle, jobDescription, jobRequirements string
	err := h.DB.QueryRow(`
		SELECT position_title, job_description, requirements
		FROM hiring_positions WHERE id = $1::uuid
	`, req.PositionID).Scan(&positionTitle, &jobDescription, &jobRequirements)
	if err != nil {
		log.Printf("Error fetching position for assignment generation: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "position not found"})
		return
	}

	generated, err := h.AIService.GenerateAssignment(c.Request.Context(), positionTitle, jobDescription, jobRequirements, req)
	if err != nil {
		log.Printf("Error generating assignment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate assignment"})
		return
	}

	adminID, _ := c.Get("admin_id")
	adminIDStr, _ := adminID.(string)
	var createdBy *string
	if adminIDStr != "" {
		createdBy = &adminIDStr
	}

	// Requirements come back as a list from the AI; stored as newline-bulleted
	// text in instructions, matching how the rest of the assignments table
	// treats "instructions" as freeform text rather than structured data.
	instructionsText := joinRequirements(generated.Requirements)
	durationMinutes := int(generated.EstimatedHours * 60)

	var assignment models.Assignment
	err = h.DB.QueryRow(`
		INSERT INTO assignments (
			title, description, instructions, resource_links,
			duration_minutes, passing_score,
			difficulty_level, generated_by_ai, ai_notes, starter_readme,
			created_by, updated_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $9, $10, $10)
		RETURNING id, title, description, instructions, resource_links,
			duration_minutes, passing_score, status, is_active,
			difficulty_level, generated_by_ai, ai_notes, starter_readme,
			created_at, updated_at, created_by, updated_by
	`,
		generated.Title,
		generated.Description,
		instructionsText,
		pq.Array([]string{}), // resource_links: AI doesn't produce these; left empty, editable later via UpdateAssignment
		durationMinutes,
		nil, // passing_score: not AI-determined, left for admin to set via UpdateAssignment
		req.Difficulty,
		req.Notes,
		generated.StarterReadme,
		createdBy,
	).Scan(
		&assignment.ID, &assignment.Title, &assignment.Description,
		&assignment.Instructions, pq.Array(&assignment.ResourceLinks),
		&assignment.DurationMinutes, &assignment.PassingScore,
		&assignment.Status, &assignment.IsActive,
		&assignment.DifficultyLevel, &assignment.GeneratedByAI,
		&assignment.AINotes, &assignment.StarterReadme,
		&assignment.CreatedAt, &assignment.UpdatedAt,
		&assignment.CreatedBy, &assignment.UpdatedBy,
	)

	if err != nil {
		log.Printf("Error saving generated assignment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save generated assignment"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "assignment generated successfully",
		"data":    assignment,
	})
}

func joinRequirements(reqs []string) string {
	out := ""
	for _, r := range reqs {
		out += "- " + r + "\n"
	}
	return out
}
