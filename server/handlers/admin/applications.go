package admin

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"
	"vigilant/models"

	"github.com/gin-gonic/gin"
)

func (h *AdminHandlers) UpdateJobApplicationStatus(c *gin.Context) {
	applicationID := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required,oneof=applied screening interviewing offered hired rejected withdrawn"`
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
	department := c.Query("department")

	includePositionDetails := c.DefaultQuery("include_position", "false") == "true"
	includeStats := c.DefaultQuery("include_stats", "false") == "true"

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	sortBy := c.DefaultQuery("sort_by", "applied_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	validStatuses := map[string]bool{
		"applied": true, "screening": true, "interviewing": true,
		"offered": true, "hired": true, "rejected": true, "withdrawn": true,
	}
	if status != "" && !validStatuses[status] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":          "invalid status",
			"valid_statuses": []string{"applied", "screening", "interviewing", "offered", "hired", "rejected", "withdrawn"},
		})
		return
	}

	validSortFields := map[string]string{
		"applied_at":     "ja.applied_at",
		"updated_at":     "ja.updated_at",
		"candidate_name": "c.full_name",
		"position_title": "p.position_title",
		"status":         "ja.status",
	}

	sortField, validSort := validSortFields[sortBy]
	if !validSort {
		sortField = "ja.applied_at"
	}

	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}

	var positionDetails *gin.H
	if positionID != "" && includePositionDetails {
		var positionTitle, dept, location, posStatus string
		err := h.DB.QueryRow(`
			SELECT position_title, department, location, status
			FROM hiring_positions
			WHERE id = $1::uuid
		`, positionID).Scan(&positionTitle, &dept, &location, &posStatus)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "position not found"})
			return
		}
		if err != nil {
			log.Printf("Error fetching position: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch position"})
			return
		}

		positionDetails = &gin.H{
			"id":         positionID,
			"title":      positionTitle,
			"department": dept,
			"location":   location,
			"status":     posStatus,
		}
	}

	countQuery := `
		SELECT COUNT(*)
		FROM job_applications ja
		JOIN candidates c ON ja.candidate_id = c.id
		JOIN hiring_positions p ON ja.position_id = p.id
		WHERE 1=1
	`

	query := `
		SELECT
			ja.id, ja.candidate_id, ja.position_id, ja.status,
			ja.cover_letter, ja.notes, ja.applied_at, ja.updated_at,
			c.email, c.full_name, c.phone_number, c.resume_url, c.skills, c.experience_years,
			p.position_title, p.department, p.location
		FROM job_applications ja
		JOIN candidates c ON ja.candidate_id = c.id
		JOIN hiring_positions p ON ja.position_id = p.id
		WHERE 1=1
	`

	args := []interface{}{}
	argCount := 1

	if status != "" {
		query += fmt.Sprintf(" AND ja.status = $%d", argCount)
		countQuery += fmt.Sprintf(" AND ja.status = $%d", argCount)
		args = append(args, status)
		argCount++
	}

	if positionID != "" {
		query += fmt.Sprintf(" AND ja.position_id = $%d::uuid", argCount)
		countQuery += fmt.Sprintf(" AND ja.position_id = $%d::uuid", argCount)
		args = append(args, positionID)
		argCount++
	}

	if candidateID != "" {
		query += fmt.Sprintf(" AND ja.candidate_id = $%d::uuid", argCount)
		countQuery += fmt.Sprintf(" AND ja.candidate_id = $%d::uuid", argCount)
		args = append(args, candidateID)
		argCount++
	}

	if department != "" {
		query += fmt.Sprintf(" AND p.department = $%d", argCount)
		countQuery += fmt.Sprintf(" AND p.department = $%d", argCount)
		args = append(args, department)
		argCount++
	}

	var totalCount int
	err := h.DB.QueryRow(countQuery, args...).Scan(&totalCount)
	if err != nil {
		log.Printf("Error counting job applications: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count applications"})
		return
	}

	var statsBreakdown map[string]int
	if includeStats {
		statsQuery := `
			SELECT status, COUNT(*) as count
			FROM job_applications ja
			JOIN candidates c ON ja.candidate_id = c.id
			JOIN hiring_positions p ON ja.position_id = p.id
			WHERE 1=1
		`

		statsArgCount := 1
		statsArgs := []interface{}{}

		if status != "" {
			statsQuery += fmt.Sprintf(" AND ja.status = $%d", statsArgCount)
			statsArgs = append(statsArgs, status)
			statsArgCount++
		}
		if positionID != "" {
			statsQuery += fmt.Sprintf(" AND ja.position_id = $%d::uuid", statsArgCount)
			statsArgs = append(statsArgs, positionID)
			statsArgCount++
		}
		if candidateID != "" {
			statsQuery += fmt.Sprintf(" AND ja.candidate_id = $%d::uuid", statsArgCount)
			statsArgs = append(statsArgs, candidateID)
			statsArgCount++
		}
		if department != "" {
			statsQuery += fmt.Sprintf(" AND p.department = $%d", statsArgCount)
			statsArgs = append(statsArgs, department)
			statsArgCount++
		}

		statsQuery += " GROUP BY status ORDER BY status"

		statsRows, err := h.DB.Query(statsQuery, statsArgs...)
		if err != nil {
			log.Printf("Warning: Failed to fetch stats: %v", err)
		} else {
			defer statsRows.Close()
			statsBreakdown = make(map[string]int)
			for statsRows.Next() {
				var st string
				var count int
				if err := statsRows.Scan(&st, &count); err == nil {
					statsBreakdown[st] = count
				}
			}
		}
	}

	query += fmt.Sprintf(" ORDER BY %s %s LIMIT $%d OFFSET $%d",
		sortField, sortOrder, argCount, argCount+1)
	args = append(args, limit, offset)

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		log.Printf("Error querying job applications: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch applications"})
		return
	}
	defer rows.Close()

	applications := []gin.H{}

	for rows.Next() {
		var app models.JobApplication
		var candidateEmail, candidateName, positionTitle, dept, location string
		var coverLetter, notes, phoneNumber, resumeURL, skills sql.NullString
		var experienceYears sql.NullInt16

		err := rows.Scan(
			&app.ID, &app.CandidateID, &app.PositionID, &app.Status,
			&coverLetter, &notes, &app.AppliedAt, &app.UpdatedAt,
			&candidateEmail, &candidateName, &phoneNumber, &resumeURL, &skills, &experienceYears,
			&positionTitle, &dept, &location,
		)
		if err != nil {
			log.Printf("Error scanning job application: %v", err)
			continue
		}

		var expYears uint8
		if experienceYears.Valid {
			expYears = uint8(experienceYears.Int16)
		}

		applications = append(applications, gin.H{
			"id":               app.ID,
			"candidate_id":     app.CandidateID,
			"candidate_email":  candidateEmail,
			"candidate_name":   candidateName,
			"candidate_phone":  phoneNumber.String,
			"resume_url":       resumeURL.String,
			"skills":           skills.String,
			"experience_years": expYears,
			"position_id":      app.PositionID,
			"position_title":   positionTitle,
			"department":       dept,
			"location":         location,
			"status":           app.Status,
			"cover_letter":     coverLetter.String,
			"notes":            notes.String,
			"applied_at":       app.AppliedAt,
			"updated_at":       app.UpdatedAt,
		})
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating job applications: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch applications"})
		return
	}

	totalPages := (totalCount + limit - 1) / limit

	response := gin.H{
		"applications": applications,
		"filters": gin.H{
			"status":       status,
			"position_id":  positionID,
			"candidate_id": candidateID,
			"department":   department,
		},
		"pagination": gin.H{
			"current_page": page,
			"per_page":     limit,
			"total_count":  totalCount,
			"total_pages":  totalPages,
			"has_next":     page < totalPages,
			"has_prev":     page > 1,
		},
		"sort": gin.H{
			"sort_by":    sortBy,
			"sort_order": sortOrder,
		},
	}

	if positionDetails != nil {
		response["position"] = positionDetails
	}

	if includeStats && statsBreakdown != nil {
		response["statistics"] = gin.H{
			"total_applications": totalCount,
			"status_breakdown":   statsBreakdown,
		}
	}

	c.JSON(http.StatusOK, response)
}

func (h *AdminHandlers) BulkUpdateJobApplicationStatus(c *gin.Context) {

}
