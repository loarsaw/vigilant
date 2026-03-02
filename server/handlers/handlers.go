package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
    "vigilant/config"	
	"time"
	"github.com/gin-gonic/gin"
	"vigilant/models"
	"github.com/google/uuid"
    "github.com/lib/pq"
    "errors"

)

type Handlers struct {
    DB  *sql.DB
    Cfg *config.Config
}


func (h *Handlers) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"timestamp": time.Now(),
		"service":   "vigilant-server",
	})
}

func (h *AdminHandlers) VerifyToken(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"message":       "Token is valid",
		"authenticated": true,
	})
}

func (h *AdminHandlers) EndInterviewSession(c *gin.Context) {
    id := c.Param("id")

    var req struct {
        Notes  string `json:"notes"`
        Status string `json:"status"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        req.Status = "completed"
    }

    query := `
        UPDATE interview_sessions
        SET ended_at = NOW(),
            status = $1,
            notes = $2
        WHERE id = $3 AND ended_at IS NULL`

    result, err := h.DB.Exec(query, req.Status, req.Notes, id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to close session"})
        return
    }

    rows, _ := result.RowsAffected()
    if rows == 0 {
        c.JSON(http.StatusNotFound, gin.H{"error": "session not found or already closed"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"status": "interview_ended", "id": id})
}


func (h *Handlers) GetActiveInterview(c *gin.Context) {
    candidateID := c.Param("candidate_id")

    var session models.InterviewSession
    var position sql.NullString 

    query := `
        SELECT id, session_id, status, position
        FROM interview_sessions
        WHERE candidate_id = $1 AND status = 'in_progress'
        ORDER BY started_at DESC LIMIT 1`

    err := h.DB.QueryRow(query, candidateID).Scan(
        &session.ID,
        &session.SessionID,
        &session.Status,
        &position,
    )

    if err == sql.ErrNoRows {
        c.JSON(http.StatusNotFound, gin.H{"error": "no active interview found"})
        return
    } else if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "id":         session.ID,
        "session_id": session.SessionID,
        "status":     session.Status,
        "position":   position.String, // empty string if NULL
    })
}

func (h *Handlers) CreateInterviewSession(c *gin.Context) {
    var req struct {
        CandidateSessionID string `json:"candidate_session_id"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request format"})
        return
    }

    if req.CandidateSessionID == "" {  // was == 0
        c.JSON(http.StatusBadRequest, gin.H{"error": "candidate_session_id is required"})
        return
    }

    var candidateID string
    err := h.DB.QueryRowContext(c.Request.Context(), `
        SELECT candidate_id FROM candidate_sessions WHERE id = $1 AND is_active = true
    `, req.CandidateSessionID).Scan(&candidateID)

    if err == sql.ErrNoRows {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired candidate session"})
        return
    }
    if err != nil {
        log.Printf("Error looking up candidate session: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
        return
    }

    sessionID := uuid.New().String()

    var id int
    var createdAt time.Time

    err = h.DB.QueryRowContext(c.Request.Context(), `
        INSERT INTO interview_sessions (
            session_id, candidate_id, candidate_session_id, status, started_at
        ) VALUES ($1, $2, $3, 'in_progress', NOW())
        RETURNING id, created_at
    `, sessionID, candidateID, req.CandidateSessionID).Scan(&id, &createdAt)

    if err != nil {
        var pqErr *pq.Error
        if errors.As(err, &pqErr) && pqErr.Code == "23503" {
            c.JSON(http.StatusBadRequest, gin.H{"error": "candidate session not found"})
            return
        }
        log.Printf("Error creating interview session: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create interview session"})
        return
    }

    c.JSON(http.StatusCreated, gin.H{
        "id":                   id,
        "session_id":           sessionID,
        "candidate_id":         candidateID,
        "candidate_session_id": req.CandidateSessionID,
        "status":               "in_progress",
        "created_at":           createdAt,
    })
}

func (h *Handlers) CreateProcessReport(c *gin.Context) {
	var report models.ProcessReport

	if err := c.ShouldBindJSON(&report); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if report.SessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id is required"})
		return
	}

	var sessionExists bool
	err := h.DB.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM interview_sessions WHERE session_id = $1)
	`, report.SessionID).Scan(&sessionExists)
	if err != nil || !sessionExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "interview session not found"})
		return
	}

	alertCount := 0
	highMemAlerts := 0
	electronAlerts := 0

	for _, p := range report.Processes {
		if p.IsUnknown {
			alertCount++
			if p.IsElectron {
				electronAlerts++
			} else if p.Memory > 500 {
				highMemAlerts++
			}
		}
	}

	processesJSON, err := json.Marshal(report.Processes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encode processes"})
		return
	}

	query := `
		INSERT INTO process_reports (session_id, processes, alert_count, high_memory_alerts, unknown_electron_alerts)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, reported_at
	`

	var id int64
	var reportedAt time.Time
	err = h.DB.QueryRow(query, report.SessionID, processesJSON, alertCount, highMemAlerts, electronAlerts).Scan(&id, &reportedAt)
	if err != nil {
		log.Printf("Error inserting process report: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save process report"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":         id,
		"session_id": report.SessionID,
		"timestamp":  reportedAt,
		"alerts":     alertCount,
	})
}
func (h *Handlers) GetProcessReports(c *gin.Context) {
	sessionID := c.Param("session_id")

	query := `
		SELECT id, session_id, reported_at, processes, alert_count, high_memory_alerts, unknown_electron_alerts
		FROM process_reports
		WHERE session_id = $1
		ORDER BY reported_at DESC
	`

	rows, err := h.DB.Query(query, sessionID)
	if err != nil {
		log.Printf("Error querying process reports: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve reports"})
		return
	}
	defer rows.Close()

	reports := []gin.H{}

	for rows.Next() {
		var id int64
		var sessID string
		var reportedAt time.Time
		var processesJSON []byte
		var alertCount, highMemAlerts, electronAlerts int

		if err := rows.Scan(&id, &sessID, &reportedAt, &processesJSON, &alertCount, &highMemAlerts, &electronAlerts); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		var processes []models.Process
		if err := json.Unmarshal(processesJSON, &processes); err != nil {
			log.Printf("Error unmarshaling processes: %v", err)
			continue
		}

		reports = append(reports, gin.H{
			"id":                      id,
			"session_id":              sessID,
			"timestamp":               reportedAt,
			"processes":               processes,
			"alert_count":             alertCount,
			"high_memory_alerts":      highMemAlerts,
			"unknown_electron_alerts": electronAlerts,
		})
	}

	c.JSON(http.StatusOK, reports)
}
func (h *Handlers) ListSessions(c *gin.Context) {
	query := `
		SELECT s.id, s.session_id, s.candidate_email, s.candidate_name, s.started_at, s.ended_at,
		       COUNT(pr.id) as report_count,
		       COALESCE(SUM(pr.alert_count), 0) as total_alerts
		FROM sessions s
		LEFT JOIN process_reports pr ON s.session_id = pr.session_id
		GROUP BY s.id, s.session_id, s.candidate_email, s.candidate_name, s.started_at, s.ended_at
		ORDER BY s.started_at DESC
	`

	rows, err := h.DB.Query(query)
	if err != nil {
		log.Printf("Error querying sessions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve sessions"})
		return
	}
	defer rows.Close()

	sessions := []gin.H{}

	for rows.Next() {
		var id int64
		var sessionID, candidateEmail, candidateName string
		var startedAt time.Time
		var endedAt sql.NullTime
		var reportCount, totalAlerts int

		if err := rows.Scan(&id, &sessionID, &candidateEmail, &candidateName, &startedAt, &endedAt, &reportCount, &totalAlerts); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		session := gin.H{
			"id":              id,
			"session_id":      sessionID,
			"candidate_email": candidateEmail,
			"candidate_name":  candidateName,
			"started_at":      startedAt,
			"report_count":    reportCount,
			"total_alerts":    totalAlerts,
		}

		if endedAt.Valid {
			session["ended_at"] = endedAt.Time
		}

		sessions = append(sessions, session)
	}

	c.JSON(http.StatusOK, sessions)
}

func (h *Handlers) EndSession(c *gin.Context) {
    sessionID := c.Param("session_id")

    var req struct {
        Notes  string `json:"notes"`
        Status string `json:"status"`
    }

    if err := c.ShouldBindJSON(&req); err != nil || req.Status == "" {
        req.Status = "completed"
    }

    query := `
        UPDATE interview_sessions
        SET ended_at = NOW(),
            status = $1,
            notes = $2
        WHERE session_id = $3 AND ended_at IS NULL
    `

    result, err := h.DB.Exec(query, req.Status, req.Notes, sessionID)
    if err != nil {
        log.Printf("Error ending session: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to end session"})
        return
    }

    rows, _ := result.RowsAffected()
    if rows == 0 {
        c.JSON(http.StatusNotFound, gin.H{"error": "session not found or already ended"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"status": "session_ended", "session_id": sessionID})
}



