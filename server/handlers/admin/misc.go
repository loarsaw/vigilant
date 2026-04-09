package admin

import (
	"crypto/rand"
	"database/sql"
	"encoding/csv"
	"log"
	"math/big"
	"net/http"
	"path/filepath"
	"strings"
	"time"
	"vigilant/email"
	"vigilant/websocket"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
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
		log.Printf("ParseUserList: error opening file: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "File open error"})
		return
	}
	defer file.Close()

	var rows [][]string

	switch extension {
	case ".csv":
		reader := csv.NewReader(file)
		rows, err = reader.ReadAll()
		if err != nil {
			log.Printf("ParseUserList: csv read error: %v", err)
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Invalid CSV format"})
			return
		}
	case ".xlsx":
		xlFile, err := excelize.OpenReader(file)
		if err != nil {
			log.Printf("ParseUserList: excel open error: %v", err)
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Invalid Excel format"})
			return
		}
		defer xlFile.Close()
		rows, err = xlFile.GetRows(xlFile.GetSheetName(0))
		if err != nil {
			log.Printf("ParseUserList: excel row read error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error reading Excel sheet"})
			return
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Unsupported file type. Use .csv or .xlsx"})
		return
	}

	if len(rows) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "File is empty or missing data rows"})
		return
	}

	header := rows[0]
	nameIdx, emailIdx := -1, -1

	for i, col := range header {
		cleanCol := strings.ToLower(strings.TrimSpace(col))
		if cleanCol == "name" || cleanCol == "full name" || cleanCol == "fullname" {
			nameIdx = i
		} else if cleanCol == "email" || cleanCol == "email address" {
			emailIdx = i
		}
	}

	if nameIdx == -1 || emailIdx == -1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Missing required columns. Your file must have a 'name' and 'email' header.",
		})
		return
	}

	type parsedUser struct {
		FullName string
		Email    string
	}

	var users []parsedUser
	for i := 1; i < len(rows); i++ {
		row := rows[i]
		if len(row) <= nameIdx || len(row) <= emailIdx {
			continue
		}

		uName := strings.TrimSpace(row[nameIdx])
		uEmail := strings.ToLower(strings.TrimSpace(row[emailIdx]))

		if uName != "" && uEmail != "" {
			users = append(users, parsedUser{FullName: uName, Email: uEmail})
		}
	}

	if len(users) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "No valid user data found in file"})
		return
	}

	type preparedCandidate struct {
		ID            string
		Email         string
		PasswordHash  string
		FullName      string
		PlainPassword string
	}

	prepared := make([]preparedCandidate, 0, len(users))
	var prepareErrors []gin.H

	for i, u := range users {
		plainPassword, err := generateSecurePassword(12)
		if err != nil {
			log.Printf("ParseUserList: password gen fail for %s: %v", u.Email, err)
			prepareErrors = append(prepareErrors, gin.H{"index": i, "email": u.Email, "error": "password generation failed"})
			continue
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("ParseUserList: hash fail for %s: %v", u.Email, err)
			prepareErrors = append(prepareErrors, gin.H{"index": i, "email": u.Email, "error": "password hashing failed"})
			continue
		}

		prepared = append(prepared, preparedCandidate{
			ID:            uuid.New().String(),
			Email:         u.Email,
			PasswordHash:  string(hashedPassword),
			FullName:      u.FullName,
			PlainPassword: plainPassword,
		})
	}

	if len(prepareErrors) > 0 {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to prepare some candidates",
			"details": prepareErrors,
		})
		return
	}

	ctx := c.Request.Context()

	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		log.Printf("ParseUserList: tx begin error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Database error"})
		return
	}
	defer func() {
		if err := tx.Rollback(); err != nil && err != sql.ErrTxDone {
			log.Printf("ParseUserList: rollback error: %v", err)
		}
	}()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO candidates (id, email, password_hash, full_name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (email) DO NOTHING
		RETURNING id
	`)
	if err != nil {
		log.Printf("ParseUserList: stmt prepare error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Database preparation failed"})
		return
	}
	defer stmt.Close()

	inserted, skipped := 0, 0
	var newCandidates []preparedCandidate

	for _, candidate := range prepared {
		var returnedID string
		err = stmt.QueryRowContext(ctx,
			candidate.ID,
			candidate.Email,
			candidate.PasswordHash,
			candidate.FullName,
		).Scan(&returnedID)

		if err == sql.ErrNoRows {
			// skip if already exists
			log.Printf("ParseUserList: skipping existing email %s", candidate.Email)
			skipped++
			continue
		}
		if err != nil {
			log.Printf("ParseUserList: insert error for %s: %v", candidate.Email, err)
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to save user " + candidate.Email})
			return
		}

		inserted++
		newCandidates = append(newCandidates, candidate)
	}

	if err = tx.Commit(); err != nil {
		log.Printf("ParseUserList: commit error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Transaction commit failed"})
		return
	}

	emailsSent := 0
	var failedEmails []gin.H

	if len(newCandidates) > 0 {
		mailer, sesCfg, err := h.loadMailer(c)
		if err != nil {
			log.Printf("ParseUserList: mailer config missing: %v", err)
			for _, nc := range newCandidates {
				failedEmails = append(failedEmails, gin.H{
					"email": nc.Email,
					"error": "email service not configured",
				})
			}
		} else {
			emailData := make([]email.CandidateEmailData, 0, len(newCandidates))
			for _, nc := range newCandidates {
				emailData = append(emailData, email.CandidateEmailData{
					FullName: nc.FullName,
					Email:    nc.Email,
					Password: nc.PlainPassword,
				})
			}

			results := mailer.SendBulk(ctx, email.BuildBulkCredentialsEmails(emailData, sesCfg.SESLoginURL))
			for _, r := range results {
				if r.Success {
					emailsSent++
				} else {
					log.Printf("ParseUserList: email fail for %s: %s", r.Email, r.Error)
					failedEmails = append(failedEmails, gin.H{
						"email": r.Email,
						"error": r.Error,
					})
				}
			}
		}
	}

	response := gin.H{
		"success":      true,
		"total_parsed": len(users),
		"inserted":     inserted,
		"skipped":      skipped,
		"emails_sent":  emailsSent,
		"failed_count": len(failedEmails),
		"timestamp":    time.Now(),
	}

	if len(failedEmails) > 0 {
		response["failed_emails"] = failedEmails
	}

	c.JSON(http.StatusOK, response)
}

// generateSecurePassword generates a random alphanumeric+special password of given length.
func generateSecurePassword(length int) (string, error) {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	b := make([]byte, length)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		b[i] = charset[n.Int64()]
	}
	return string(b), nil
}
