package admin

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

func (h *AdminHandlers) CreateInterviewSession(c *gin.Context) {
	var req struct {
		CandidateID       string    `json:"candidate_id"       binding:"required"`
		ApplicationID     string    `json:"application_id"`
		InterviewerID     string    `json:"interviewer_id"     binding:"required"`
		Position          string    `json:"position"           binding:"required"`
		InterviewType     string    `json:"interview_type"     binding:"required"`
		ScheduledAt       time.Time `json:"scheduled_at"       binding:"required"`
		ScheduledDuration int       `json:"scheduled_duration" binding:"required,min=15"`
		InterviewURL      string    `json:"interview_url"      binding:"required"`
		TimeZone          string    `json:"timezone"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request format", "details": err.Error()})
		return
	}

	if req.TimeZone == "" {
		req.TimeZone = "Asia/Kolkata"
	}

	ctx := c.Request.Context()

	var candidateEmail, candidateName string
	err := h.DB.QueryRowContext(ctx, `
		SELECT email, full_name FROM candidates
		WHERE id = $1 AND is_active = true
	`, req.CandidateID).Scan(&candidateEmail, &candidateName)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"error": "candidate not found or inactive"})
		return
	}
	if err != nil {
		log.Printf("CreateInterviewSession: failed to fetch candidate: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	var interviewerEmail string
	var interviewerRole string
	err = h.DB.QueryRowContext(ctx, `
		SELECT email, role FROM administrators
		WHERE id = $1 AND is_active = true
	`, req.InterviewerID).Scan(&interviewerEmail, &interviewerRole)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"error": "interviewer not found or inactive"})
		return
	}
	if err != nil {
		log.Printf("CreateInterviewSession: failed to fetch interviewer: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	if interviewerRole != "interviewer" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "assigned admin is not an interviewer"})
		return
	}

	if req.ApplicationID != "" {
		var appExists bool
		err = h.DB.QueryRowContext(ctx, `
			SELECT EXISTS(
				SELECT 1 FROM job_applications
				WHERE id = $1 AND candidate_id = $2
			)
		`, req.ApplicationID, req.CandidateID).Scan(&appExists)
		if err != nil {
			log.Printf("CreateInterviewSession: failed to verify application: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			return
		}
		if !appExists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "application not found or does not belong to candidate"})
			return
		}
	}

	sessionID := uuid.New().String()

	metadataBytes, err := json.Marshal(gin.H{
		"candidate_email": candidateEmail,
		"candidate_name":  candidateName,
		"timezone":        req.TimeZone,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to build metadata"})
		return
	}

	var applicationID interface{}
	if req.ApplicationID != "" {
		applicationID = req.ApplicationID
	}

	var id int64
	var createdAt time.Time

	err = h.DB.QueryRowContext(ctx, `
		INSERT INTO interview_sessions (
			session_id, candidate_id, candidate_session_id,
			application_id, interviewer_id, position,
			interview_type, interview_platform, interview_url,
			scheduled_at, scheduled_duration, status, metadata
		) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at
	`,
		sessionID,
		req.CandidateID,
		applicationID,
		req.InterviewerID,
		req.Position,
		req.InterviewType,
		0,
		req.InterviewURL,
		req.ScheduledAt,
		req.ScheduledDuration,
		"scheduled",
		string(metadataBytes),
	).Scan(&id, &createdAt)

	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23503" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid reference: candidate or interviewer not found"})
			return
		}
		log.Printf("CreateInterviewSession: failed to insert: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create interview session"})
		return
	}

	log.Printf("Interview session created. ID: %d, candidate: %s, interviewer: %s", id, candidateEmail, interviewerEmail)

	c.JSON(http.StatusCreated, gin.H{
		"id":                 id,
		"session_id":         sessionID,
		"candidate_id":       req.CandidateID,
		"application_id":     req.ApplicationID,
		"interviewer_id":     req.InterviewerID,
		"interviewer_email":  interviewerEmail,
		"candidate_email":    candidateEmail,
		"candidate_name":     candidateName,
		"position":           req.Position,
		"interview_type":     req.InterviewType,
		"interview_platform": 0,
		"interview_url":      req.InterviewURL,
		"scheduled_at":       req.ScheduledAt,
		"scheduled_duration": req.ScheduledDuration,
		"status":             "scheduled",
		"created_at":         createdAt,
	})
}

func (h *AdminHandlers) ListInterviewSessionsIndividualCandiate(c *gin.Context) {
	candidateID := c.Query("candidate_id")
	applicationID := c.Query("application_id")
	filter := c.DefaultQuery("filter", "all")
	status := c.Query("status")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	args := []interface{}{}
	argCount := 1
	conditions := []string{}

	if candidateID != "" {
		conditions = append(conditions, fmt.Sprintf("candidate_id = $%d", argCount))
		args = append(args, candidateID)
		argCount++
	}

	if applicationID != "" {
		conditions = append(conditions, fmt.Sprintf("application_id = $%d", argCount))
		args = append(args, applicationID)
		argCount++
	}

	if status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argCount))
		args = append(args, status)
		argCount++
	}

	now := time.Now().UTC()
	switch filter {
	case "upcoming":
		conditions = append(conditions, fmt.Sprintf("scheduled_at > $%d", argCount))
		args = append(args, now)
		argCount++
	case "past":
		conditions = append(conditions, fmt.Sprintf("scheduled_at <= $%d", argCount))
		args = append(args, now)
		argCount++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM interview_sessions %s", where)
	if err := h.DB.QueryRowContext(c.Request.Context(), countQuery, args...).Scan(&total); err != nil {
		log.Printf("Error counting interview sessions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count sessions"})
		return
	}

	orderDir := "ASC"
	if filter == "past" {
		orderDir = "DESC"
	}

	query := fmt.Sprintf(`
		SELECT
			id, session_id, candidate_id, application_id,
			interviewer_email, position, interview_type,
			interview_url, scheduled_at, scheduled_duration,
			status, created_at, metadata
		FROM interview_sessions
		%s
		ORDER BY scheduled_at %s
		LIMIT $%d OFFSET $%d
	`, where, orderDir, argCount, argCount+1)
	args = append(args, limit, offset)

	rows, err := h.DB.QueryContext(c.Request.Context(), query, args...)
	if err != nil {
		log.Printf("Error querying interview sessions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch sessions"})
		return
	}
	defer rows.Close()

	type Session struct {
		ID                int64     `json:"id"`
		SessionID         string    `json:"session_id"`
		CandidateID       string    `json:"candidate_id"`
		ApplicationID     *string   `json:"application_id"`
		InterviewerEmail  string    `json:"interviewer_email"`
		Position          string    `json:"position"`
		InterviewType     string    `json:"interview_type"`
		InterviewURL      string    `json:"interview_url"`
		ScheduledAt       time.Time `json:"scheduled_at"`
		ScheduledDuration int       `json:"scheduled_duration"`
		Status            string    `json:"status"`
		CreatedAt         time.Time `json:"created_at"`
		Metadata          string    `json:"metadata"`
		IsUpcoming        bool      `json:"is_upcoming"`
	}

	sessions := []Session{}
	for rows.Next() {
		var s Session
		var applicationID sql.NullString
		var metadata sql.NullString

		if err := rows.Scan(
			&s.ID, &s.SessionID, &s.CandidateID, &applicationID,
			&s.InterviewerEmail, &s.Position, &s.InterviewType,
			&s.InterviewURL, &s.ScheduledAt, &s.ScheduledDuration,
			&s.Status, &s.CreatedAt, &metadata,
		); err != nil {
			log.Printf("Error scanning session: %v", err)
			continue
		}

		if applicationID.Valid {
			s.ApplicationID = &applicationID.String
		}
		if metadata.Valid {
			s.Metadata = metadata.String
		}
		s.IsUpcoming = s.ScheduledAt.After(now)

		sessions = append(sessions, s)
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error iterating sessions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch sessions"})
		return
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	c.JSON(http.StatusOK, gin.H{
		"data":        sessions,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": totalPages,
		"filter":      filter,
	})
}
func (h *AdminHandlers) ListInterviewers(c *gin.Context) {
	callerRole := c.GetString("admin_role")
	callerID := c.GetString("admin_id")

	if callerRole != "hr" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	rows, err := h.DB.QueryContext(c.Request.Context(), `
		SELECT id, email, full_name
		FROM administrators
		WHERE is_active = true
		AND (role = 'interviewer' OR id = $1)
		ORDER BY full_name ASC
	`, callerID)
	if err != nil {
		log.Printf("ListInterviewers: failed to fetch: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch interviewers"})
		return
	}
	defer rows.Close()

	var interviewers []gin.H
	for rows.Next() {
		var id, email, fullName string
		if err := rows.Scan(&id, &email, &fullName); err != nil {
			continue
		}
		interviewers = append(interviewers, gin.H{
			"interviewer_id": id,
			"email":          email,
			"full_name":      fullName,
		})
	}

	c.JSON(http.StatusOK, gin.H{"interviewers": interviewers})
}
