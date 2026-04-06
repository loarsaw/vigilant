package admin

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"time"
	"vigilant/models"

	"github.com/gin-gonic/gin"
)

func (h *AdminHandlers) UpdateJobApplicationStatus(c *gin.Context) {
	applicationID := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required,oneof=applied screening interviewing offered hired rejected"`
		Notes  string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"details": err.Error(),
		})
		return
	}

	var currentApp models.JobApplication
	var coverLetter, notes sql.NullString

	err := h.DB.QueryRow(`
		SELECT id, candidate_id, position_id, status, cover_letter, notes, applied_at, updated_at
		FROM job_applications
		WHERE id = $1::uuid
	`, applicationID).Scan(
		&currentApp.ID,
		&currentApp.CandidateID,
		&currentApp.PositionID,
		&currentApp.Status,
		&coverLetter,
		&notes,
		&currentApp.AppliedAt,
		&currentApp.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "job application not found"})
		return
	}
	if err != nil {
		log.Printf("Error fetching job application: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch application"})
		return
	}

	currentApp.CoverLetter = coverLetter.String
	currentApp.Notes = notes.String

	var updatedAt time.Time
	err = h.DB.QueryRow(`
		UPDATE job_applications
		SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3::uuid
		RETURNING updated_at
	`, req.Status, req.Notes, applicationID).Scan(&updatedAt)

	if err != nil {
		log.Printf("Error updating job application status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update application status"})
		return
	}

	adminID, _ := c.Get("user_id")
	adminEmail, _ := c.Get("user_email")
	ipAddress := c.ClientIP()
	userAgent := c.Request.UserAgent()

	adminIDStr, _ := adminID.(string)
	adminEmailStr, _ := adminEmail.(string)

	_, err = h.DB.Exec(`
		INSERT INTO audit_log (
			candidate_id, action, entity_type, entity_id, description,
			metadata, ip_address, user_agent, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
	`,
		nil,
		"update_application_status",
		"job_application",
		applicationID,
		"Admin updated job application status from '"+currentApp.Status+"' to '"+req.Status+"'",
		`{"admin_id": "`+adminIDStr+`", "admin_email": "`+adminEmailStr+`", "old_status": "`+currentApp.Status+`", "new_status": "`+req.Status+`"}`,
		ipAddress,
		userAgent,
	)

	if err != nil {
		log.Printf("Warning: Failed to create audit log: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "application status updated successfully",
		"data": gin.H{
			"id":         applicationID,
			"status":     req.Status,
			"notes":      req.Notes,
			"updated_at": updatedAt,
		},
	})
}

func (h *AdminHandlers) GetJobApplication(c *gin.Context) {
	applicationID := c.Param("id")

	var app models.JobApplicationDetail
	var candidate models.Candidate
	var position models.HiringPosition

	var coverLetter, notes sql.NullString
	var phoneNumber, resumeURL, githubURL, skills sql.NullString
	var experienceYears sql.NullInt16

	err := h.DB.QueryRow(`
		SELECT
			ja.id, ja.candidate_id, ja.position_id, ja.status,
			ja.cover_letter, ja.notes, ja.applied_at, ja.updated_at,
			c.email, c.full_name, c.phone_number, c.resume_url, c.github_url,
			c.skills, c.experience_years,
			p.position_title, p.department, p.location, p.employment_type,
			p.experience_required, p.status as position_status
		FROM job_applications ja
		JOIN candidates c ON ja.candidate_id = c.id
		JOIN hiring_positions p ON ja.position_id = p.id
		WHERE ja.id = $1::uuid
	`, applicationID).Scan(
		&app.ID, &app.CandidateID, &app.PositionID, &app.Status,
		&coverLetter, &notes, &app.AppliedAt, &app.UpdatedAt,
		&candidate.Email, &candidate.FullName, &phoneNumber,
		&resumeURL, &githubURL, &skills,
		&experienceYears,
		&position.PositionTitle, &position.Department, &position.Location,
		&position.EmploymentType, &position.ExperienceRequired, &position.Status,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "job application not found"})
		return
	}
	if err != nil {
		log.Printf("Error fetching job application details: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch application"})
		return
	}

	// Unwrap nullable fields
	app.CoverLetter = coverLetter.String
	app.Notes = notes.String
	candidate.PhoneNumber = phoneNumber.String
	candidate.ResumeUrl = resumeURL.String
	candidate.GithubUrl = githubURL.String
	candidate.Skills = skills.String
	if experienceYears.Valid {
		candidate.ExperienceYears = uint8(experienceYears.Int16)
	}

	candidate.ID = app.CandidateID
	position.ID = app.PositionID
	app.Candidate = &candidate
	app.Position = &position

	c.JSON(http.StatusOK, gin.H{
		"application": app,
	})
}
func (h *AdminHandlers) ListJobApplications(c *gin.Context) {
	status := c.Query("status")
	positionID := c.Query("position_id")
	candidateID := c.Query("candidate_id")

	query := `
		SELECT
			ja.id, ja.candidate_id, ja.position_id, ja.status,
			ja.cover_letter, ja.notes, ja.applied_at, ja.updated_at,
			c.email, c.full_name,
			p.position_title, p.department
		FROM job_applications ja
		JOIN candidates c ON ja.candidate_id = c.id
		JOIN hiring_positions p ON ja.position_id = p.id
		WHERE 1=1
	`

	args := []interface{}{}
	argCount := 1

	if status != "" {
		query += fmt.Sprintf(" AND ja.status = $%d", argCount)
		args = append(args, status)
		argCount++
	}

	if positionID != "" {
		query += fmt.Sprintf(" AND ja.position_id = $%d", argCount)
		args = append(args, positionID)
		argCount++
	}

	if candidateID != "" {
		query += fmt.Sprintf(" AND ja.candidate_id = $%d", argCount)
		args = append(args, candidateID)
		argCount++
	}

	query += ` ORDER BY ja.applied_at DESC`

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		log.Printf("Error querying job applications: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch applications"})
		return
	}
	defer rows.Close()

	applications := []gin.H{} // ← initialize so JSON returns [] not null when empty

	for rows.Next() {
		var app models.JobApplication
		var candidateEmail, candidateName, positionTitle, department string
		var coverLetter, notes sql.NullString // ← these can be NULL in DB

		err := rows.Scan(
			&app.ID, &app.CandidateID, &app.PositionID, &app.Status,
			&coverLetter, &notes, &app.AppliedAt, &app.UpdatedAt,
			&candidateEmail, &candidateName,
			&positionTitle, &department,
		)
		if err != nil {
			log.Printf("Error scanning job application: %v", err)
			continue
		}

		applications = append(applications, gin.H{
			"id":              app.ID,
			"candidate_id":    app.CandidateID,
			"candidate_email": candidateEmail,
			"candidate_name":  candidateName,
			"position_id":     app.PositionID,
			"position_title":  positionTitle,
			"department":      department,
			"status":          app.Status,
			"cover_letter":    coverLetter.String,
			"notes":           notes.String,
			"applied_at":      app.AppliedAt,
			"updated_at":      app.UpdatedAt,
		})
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating job applications: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch applications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"applications": applications,
		"count":        len(applications),
	})
}

// TODO Bulk Update
func (h *AdminHandlers) BulkUpdateJobApplicationStatus(c *gin.Context) {
	// var req struct {
	// 	ApplicationIDs []string `json:"application_ids" binding:"required,min=1"`
	// 	Status         string   `json:"status" binding:"required,oneof=applied screening interviewing offered hired rejected withdrawn"`
	// 	Notes          string   `json:"notes"`
	// }

}
