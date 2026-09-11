// server/handlers/admin/questions-handler.go
package admin

import (
	"encoding/json"
	"log"
	"net/http"
	"vigilant/models"

	"github.com/gin-gonic/gin"
)

func (h *AdminHandlers) GenerateQuestions(c *gin.Context) {
	if h.AIService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI service not configured"})
		return
	}

	sessionID := c.Param("id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "interview session id is required"})
		return
	}

	var req models.GenerateQuestionsRequest
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

	var internalSessionID int
	var positionTitle, jobDescription, jobRequirements string
	err := h.DB.QueryRow(`
		SELECT ivs.id, hp.position_title, hp.job_description, hp.requirements
		FROM interview_sessions ivs
		JOIN job_applications ja ON ja.id = ivs.application_id
		JOIN hiring_positions hp ON hp.id = ja.position_id
		WHERE ivs.session_id = $1
	`, sessionID).Scan(&internalSessionID, &positionTitle, &jobDescription, &jobRequirements)
	if err != nil {
		log.Printf("Error fetching session/position for question generation: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "interview session or linked position not found"})
		return
	}

	generated, err := h.AIService.GenerateQuestions(c.Request.Context(), positionTitle, jobDescription, jobRequirements, req)
	if err != nil {
		log.Printf("Error generating questions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate questions"})
		return
	}

	adminID, _ := c.Get("admin_id")
	adminIDStr, _ := adminID.(string)
	var generatedBy *string
	if adminIDStr != "" {
		generatedBy = &adminIDStr
	}

	category := req.Category
	if category == "" {
		category = "mixed"
	}

	questionsJSON, err := json.Marshal(generated.Questions)
	if err != nil {
		log.Printf("Error marshaling generated questions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save generated questions"})
		return
	}

	var nextAttempt int
	err = h.DB.QueryRow(`
		SELECT COALESCE(MAX(attempt_number), 0) + 1
		FROM interview_question_sets
		WHERE interview_session_id = $1
	`, internalSessionID).Scan(&nextAttempt)
	if err != nil {
		log.Printf("Error computing attempt number: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save generated questions"})
		return
	}

	var set models.QuestionSet
	var questionsRaw []byte
	err = h.DB.QueryRow(`
		INSERT INTO interview_question_sets (
			interview_session_id, attempt_number, difficulty_level, category,
			questions, generated_by_ai, notes, generated_by
		) VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7)
		RETURNING id, interview_session_id, attempt_number, difficulty_level,
			category, questions, generated_by_ai, notes, generated_by, created_at
	`,
		internalSessionID,
		nextAttempt,
		req.Difficulty,
		category,
		questionsJSON,
		req.Notes,
		generatedBy,
	).Scan(
		&set.ID, &set.InterviewSessionID, &set.AttemptNumber, &set.DifficultyLevel,
		&set.Category, &questionsRaw, &set.GeneratedByAI, &set.Notes,
		&set.GeneratedBy, &set.CreatedAt,
	)
	if err != nil {
		log.Printf("Error saving generated question set: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save generated questions"})
		return
	}

	if err := json.Unmarshal(questionsRaw, &set.Questions); err != nil {
		log.Printf("Error unmarshaling stored questions: %v", err)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "questions generated successfully",
		"data":    set,
	})
}
