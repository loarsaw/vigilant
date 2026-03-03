package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"vigilant/executor"
	"vigilant/models"
)


func saveSubmission(db *sql.DB, s *models.Submission) (int64, error) {
	var id int64
	err := db.QueryRow(`
		INSERT INTO judge_submissions
			(language, code, stdout, stderr, exit_code, time_ms, memory_kb, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING id`,
		s.Language, s.Code, s.Stdout, s.Stderr,
		s.ExitCode, s.TimeMS, s.MemoryKB, s.Status,
	).Scan(&id)
	return id, err
}

func getSubmission(db *sql.DB, id int64) (*models.Submission, error) {
	s := &models.Submission{}
	err := db.QueryRow(`
		SELECT id, language, code, stdout, stderr, exit_code, time_ms, memory_kb, status, created_at
		FROM judge_submissions WHERE id = $1`, id,
	).Scan(&s.ID, &s.Language, &s.Code, &s.Stdout, &s.Stderr,
		&s.ExitCode, &s.TimeMS, &s.MemoryKB, &s.Status, &s.CreatedAt)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func listSubmissions(db *sql.DB, limit int) ([]*models.Submission, error) {
	rows, err := db.Query(`
		SELECT id, language, code, stdout, stderr, exit_code, time_ms, memory_kb, status, created_at
		FROM judge_submissions
		ORDER BY created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*models.Submission
	for rows.Next() {
		s := &models.Submission{}
		if err := rows.Scan(&s.ID, &s.Language, &s.Code, &s.Stdout, &s.Stderr,
			&s.ExitCode, &s.TimeMS, &s.MemoryKB, &s.Status, &s.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, nil
}

func (h *Handlers) ExecuteCode(c *gin.Context) {
	var req models.ExecuteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if !models.SupportedLanguages[req.Language] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":    "unsupported language",
			"accepted": []string{"c", "cpp", "js", "java"},
		})
		return
	}

	if strings.TrimSpace(req.Code) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code cannot be empty"})
		return
	}

	result, err := executor.Execute(req.Language, req.Code)
	if err != nil {
		log.Printf("[judge] execution error lang=%s err=%v", req.Language, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "execution failed"})
		return
	}

	status := "accepted"
	if result.ExitCode == 124 {
		status = "timeout"
	} else if result.ExitCode != 0 {
		status = "error"
	}

	sub := &models.Submission{
		Language:  req.Language,
		Code:      req.Code,
		Stdout:    result.Stdout,
		Stderr:    result.Stderr,
		ExitCode:  result.ExitCode,
		TimeMS:    result.TimeMS,
		MemoryKB:  result.MemoryKB,
		Status:    status,
		CreatedAt: time.Now(),
	}

	id, err := saveSubmission(h.DB, sub)
	if err != nil {
		log.Printf("[judge] db save error: %v", err)
		// still return result — don't fail the user
	}
	sub.ID = id

	c.JSON(http.StatusOK, sub)
}

func (h *Handlers) GetSubmission(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	sub, err := getSubmission(h.DB, id)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "submission not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	c.JSON(http.StatusOK, sub)
}

func (h *Handlers) ListSubmissions(c *gin.Context) {
	limit := 50
	if l, err := strconv.Atoi(c.Query("limit")); err == nil && l > 0 && l <= 200 {
		limit = l
	}

	subs, err := listSubmissions(h.DB, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	if subs == nil {
		subs = []*models.Submission{}
	}

	c.JSON(http.StatusOK, subs)
}
