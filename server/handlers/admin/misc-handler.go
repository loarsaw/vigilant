package admin

import (
	"database/sql"
	"net/http"
	"time"
	"vigilant/websocket"

	"github.com/gin-gonic/gin"
)

type parsedUser struct {
	FullName string
	Email    string
}

func (h *AdminHandlers) ListLanguages(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"languages": []string{"c", "cpp", "js", "python", "java"},
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
	adminID := c.GetString("admin_id")
	adminRole := c.GetString("admin_role")

	stats := gin.H{}

	switch adminRole {
	case "superadmin":
		var totalCandidates int
		h.DB.QueryRow("SELECT COUNT(*) FROM candidates WHERE is_active = true").Scan(&totalCandidates)
		stats["total_candidates"] = totalCandidates

		var openPositions int
		h.DB.QueryRow("SELECT COUNT(*) FROM hiring_positions WHERE is_active = true").Scan(&openPositions)
		stats["open_positions"] = openPositions

		var activeInterviews int
		h.DB.QueryRow("SELECT COUNT(*) FROM interview_sessions WHERE status = 'in_progress'").Scan(&activeInterviews)
		stats["active_interviews"] = activeInterviews

		var upcomingInterviews int
		h.DB.QueryRow(`
            SELECT COUNT(*) FROM interview_sessions 
            WHERE status = 'scheduled' 
            AND scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
        `).Scan(&upcomingInterviews)
		stats["upcoming_interviews"] = upcomingInterviews

		var applicationsToday int
		h.DB.QueryRow("SELECT COUNT(*) FROM job_applications WHERE applied_at >= CURRENT_DATE").Scan(&applicationsToday)
		stats["applications_today"] = applicationsToday

		pipelineRows, err := h.DB.Query(`SELECT status, COUNT(*) FROM job_applications GROUP BY status`)
		if err == nil {
			defer pipelineRows.Close()
			pipeline := map[string]int{}
			for pipelineRows.Next() {
				var status string
				var count int
				pipelineRows.Scan(&status, &count)
				pipeline[status] = count
			}
			stats["pipeline"] = pipeline
		}

		var highRiskSessions int
		h.DB.QueryRow("SELECT COUNT(*) FROM alert_summary WHERE risk_score > 50").Scan(&highRiskSessions)
		stats["high_risk_sessions"] = highRiskSessions

		var suspiciousToday int
		h.DB.QueryRow(`
            SELECT COUNT(*) FROM process_logs 
            WHERE is_suspicious = true AND logged_at >= CURRENT_DATE
        `).Scan(&suspiciousToday)
		stats["suspicious_processes_today"] = suspiciousToday

		var totalAdmins int
		h.DB.QueryRow("SELECT COUNT(*) FROM administrators WHERE is_active = true").Scan(&totalAdmins)
		stats["total_admins"] = totalAdmins

		var emailPending int
		h.DB.QueryRow("SELECT COUNT(*) FROM email_jobs WHERE status = 'pending'").Scan(&emailPending)
		stats["email_pending"] = emailPending

		var emailFailedToday int
		h.DB.QueryRow(`
            SELECT COUNT(*) FROM email_jobs 
            WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '24 hours'
        `).Scan(&emailFailedToday)
		stats["email_failed_today"] = emailFailedToday

		upcomingRows, err := h.DB.Query(`
            SELECT 
                s.id,
                s.session_id, 
                s.candidate_id,
                s.scheduled_at, s.status,
                c.full_name AS candidate_name,
                COALESCE(a.full_name, 'Unassigned') AS interviewer_name,
                COALESCE(s.position, '') AS position
            FROM interview_sessions s
            JOIN candidates c ON c.id = s.candidate_id
            LEFT JOIN administrators a ON a.id = s.interviewer_id
            WHERE s.status IN ('scheduled', 'in_progress')
            AND s.scheduled_at >= NOW()
            ORDER BY s.scheduled_at ASC
            LIMIT 10
        `)
		if err == nil {
			defer upcomingRows.Close()
			stats["upcoming_list"] = scanInterviewRows(upcomingRows)
		}

	case "hr":
		var totalCandidates int
		h.DB.QueryRow("SELECT COUNT(*) FROM candidates WHERE is_active = true").Scan(&totalCandidates)
		stats["total_candidates"] = totalCandidates

		var openPositions int
		h.DB.QueryRow("SELECT COUNT(*) FROM hiring_positions WHERE is_active = true").Scan(&openPositions)
		stats["open_positions"] = openPositions

		var activeInterviews int
		h.DB.QueryRow("SELECT COUNT(*) FROM interview_sessions WHERE status = 'in_progress'").Scan(&activeInterviews)
		stats["active_interviews"] = activeInterviews

		var upcomingInterviews int
		h.DB.QueryRow(`
            SELECT COUNT(*) FROM interview_sessions 
            WHERE status = 'scheduled' 
            AND scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
        `).Scan(&upcomingInterviews)
		stats["upcoming_interviews"] = upcomingInterviews

		var applicationsToday int
		h.DB.QueryRow("SELECT COUNT(*) FROM job_applications WHERE applied_at >= CURRENT_DATE").Scan(&applicationsToday)
		stats["applications_today"] = applicationsToday

		pipelineRows, err := h.DB.Query(`SELECT status, COUNT(*) FROM job_applications GROUP BY status`)
		if err == nil {
			defer pipelineRows.Close()
			pipeline := map[string]int{}
			for pipelineRows.Next() {
				var status string
				var count int
				pipelineRows.Scan(&status, &count)
				pipeline[status] = count
			}
			stats["pipeline"] = pipeline
		}

		var highRiskSessions int
		h.DB.QueryRow("SELECT COUNT(*) FROM alert_summary WHERE risk_score > 50").Scan(&highRiskSessions)
		stats["high_risk_sessions"] = highRiskSessions

		upcomingRows, err := h.DB.Query(`
            SELECT 
                s.id,
                s.session_id, 
                s.candidate_id,
                s.scheduled_at, s.status,
                c.full_name AS candidate_name,
                COALESCE(a.full_name, 'Unassigned') AS interviewer_name,
                COALESCE(s.position, '') AS position
            FROM interview_sessions s
            JOIN candidates c ON c.id = s.candidate_id
            LEFT JOIN administrators a ON a.id = s.interviewer_id
            WHERE s.status IN ('scheduled', 'in_progress')
            AND s.scheduled_at >= NOW()
            ORDER BY s.scheduled_at ASC
            LIMIT 10
        `)
		if err == nil {
			defer upcomingRows.Close()
			stats["upcoming_list"] = scanInterviewRows(upcomingRows)
		}

	case "interviewer":
		var myUpcoming int
		h.DB.QueryRow(`
            SELECT COUNT(*) FROM interview_sessions 
            WHERE interviewer_id = $1 
            AND status = 'scheduled'
            AND scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
        `, adminID).Scan(&myUpcoming)
		stats["upcoming_interviews"] = myUpcoming

		var myActive int
		h.DB.QueryRow(`
            SELECT COUNT(*) FROM interview_sessions 
            WHERE interviewer_id = $1 AND status = 'in_progress'
        `, adminID).Scan(&myActive)
		stats["active_interviews"] = myActive

		var myTotal int
		h.DB.QueryRow(`
            SELECT COUNT(*) FROM interview_sessions WHERE interviewer_id = $1
        `, adminID).Scan(&myTotal)
		stats["total_interviews_assigned"] = myTotal

		upcomingRows, err := h.DB.Query(`
            SELECT 
                s.id,
                s.session_id, 
                s.candidate_id,
                s.scheduled_at, s.status,
                c.full_name AS candidate_name,
                COALESCE(a.full_name, '') AS interviewer_name,
                COALESCE(s.position, '') AS position
            FROM interview_sessions s
            JOIN candidates c ON c.id = s.candidate_id
            LEFT JOIN administrators a ON a.id = s.interviewer_id
            WHERE s.interviewer_id = $1
            AND s.status IN ('scheduled', 'in_progress')
            AND s.scheduled_at >= NOW()
            ORDER BY s.scheduled_at ASC
            LIMIT 10
        `, adminID)
		if err == nil {
			defer upcomingRows.Close()
			stats["upcoming_list"] = scanInterviewRows(upcomingRows)
		}

	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: unknown role"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// scanInterviewRows is a small helper to avoid duplicating the scan logic
func scanInterviewRows(rows *sql.Rows) []gin.H {
	var list []gin.H
	for rows.Next() {
		var id int
		var sessionID, candidateID, status, candidateName, interviewerName, position string
		var scheduledAt time.Time

		rows.Scan(
			&id,
			&sessionID,
			&candidateID,
			&scheduledAt,
			&status,
			&candidateName,
			&interviewerName,
			&position,
		)

		list = append(list, gin.H{
			"id":               id,
			"session_id":       sessionID,
			"candidate_id":     candidateID,
			"scheduled_at":     scheduledAt,
			"status":           status,
			"candidate_name":   candidateName,
			"interviewer_name": interviewerName,
			"position":         position,
		})
	}
	return list
}
