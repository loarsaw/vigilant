package admin

import (
	"encoding/csv"
	"net/http"
	"path/filepath"
	"strings"
	"time"
	"vigilant/websocket"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
)

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

func processRows(records [][]string) []UserData {
	var users []UserData
	for i, row := range records {
		if i == 0 && strings.ToLower(row[0]) == "name" {
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

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "File open error"})
		return
	}
	defer file.Close()

	var users []UserData

	switch extension {
	case ".csv":
		records, err := csv.NewReader(file).ReadAll()
		if err != nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Invalid CSV format"})
			return
		}
		users = processRows(records)

	case ".xlsx":
		xlFile, err := excelize.OpenReader(file)
		if err != nil {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Invalid Excel format"})
			return
		}
		defer xlFile.Close()

		rows, err := xlFile.GetRows(xlFile.GetSheetName(0))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error reading Excel sheet"})
			return
		}
		users = processRows(rows)

	default:
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
