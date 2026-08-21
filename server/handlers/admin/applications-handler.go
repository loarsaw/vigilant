// server/handlers/admin/applications-handler.go
package admin

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"
	"vigilant/models"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

func interviewerAssignedToApplication(db *sql.DB, adminID, applicationID string) (bool, error) {
	var exists bool
	err := db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM interview_sessions
			WHERE application_id = $1::uuid AND interviewer_id = $2::uuid
		)
	`, applicationID, adminID).Scan(&exists)
	return exists, err
}

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

	metadataBytes, merr := json.Marshal(map[string]string{
		"admin_id":    adminIDStr,
		"admin_email": adminEmailStr,
		"old_status":  currentApp.Status,
		"new_status":  req.Status,
	})
	if merr != nil {
		log.Printf("Warning: Failed to marshal audit metadata: %v", merr)
		metadataBytes = []byte(`{}`)
	}

	description := fmt.Sprintf("Admin updated job application status from '%s' to '%s'", currentApp.Status, req.Status)

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
		description,
		metadataBytes,
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

	adminRole, _ := c.Get("admin_role")
	if adminRole == "interviewer" {
		adminID, _ := c.Get("admin_id")
		idStr, _ := adminID.(string)

		assigned, err := interviewerAssignedToApplication(h.DB, idStr, applicationID)
		if err != nil {
			log.Printf("Error checking interviewer access for application %s: %v", applicationID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify access"})
			return
		}
		if !assigned {
			c.JSON(http.StatusForbidden, gin.H{"error": "you do not have access to this application"})
			return
		}
	}

	var app models.JobApplicationDetail
	var candidate models.Candidate
	var position models.HiringPosition
	var assignment models.Assignment

	var coverLetter, notes sql.NullString
	var phoneNumber, resumeURL, skills sql.NullString
	var githubURLs pq.StringArray
	var experienceYears sql.NullInt16
	var assignmentID, assignmentTitle, assignmentDescription sql.NullString
	var assignmentDifficulty sql.NullString
	var assignmentGeneratedByAI sql.NullBool

	var overallScore sql.NullFloat64
	var overallTier sql.NullString

	err := h.DB.QueryRow(`
		SELECT
			ja.id, ja.candidate_id, ja.position_id, ja.status,
			ja.cover_letter, ja.notes, ja.github_urls, ja.applied_at, ja.updated_at,
			ja.analyzed, ja.overall_score, ja.overall_tier, ja.is_shortlisted,
			c.email, c.full_name, c.phone_number, c.resume_url,
			c.skills, c.experience_years,
			p.position_title, p.department, p.location, p.employment_type,
			p.experience_required, p.status as position_status,
			COALESCE(ja.assignment_id, p.assignment_id), a.title, a.description,
			a.difficulty_level, a.generated_by_ai
		FROM job_applications ja
		JOIN candidates c ON ja.candidate_id = c.id
		JOIN hiring_positions p ON ja.position_id = p.id
		LEFT JOIN assignments a ON a.id = COALESCE(ja.assignment_id, p.assignment_id)
		WHERE ja.id = $1::uuid
	`, applicationID).Scan(
		&app.ID, &app.CandidateID, &app.PositionID, &app.Status,
		&coverLetter, &notes, &githubURLs, &app.AppliedAt, &app.UpdatedAt,
		&app.Analyzed, &overallScore, &overallTier, &app.IsShortlisted,
		&candidate.Email, &candidate.FullName, &phoneNumber,
		&resumeURL, &skills,
		&experienceYears,
		&position.PositionTitle, &position.Department, &position.Location,
		&position.EmploymentType, &position.ExperienceRequired, &position.Status,
		&assignmentID, &assignmentTitle, &assignmentDescription,
		&assignmentDifficulty, &assignmentGeneratedByAI,
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
	app.GithubUrls = []string(githubURLs)
	app.ResumeUrl = resumeURL.String
	app.Skills = skills.String
	if experienceYears.Valid {
		app.ExperienceYears = uint8(experienceYears.Int16)
	}
	if overallScore.Valid {
		app.OverallScore = &overallScore.Float64
	}
	app.OverallTier = overallTier.String
	if assignmentID.Valid {
		app.AssignmentID = assignmentID.String
	}
	candidate.PhoneNumber = phoneNumber.String

	candidate.ID = app.CandidateID
	position.ID = app.PositionID
	app.Candidate = &candidate
	app.Position = &position

	if assignmentID.Valid {
		assignment.ID = assignmentID.String
		assignment.Title = assignmentTitle.String
		assignment.Description = assignmentDescription.String
		assignment.DifficultyLevel = assignmentDifficulty.String
		assignment.GeneratedByAI = assignmentGeneratedByAI.Bool
		app.Assignment = &assignment

		var sub models.AssignmentSubmission
		var score sql.NullInt32
		var reviewedAt sql.NullTime

		serr := h.DB.QueryRow(`
			SELECT id, attempt_number, status, score, submitted_at, reviewed_at
			FROM assignment_submissions
			WHERE job_application_id = $1::uuid AND assignment_id = $2::uuid
			ORDER BY attempt_number DESC
			LIMIT 1
		`, applicationID, assignmentID.String).Scan(
			&sub.ID, &sub.AttemptNumber, &sub.Status, &score, &sub.SubmittedAt, &reviewedAt,
		)

		if serr == nil {
			if score.Valid {
				s := int(score.Int32)
				sub.Score = &s
			}
			if reviewedAt.Valid {
				r := reviewedAt.Time
				sub.ReviewedAt = &r
			}
			app.LatestSubmission = &sub
		} else if serr != sql.ErrNoRows {
			log.Printf("Warning: Failed to fetch latest submission: %v", serr)
		}
	}

	if h.AnalyzerService != nil {
		repoAnalyses, raErr := h.AnalyzerService.GetByApplicationID(applicationID)
		if raErr != nil {
			log.Printf("Warning: Failed to fetch repo analyses for application %s: %v", applicationID, raErr)
		} else {
			app.RepoAnalyses = repoAnalyses
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"application": app,
	})
}

func (h *AdminHandlers) ListJobApplications(c *gin.Context) {
	status := c.Query("status")
	positionID := c.Query("position_id")
	candidateID := c.Query("candidate_id")
	department := c.Query("department")
	shortlistedOnly := c.Query("is_shortlisted") == "true"
	shortlistedFilterSet := c.Query("is_shortlisted") != ""

	includePositionDetails := c.DefaultQuery("include_position", "false") == "true"
	includeStats := c.DefaultQuery("include_stats", "false") == "true"

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	sortBy := c.DefaultQuery("sort_by", "applied_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	adminRole, _ := c.Get("admin_role")
	adminID, _ := c.Get("admin_id")

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
		var assignmentID sql.NullString

		err := h.DB.QueryRow(`
			SELECT position_title, department, location, status, assignment_id
			FROM hiring_positions
			WHERE id = $1::uuid
		`, positionID).Scan(&positionTitle, &dept, &location, &posStatus, &assignmentID)

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

	baseJoins := `
		FROM job_applications ja
		JOIN candidates c ON ja.candidate_id = c.id
		JOIN hiring_positions p ON ja.position_id = p.id
	`

	args := []interface{}{}
	argCount := 1

	interviewerFilter := ""
	if adminRole == "interviewer" && adminID != nil {
		baseJoins += `
		JOIN interview_sessions isess ON ja.id = isess.application_id
		`
		interviewerFilter = fmt.Sprintf(`
			AND isess.interviewer_id = $%d
			AND isess.scheduled_at > NOW()
			AND isess.status IN ('scheduled', 'in_progress')
		`, argCount)
		args = append(args, adminID)
		argCount++
	}

	countQuery := `
		SELECT COUNT(DISTINCT ja.id)
	` + baseJoins + `
		WHERE 1=1
	` + interviewerFilter

	query := `
		SELECT DISTINCT
			ja.id, ja.candidate_id, ja.position_id, ja.status,
			ja.cover_letter, ja.notes, ja.github_urls, ja.applied_at, ja.updated_at,
			ja.analyzed, ja.overall_score, ja.overall_tier, ja.is_shortlisted,
			ja.resume_url, ja.skills, ja.experience_years,
			ja.github_repo_url, ja.github_invite_status,
			ja.assignment_overall_score, ja.assignment_overall_tier,
			c.email, c.full_name, c.phone_number,
			p.position_title, p.department, p.location,
			COALESCE(ja.assignment_id, p.assignment_id)
	` + baseJoins + `
		WHERE 1=1
	` + interviewerFilter

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

	if shortlistedFilterSet {
		query += fmt.Sprintf(" AND ja.is_shortlisted = $%d", argCount)
		countQuery += fmt.Sprintf(" AND ja.is_shortlisted = $%d", argCount)
		args = append(args, shortlistedOnly)
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
			SELECT ja.status, COUNT(DISTINCT ja.id) as count
		` + baseJoins + `
			WHERE 1=1
		` + interviewerFilter

		statsArgs := []interface{}{}
		statsArgCount := 1

		if adminRole == "interviewer" && adminID != nil {
			statsArgs = append(statsArgs, adminID)
			statsArgCount++
		}

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
		if shortlistedFilterSet {
			statsQuery += fmt.Sprintf(" AND ja.is_shortlisted = $%d", statsArgCount)
			statsArgs = append(statsArgs, shortlistedOnly)
			statsArgCount++
		}

		statsQuery += " GROUP BY ja.status ORDER BY ja.status"

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
		var coverLetter, notes, phoneNumber, resumeURL, skills, assignmentID sql.NullString
		var githubURLs pq.StringArray
		var experienceYears sql.NullInt16
		var overallScore sql.NullFloat64
		var overallTier sql.NullString
		var githubRepoURL, githubInviteStatus sql.NullString
		var assignmentOverallScore sql.NullFloat64
		var assignmentOverallTier sql.NullString

		err := rows.Scan(
			&app.ID, &app.CandidateID, &app.PositionID, &app.Status,
			&coverLetter, &notes, &githubURLs, &app.AppliedAt, &app.UpdatedAt,
			&app.Analyzed, &overallScore, &overallTier, &app.IsShortlisted,
			&resumeURL, &skills, &experienceYears,
			&githubRepoURL, &githubInviteStatus,
			&assignmentOverallScore, &assignmentOverallTier,
			&candidateEmail, &candidateName, &phoneNumber,
			&positionTitle, &dept, &location, &assignmentID,
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
			"github_urls":      []string(githubURLs),
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
			"analyzed":         app.Analyzed,
			"overall_score":    nullFloatOrNil(overallScore),
			"overall_tier":     overallTier.String,
			"is_shortlisted":   app.IsShortlisted,

			"assignment_overall_score": nullFloatOrNil(assignmentOverallScore),
			"assignment_overall_tier":  assignmentOverallTier.String,
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
			"status":         status,
			"position_id":    positionID,
			"candidate_id":   candidateID,
			"department":     department,
			"is_shortlisted": shortlistedFilterSet,
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

	if adminRole == "interviewer" {
		response["viewing_context"] = gin.H{
			"role":        "interviewer",
			"filter_note": "Showing only applications with upcoming interviews assigned to you",
		}
	}

	c.JSON(http.StatusOK, response)
}

func nullFloatOrNil(v sql.NullFloat64) interface{} {
	if !v.Valid {
		return nil
	}
	return v.Float64
}

func (h *AdminHandlers) BulkUpdateJobApplicationStatus(c *gin.Context) {

}

func (h *AdminHandlers) GetJobApplicationStatus(c *gin.Context) {
	applicationID := c.Param("id")

	var status string

	err := h.DB.QueryRow(`
        SELECT status
        FROM job_applications
        WHERE id = $1::uuid
    `, applicationID).Scan(&status)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "job application not found"})
		return
	}
	if err != nil {
		log.Printf("Error fetching job application status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch application status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"application_id": applicationID,
		"status":         status,
	})
}

func (h *AdminHandlers) ListMyInterviewSessions(c *gin.Context) {
	adminRole, _ := c.Get("admin_role")
	adminID, _ := c.Get("admin_id")

	if adminRole != "interviewer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only interviewers can view their assigned sessions"})
		return
	}
	idStr, ok := adminID.(string)
	if !ok || idStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	query := `
		SELECT isess.id, isess.session_id, isess.application_id, isess.candidate_id,
		       isess.position, isess.interview_type, isess.status,
		       isess.scheduled_at, isess.scheduled_duration, isess.interview_url,
		       c.full_name, c.email
		FROM interview_sessions isess
		JOIN candidates c ON isess.candidate_id = c.id
		WHERE isess.interviewer_id = $1::uuid
	`
	if c.Query("upcoming") == "true" {
		query += ` AND isess.scheduled_at > NOW() AND isess.status IN ('scheduled', 'in_progress')`
	}
	query += ` ORDER BY isess.scheduled_at DESC`

	rows, err := h.DB.Query(query, idStr)
	if err != nil {
		log.Printf("Error fetching interview sessions for interviewer %s: %v", idStr, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch interview sessions"})
		return
	}
	defer rows.Close()

	sessions := []gin.H{}
	for rows.Next() {
		var id int64
		var sessionID, status, position, interviewType, candidateName, candidateEmail string
		var applicationID, candidateID, interviewURL sql.NullString
		var scheduledAt sql.NullTime
		var scheduledDuration sql.NullInt32

		if err := rows.Scan(&id, &sessionID, &applicationID, &candidateID, &position, &interviewType,
			&status, &scheduledAt, &scheduledDuration, &interviewURL, &candidateName, &candidateEmail); err != nil {
			log.Printf("Error scanning interview session: %v", err)
			continue
		}

		sessions = append(sessions, gin.H{
			"id":                 id,
			"session_id":         sessionID,
			"application_id":     applicationID.String,
			"candidate_id":       candidateID.String,
			"candidate_name":     candidateName,
			"candidate_email":    candidateEmail,
			"position":           position,
			"interview_type":     interviewType,
			"status":             status,
			"scheduled_at":       scheduledAt.Time,
			"scheduled_duration": scheduledDuration.Int32,
			"interview_url":      interviewURL.String,
		})
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error iterating interview sessions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch interview sessions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"interview_sessions": sessions})
}
