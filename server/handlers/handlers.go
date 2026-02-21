package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"
	"fmt"
	"strings"
	"github.com/gin-gonic/gin"
	"vigilant/models"
)


type Handlers struct {
	DB *sql.DB
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
    query := `
        SELECT id, session_id, status, position
        FROM interview_sessions
        WHERE candidate_id = $1 AND status = 'in_progress'
        ORDER BY started_at DESC LIMIT 1`

    err := h.DB.QueryRow(query, candidateID).Scan(
        &session.ID,
        &session.SessionID,
        &session.Status,
        &session.Position,
    )

    if err == sql.ErrNoRows {
        c.JSON(http.StatusNotFound, gin.H{"error": "no active interview found"})
        return
    } else if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
        return
    }

    c.JSON(http.StatusOK, session)
}

func (h *Handlers) CreateProcessLogs(c *gin.Context) {
    var batch models.ProcessLogBatch

    if err := c.ShouldBindJSON(&batch); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid log data format"})
        return
    }

    if len(batch.Processes) == 0 {
        c.JSON(http.StatusOK, gin.H{"message": "No processes to log"})
        return
    }

    queryPrefix := `INSERT INTO process_logs (
        interview_session_id, candidate_session_id, pid, ppid, name,
        path, cmd, memory, cpu_usage, is_user_app, is_gui_app,
        username, process_type, category, confidence, is_unknown,
        is_suspicious, is_electron, alert_level
    ) VALUES `

    values := []interface{}{}
    placeholders := []string{}
    argCount := 1

    for _, p := range batch.Processes {
        row := fmt.Sprintf("($%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d, $%d)",
            argCount, argCount+1, argCount+2, argCount+3, argCount+4,
            argCount+5, argCount+6, argCount+7, argCount+8, argCount+9,
            argCount+10, argCount+11, argCount+12, argCount+13, argCount+14,
            argCount+15, argCount+16, argCount+17, argCount+18)

        placeholders = append(placeholders, row)

        values = append(values,
            batch.InterviewSessionID,
            batch.CandidateSessionID,
            p.PID,
            p.PPID,
            p.Name,
            p.Path,
            p.Cmd,
            p.Memory,
            p.CPUUsage,
            p.IsUserApp,
            p.IsGuiApp,
            p.Username,
            p.ProcessType,
            p.Category,
            p.Confidence,
            p.IsUnknown,
            p.IsSuspicious,
            p.IsElectron,
            p.AlertLevel,
        )
        argCount += 19
    }

    finalQuery := queryPrefix + strings.Join(placeholders, ",")

    _, err := h.DB.Exec(finalQuery, values...)
    if err != nil {
        log.Printf("Bulk log insert failed: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store process logs"})
        return
    }


    c.JSON(http.StatusCreated, gin.H{
        "status":  "success",
        "message": "Logs processed",
        "count":   len(batch.Processes),
    })
}
func (h *Handlers) CreateInterviewSession(c *gin.Context) {
    var session models.InterviewSession

    if err := c.ShouldBindJSON(&session); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request format"})
        return
    }



	if session.Status == "" {
        session.Status = "in_progress"
    }

    query := `

        INSERT INTO interview_sessions (
            session_id, candidate_id, candidate_session_id,
            interviewer_email,
			 position, interview_type,
            scheduled_duration, metadata, status, started_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id, created_at`

    err := h.DB.QueryRow(query,
        session.SessionID,
        session.CandidateID,
        session.CandidateSessionID,
        session.InterviewerEmail,
        session.Position,
        session.InterviewType,
        session.ScheduledDuration,
        session.Metadata,
        session.Status,
    ).Scan(&session.ID, &session.CreatedAt)

    if err != nil {
        log.Printf("Error inserting interview session: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create interview session"})
        return
    }

    c.JSON(http.StatusCreated, session)
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

	if err := h.ensureSession(report.SessionID, report.CandidateEmail, report.CandidateName); err != nil {
		log.Printf("Error ensuring session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create session"})
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
		RETURNING id, timestamp
	`

	var id int64
	var timestamp time.Time
	err = h.DB.QueryRow(query, report.SessionID, processesJSON, alertCount, highMemAlerts, electronAlerts).Scan(&id, &timestamp)
	if err != nil {
		log.Printf("Error inserting process report: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save process report"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":         id,
		"session_id": report.SessionID,
		"timestamp":  timestamp,
		"alerts":     alertCount,
	})
}

func (h *Handlers) GetProcessReports(c *gin.Context) {
	sessionID := c.Param("session_id")

	query := `
		SELECT id, session_id, timestamp, processes, alert_count, high_memory_alerts, unknown_electron_alerts
		FROM process_reports
		WHERE session_id = $1
		ORDER BY timestamp DESC
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
		var timestamp time.Time
		var processesJSON []byte
		var alertCount, highMemAlerts, electronAlerts int

		if err := rows.Scan(&id, &sessID, &timestamp, &processesJSON, &alertCount, &highMemAlerts, &electronAlerts); err != nil {
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
			"timestamp":               timestamp,
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

	query := `UPDATE sessions SET ended_at = NOW() WHERE session_id = $1`
	_, err := h.DB.Exec(query, sessionID)
	if err != nil {
		log.Printf("Error ending session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to end session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":     "success",
		"session_id": sessionID,
	})
}

func (h *Handlers) ensureSession(sessionID, email, name string) error {
	query := `
		INSERT INTO sessions (session_id, candidate_email, candidate_name)
		VALUES ($1, $2, $3)
		ON CONFLICT (session_id) DO NOTHING
	`
	_, err := h.DB.Exec(query, sessionID, email, name)
	return err
}
