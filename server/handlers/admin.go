package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
    "encoding/csv"
    "path/filepath"
    "strings"
	"vigilant/config"
	"time"
    "github.com/xuri/excelize/v2"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"vigilant/models"
	"vigilant/websocket"

)


type UserData struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}



type AdminHandlers struct {
	DB *sql.DB
    Cfg *config.Config
	
}


func (h *AdminHandlers) UpdateCandidate(c *gin.Context) {
	candidateID := c.Param("id")

	var req struct {
		FullName              *string `json:"full_name"`
		IsActive              *bool   `json:"is_active"`
		Password              *string `json:"password"`
		InterviewCurrentStage *string `json:"interview_current_stage"`
		InterviewNextStage    *string `json:"interview_next_stage"`
		CurrentStageQualified *bool   `json:"current_stage_qualified"`
		InterviewCompleted    *bool   `json:"interview_completed"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	updates := []string{}
	args := []interface{}{}
	argID := 1

	if req.FullName != nil {
		updates = append(updates, fmt.Sprintf("full_name = $%d", argID))
		args = append(args, *req.FullName)
		argID++
	}

	if req.IsActive != nil {
		updates = append(updates, fmt.Sprintf("is_active = $%d", argID))
		args = append(args, *req.IsActive)
		argID++
	}

	if req.Password != nil {
		if len(*req.Password) < 8 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 8 characters"})
			return
		}
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
			return
		}
		updates = append(updates, fmt.Sprintf("password_hash = $%d", argID))
		args = append(args, string(hashedPassword))
		argID++
	}

	if req.InterviewCurrentStage != nil {
		updates = append(updates, fmt.Sprintf("interview_current_stage = $%d", argID))
		args = append(args, *req.InterviewCurrentStage)
		argID++
	}

	if req.InterviewNextStage != nil {
		updates = append(updates, fmt.Sprintf("interview_next_stage = $%d", argID))
		args = append(args, *req.InterviewNextStage)
		argID++
	}

	if req.CurrentStageQualified != nil {
		updates = append(updates, fmt.Sprintf("current_stage_qualified = $%d", argID))
		args = append(args, *req.CurrentStageQualified)
		argID++
	}

	if req.InterviewCompleted != nil {
		updates = append(updates, fmt.Sprintf("interview_completed = $%d", argID))
		args = append(args, *req.InterviewCompleted)
		argID++
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields to update"})
		return
	}

	updates = append(updates, "updated_at = NOW()")
	args = append(args, candidateID)

	query := fmt.Sprintf(
		"UPDATE candidates SET %s WHERE id = $%d",
		strings.Join(updates, ", "),
		argID,
	)

	result, err := h.DB.Exec(query, args...)
	if err != nil {
		log.Printf("Error updating candidate: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update candidate"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "candidate not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "updated",
		"id":     candidateID,
	})
}
func (h *AdminHandlers) BulkCreateCandidates(c *gin.Context) {
    var req []struct {
        Email    string `json:"email"`
        Password string `json:"password"`
        FullName string `json:"full_name"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
        return
    }

    if len(req) == 0 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "no candidates provided"})
        return
    }

    tx, err := h.DB.Begin()
    if err != nil {
        log.Printf("Error starting transaction: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
        return
    }

    stmt, err := tx.Prepare(`
        INSERT INTO candidates (email, password_hash, full_name, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
    `)
    if err != nil {
        tx.Rollback()
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to prepare statement"})
        return
    }
    defer stmt.Close()

    for _, candidate := range req {
        if candidate.Email == "" || len(candidate.Password) < 8 {
            tx.Rollback()
            c.JSON(http.StatusBadRequest, gin.H{"error": "invalid data for candidate: " + candidate.Email})
            return
        }

        hashedPassword, err := bcrypt.GenerateFromPassword([]byte(candidate.Password), bcrypt.DefaultCost)
        if err != nil {
            tx.Rollback()
            c.JSON(http.StatusInternalServerError, gin.H{"error": "hashing failed"})
            return
        }

        _, err = stmt.Exec(candidate.Email, string(hashedPassword), candidate.FullName)
        if err != nil {
            tx.Rollback()
            if strings.Contains(err.Error(), "duplicate key") {
                c.JSON(http.StatusConflict, gin.H{"error": "conflict: candidate " + candidate.Email + " already exists"})
                return
            }
            c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to insert candidates"})
            return
        }
    }

    if err := tx.Commit(); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit transaction"})
        return
    }

    c.JSON(http.StatusCreated, gin.H{
        "message": "Successfully imported candidates",
        "count":   len(req),
    })
}


func processRows(records [][]string) []UserData {
	var users []UserData
	for i, row := range records {
		if i == 0 && (strings.ToLower(row[0]) == "name") {
			continue
		}
		if len(row) >= 2 {
			users = append(users, UserData{
				Name:  strings.TrimSpace(row[0]),
				Email: strings.TrimSpace(row[1]),
			})
		}
	}
	return users
}

func (h *AdminHandlers) ParseUserList(c *gin.Context) {
fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "No file uploaded"})
		return
	}

	extension := strings.ToLower(filepath.Ext(fileHeader.Filename))
	var users []UserData

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "File open error"})
		return
	}
	defer file.Close()

	if extension == ".csv" {
		reader := csv.NewReader(file)
		records, err := reader.ReadAll()
		if err != nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Invalid CSV format"})
			return
		}
		users = processRows(records)

	} else if extension == ".xlsx" {
		xlFile, err := excelize.OpenReader(file)
		if err != nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Invalid Excel format"})
			return
		}
		defer xlFile.Close()

		sheetName := xlFile.GetSheetName(0)
		rows, err := xlFile.GetRows(sheetName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error reading Excel sheet"})
			return
		}
		users = processRows(rows)

	} else {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Unsupported file type. Please use .csv or .xlsx"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"count":     len(users),
		"data":      users,
		"timestamp": time.Now(),
	})
}

func (h *AdminHandlers) CreateCandidate(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		FullName string `json:"full_name"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if req.Email == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email and password are required"})
		return
	}

	if len(req.Password) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 8 characters"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	query := `
		INSERT INTO candidates (email, password_hash, full_name, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		RETURNING id, email, full_name, created_at, is_active
	`

	var candidate models.Candidate
	err = h.DB.QueryRow(query, req.Email, string(hashedPassword), req.FullName).Scan(
		&candidate.ID,
		&candidate.Email,
		&candidate.FullName,
		&candidate.CreatedAt,
		&candidate.IsActive,
	)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			c.JSON(http.StatusConflict, gin.H{"error": "email already exists"})
			return
		}
		log.Printf("Error creating candidate: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create candidate"})
		return
	}

	c.JSON(http.StatusCreated, candidate)
}

func (h *AdminHandlers) ListCandidates(c *gin.Context) {
	query := `
		SELECT id, email, full_name, created_at, updated_at, is_active, last_login
		FROM candidates
		ORDER BY created_at DESC
	`

	rows, err := h.DB.Query(query)
	if err != nil {
		log.Printf("Error querying candidates: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve candidates"})
		return
	}
	defer rows.Close()

	type CandidateWithPresence struct {
		models.Candidate
		IsOnline bool `json:"is_online"`
	}

	candidates := []CandidateWithPresence{}

	for rows.Next() {
		var cand models.Candidate
		err := rows.Scan(
			&cand.ID,
			&cand.Email,
			&cand.FullName,
			&cand.CreatedAt,
			&cand.UpdatedAt,
			&cand.IsActive,
			&cand.LastLogin,
		)
		if err != nil {
			log.Printf("Error scanning candidate: %v", err)
			continue
		}

		candidates = append(candidates, CandidateWithPresence{
			Candidate: cand,
			IsOnline:  websocket.Manager.IsActive(fmt.Sprintf("%d", cand.ID)),
		})
	}

	c.JSON(http.StatusOK, candidates)
}

func (h *AdminHandlers) GetCandidate(c *gin.Context) {
	candidateID := c.Param("id")

	query := `
		SELECT id, email, full_name, created_at, updated_at, is_active, last_login
		FROM candidates
		WHERE id = $1
	`

	var cand models.Candidate
	err := h.DB.QueryRow(query, candidateID).Scan(
		&cand.ID,
		&cand.Email,
		&cand.FullName,
		&cand.CreatedAt,
		&cand.UpdatedAt,
		&cand.IsActive,
		&cand.LastLogin,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "candidate not found"})
		return
	}

	if err != nil {
		log.Printf("Error querying candidate: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve candidate"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"candidate": cand,
		"is_online": websocket.Manager.IsActive(fmt.Sprintf("%d", cand.ID)),
	})
}


func (h *AdminHandlers) DeleteCandidate(c *gin.Context) {
	candidateID := c.Param("id")

	query := `UPDATE candidates SET is_active = false, updated_at = NOW() WHERE id = $1`

	result, err := h.DB.Exec(query, candidateID)
	if err != nil {
		log.Printf("Error deleting candidate: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete candidate"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "candidate not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "deleted",
		"id":     candidateID,
	})
}



func (h *AdminHandlers) GetActiveUsers(c *gin.Context) {
    active := websocket.Manager.ActiveUsers()
    c.JSON(http.StatusOK, gin.H{
        "active_users": active,
        "count":        len(active),
    })
}


func (h *AdminHandlers) GetDashboardStats(c *gin.Context) {
	stats := gin.H{}

	var totalCandidates int
	h.DB.QueryRow("SELECT COUNT(*) FROM candidates WHERE is_active = true").Scan(&totalCandidates)
	stats["total_candidates"] = totalCandidates

	var activeInterviews int
	h.DB.QueryRow("SELECT COUNT(*) FROM interview_sessions WHERE status = 'in_progress'").Scan(&activeInterviews)
	stats["active_interviews"] = activeInterviews

	var interviewsToday int
	h.DB.QueryRow("SELECT COUNT(*) FROM interview_sessions WHERE started_at >= CURRENT_DATE").Scan(&interviewsToday)
	stats["interviews_today"] = interviewsToday

	var highRiskSessions int
	h.DB.QueryRow("SELECT COUNT(*) FROM alert_summary WHERE risk_score > 50").Scan(&highRiskSessions)
	stats["high_risk_sessions"] = highRiskSessions

	var recentLogins int
	h.DB.QueryRow("SELECT COUNT(*) FROM candidate_sessions WHERE logged_in_at >= NOW() - INTERVAL '24 hours'").Scan(&recentLogins)
	stats["recent_logins"] = recentLogins

	c.JSON(http.StatusOK, stats)
}



