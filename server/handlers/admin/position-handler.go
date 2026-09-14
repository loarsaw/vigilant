package admin

import (
	"database/sql"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"

	"vigilant/models"

	"github.com/gin-gonic/gin"
)

func (h *AdminHandlers) CreatePosition(c *gin.Context) {

	var req models.CreatePosition
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation failed",
			"details": err.Error(),
		})
		return
	}

	adminID := c.GetString("user_id")

	var createdBy *string
	if adminID != "" && adminID != "00000000-0000-0000-0000-000000000001" {
		createdBy = &adminID
	}

	var positionID string
	err := h.DB.QueryRow(`
        INSERT INTO hiring_positions (
            position_title, department, location, employment_type,
            experience_required, salary_range_min, salary_range_max,
            salary_range_text, number_of_openings, job_description,
            requirements, status, created_by, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
    `,
		req.PositionTitle, req.Department, req.Location, req.EmploymentType,
		req.ExperienceRequired, req.SalaryRangeMin, req.SalaryRangeMax,
		req.SalaryRangeText, req.NumberOfOpenings, req.JobDescription,
		req.Requirements, "active", createdBy, true,
	).Scan(&positionID)

	if err != nil {
		log.Printf("Error creating hiring position: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create position"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "position created successfully",
		"data": models.HiringPosition{
			ID:                 positionID,
			PositionTitle:      req.PositionTitle,
			Department:         req.Department,
			Location:           req.Location,
			EmploymentType:     req.EmploymentType,
			ExperienceRequired: req.ExperienceRequired,
			SalaryRangeMin:     req.SalaryRangeMin,
			SalaryRangeMax:     req.SalaryRangeMax,
			SalaryRangeText:    req.SalaryRangeText,
			NumberOfOpenings:   req.NumberOfOpenings,
			JobDescription:     req.JobDescription,
			Requirements:       req.Requirements,
			Status:             "active",
			CreatedBy:          createdBy,
			IsActive:           true,
		},
	})
}

func (h *AdminHandlers) GetCandidateApplications(c *gin.Context) {
	candidateID := c.Param("id")

	rows, err := h.DB.QueryContext(c.Request.Context(), `
		SELECT 
			ja.id              AS application_id,
			ja.status          AS application_status,
			ja.applied_at,
			hp.id              AS position_id,
			hp.position_title,
			hp.department,
			hp.location,
			hp.employment_type,
			c.full_name        AS candidate_name,
			c.email            AS candidate_email,
			is2.session_id     AS interview_session_id,
			is2.status         AS interview_status,
			is2.scheduled_at   AS interview_scheduled_at,
			is2.interview_url
		FROM job_applications ja
		JOIN hiring_positions hp ON hp.id = ja.position_id
		JOIN candidates c ON c.id = ja.candidate_id
		LEFT JOIN LATERAL (
			SELECT session_id, status, scheduled_at, interview_url
			FROM interview_sessions
			WHERE application_id = ja.id
			ORDER BY created_at DESC
			LIMIT 1
		) is2 ON true
		WHERE ja.candidate_id = $1
		ORDER BY ja.applied_at DESC
	`, candidateID)
	if err != nil {
		log.Printf("GetCandidateApplications: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch applications"})
		return
	}
	defer rows.Close()

	applications := []models.ApplicationRow{}

	for rows.Next() {
		var row models.ApplicationRow
		var interviewSessionID, interviewStatus, interviewURL sql.NullString
		var interviewScheduledAt sql.NullTime

		if err := rows.Scan(
			&row.ApplicationID,
			&row.ApplicationStatus,
			&row.AppliedAt,
			&row.PositionID,
			&row.PositionTitle,
			&row.Department,
			&row.Location,
			&row.EmploymentType,
			&row.CandidateName,
			&row.CandidateEmail,
			&interviewSessionID,
			&interviewStatus,
			&interviewScheduledAt,
			&interviewURL,
		); err != nil {
			log.Printf("GetCandidateApplications scan: %v", err)
			continue
		}

		if interviewSessionID.Valid {
			row.InterviewSessionID = &interviewSessionID.String
		}
		if interviewStatus.Valid {
			row.InterviewStatus = &interviewStatus.String
		}
		if interviewScheduledAt.Valid {
			row.InterviewScheduledAt = &interviewScheduledAt.Time
		}
		if interviewURL.Valid {
			row.InterviewURL = &interviewURL.String
		}

		applications = append(applications, row)
	}

	if err := rows.Err(); err != nil {
		log.Printf("GetCandidateApplications rows: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read applications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"candidate_id": candidateID,
		"total":        len(applications),
		"data":         applications,
	})
}

func (h *AdminHandlers) ListPositions(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "10")
	search := strings.TrimSpace(c.Query("search"))
	status := strings.TrimSpace(c.Query("status"))
	department := strings.TrimSpace(c.Query("department"))
	location := strings.TrimSpace(c.Query("location"))
	isActive := c.DefaultQuery("is_active", "")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	args := []interface{}{}
	whereConditions := []string{}

	if search != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("(position_title ILIKE $%d OR job_description ILIKE $%d)", len(args)+1, len(args)+1))
		args = append(args, "%"+search+"%")
	}

	if status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("status = $%d", len(args)+1))
		args = append(args, status)
	}

	if department != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("department ILIKE $%d", len(args)+1))
		args = append(args, "%"+department+"%")
	}

	if location != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("location ILIKE $%d", len(args)+1))
		args = append(args, "%"+location+"%")
	}

	if isActive != "" {
		isActiveBool := isActive == "true"
		whereConditions = append(whereConditions, fmt.Sprintf("is_active = $%d", len(args)+1))
		args = append(args, isActiveBool)
	}

	where := ""
	if len(whereConditions) > 0 {
		where = "WHERE " + strings.Join(whereConditions, " AND ")
	}

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM hiring_positions %s", where)
	if err := h.DB.QueryRow(countQuery, args...).Scan(&total); err != nil {
		log.Printf("Error counting positions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count positions"})
		return
	}

	limitPlaceholder := fmt.Sprintf("$%d", len(args)+1)
	offsetPlaceholder := fmt.Sprintf("$%d", len(args)+2)
	args = append(args, limit, offset)

	query := fmt.Sprintf(`
		SELECT id, position_title, department, location, employment_type,
		       experience_required, salary_range_min, salary_range_max,
		       salary_range_text, number_of_openings, job_description,
		       requirements, status, created_at, updated_at,
		       created_by, updated_by, is_active
		FROM hiring_positions %s
		ORDER BY created_at DESC
		LIMIT %s OFFSET %s
	`, where, limitPlaceholder, offsetPlaceholder)

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		log.Printf("Error querying positions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve positions"})
		return
	}
	defer rows.Close()

	positions := []models.HiringPosition{}
	for rows.Next() {
		var pos models.HiringPosition
		var createdBy, updatedBy sql.NullString
		var salaryRangeText sql.NullString

		if err := rows.Scan(
			&pos.ID, &pos.PositionTitle, &pos.Department, &pos.Location,
			&pos.EmploymentType, &pos.ExperienceRequired,
			&pos.SalaryRangeMin, &pos.SalaryRangeMax, &salaryRangeText,
			&pos.NumberOfOpenings, &pos.JobDescription, &pos.Requirements,
			&pos.Status, &pos.CreatedAt, &pos.UpdatedAt,
			&createdBy, &updatedBy, &pos.IsActive,
		); err != nil {
			log.Printf("Error scanning position: %v", err)
			continue
		}

		if createdBy.Valid {
			pos.CreatedBy = &createdBy.String
		}
		if updatedBy.Valid {
			pos.UpdatedBy = &updatedBy.String
		}
		if salaryRangeText.Valid {
			pos.SalaryRangeText = salaryRangeText.String
		}

		positions = append(positions, pos)
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error iterating positions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve positions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":        positions,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": int(math.Ceil(float64(total) / float64(limit))),
	})
}

func (h *AdminHandlers) GetPositionByID(c *gin.Context) {
	positionID := c.Param("id")

	var pos models.HiringPosition
	var createdBy, updatedBy, salaryRangeText sql.NullString

	err := h.DB.QueryRow(`
		SELECT id, position_title, department, location, employment_type,
		       experience_required, salary_range_min, salary_range_max,
		       salary_range_text, number_of_openings, job_description,
		       requirements, status, created_at, updated_at,
		       created_by, updated_by, is_active
		FROM hiring_positions
		WHERE id = $1
	`, positionID).Scan(
		&pos.ID, &pos.PositionTitle, &pos.Department, &pos.Location,
		&pos.EmploymentType, &pos.ExperienceRequired,
		&pos.SalaryRangeMin, &pos.SalaryRangeMax, &salaryRangeText,
		&pos.NumberOfOpenings, &pos.JobDescription, &pos.Requirements,
		&pos.Status, &pos.CreatedAt, &pos.UpdatedAt,
		&createdBy, &updatedBy, &pos.IsActive,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "position not found"})
		return
	}
	if err != nil {
		log.Printf("Error fetching position: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve position"})
		return
	}

	if createdBy.Valid {
		pos.CreatedBy = &createdBy.String
	}
	if updatedBy.Valid {
		pos.UpdatedBy = &updatedBy.String
	}
	if salaryRangeText.Valid {
		pos.SalaryRangeText = salaryRangeText.String
	}

	c.JSON(http.StatusOK, gin.H{"data": pos})
}

func (h *AdminHandlers) UpdatePositionActiveStatus(c *gin.Context) {
	positionID := c.Param("id")

	adminID := c.GetString("user_id")
	var updatedBy *string
	if adminID != "" && adminID != "00000000-0000-0000-0000-000000000001" {
		updatedBy = &adminID
	}

	var exists bool
	if err := h.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM hiring_positions WHERE id = $1)", positionID).Scan(&exists); err != nil {
		log.Printf("Error checking position existence: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check position"})
		return
	}

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "position not found"})
		return
	}
	// var newIsActive bool
	// var newStatus string

	result, err := h.DB.Exec(`
		UPDATE hiring_positions
        SET 
        	is_active = NOT is_active, 
            status = CASE WHEN NOT is_active THEN 'open' ELSE 'closed' END,
            updated_by = $1
		WHERE id = $2
	`, updatedBy, positionID)

	if err != nil {
		log.Printf("Error updating position status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update position"})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update position"})
		return
	}

	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "position not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "position status updated",
		"position_id": positionID,
	})
}

func (h *AdminHandlers) UpdatePosition(c *gin.Context) {
	positionID := c.Param("id")
	var req models.UpdateHiringPositionRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	adminID := c.GetString("user_id")
	var updatedBy *string
	if adminID != "" && adminID != "00000000-0000-0000-0000-000000000001" {
		updatedBy = &adminID
	}

	var exists bool
	if err := h.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM hiring_positions WHERE id = $1)", positionID).Scan(&exists); err != nil {
		log.Printf("Error checking position existence: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check position"})
		return
	}

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "position not found"})
		return
	}

	updates := []string{"updated_by = $1"}
	args := []interface{}{updatedBy} // ← *string, nil becomes SQL NULL
	argIndex := 2

	if req.PositionTitle != "" {
		updates = append(updates, fmt.Sprintf("position_title = $%d", argIndex))
		args = append(args, req.PositionTitle)
		argIndex++
	}
	if req.Department != "" {
		updates = append(updates, fmt.Sprintf("department = $%d", argIndex))
		args = append(args, req.Department)
		argIndex++
	}
	if req.Location != "" {
		updates = append(updates, fmt.Sprintf("location = $%d", argIndex))
		args = append(args, req.Location)
		argIndex++
	}
	if req.EmploymentType != "" {
		updates = append(updates, fmt.Sprintf("employment_type = $%d", argIndex))
		args = append(args, req.EmploymentType)
		argIndex++
	}
	if req.ExperienceRequired != "" {
		updates = append(updates, fmt.Sprintf("experience_required = $%d", argIndex))
		args = append(args, req.ExperienceRequired)
		argIndex++
	}
	if req.SalaryRangeMin != nil {
		updates = append(updates, fmt.Sprintf("salary_range_min = $%d", argIndex))
		args = append(args, *req.SalaryRangeMin)
		argIndex++
	}
	if req.SalaryRangeMax != nil {
		updates = append(updates, fmt.Sprintf("salary_range_max = $%d", argIndex))
		args = append(args, *req.SalaryRangeMax)
		argIndex++
	}
	if req.SalaryRangeText != "" {
		updates = append(updates, fmt.Sprintf("salary_range_text = $%d", argIndex))
		args = append(args, req.SalaryRangeText)
		argIndex++
	}
	if req.NumberOfOpenings > 0 {
		updates = append(updates, fmt.Sprintf("number_of_openings = $%d", argIndex))
		args = append(args, req.NumberOfOpenings)
		argIndex++
	}
	if req.JobDescription != "" {
		updates = append(updates, fmt.Sprintf("job_description = $%d", argIndex))
		args = append(args, req.JobDescription)
		argIndex++
	}
	if req.Requirements != "" {
		updates = append(updates, fmt.Sprintf("requirements = $%d", argIndex))
		args = append(args, req.Requirements)
		argIndex++
	}
	if req.Status != "" {
		updates = append(updates, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, req.Status)
		argIndex++
	}

	args = append(args, positionID)

	query := fmt.Sprintf(`
		UPDATE hiring_positions
		SET %s
		WHERE id = $%d
	`, strings.Join(updates, ", "), argIndex)

	result, err := h.DB.Exec(query, args...)
	if err != nil {
		log.Printf("Error updating position: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update position"})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "position not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "position updated successfully",
		"position_id": positionID,
	})
}

func (h *AdminHandlers) DeletePosition(c *gin.Context) {
	positionID := c.Param("id")

	result, err := h.DB.Exec("DELETE FROM hiring_positions WHERE id = $1", positionID)
	if err != nil {
		log.Printf("Error deleting position: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete position"})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "position not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "position deleted successfully",
		"position_id": positionID,
	})
}

func (h *AdminHandlers) GetPositionActivity(c *gin.Context) {
	positionID := c.Param("id")

	var positionTitle string
	if err := h.DB.QueryRow(`
		SELECT position_title FROM hiring_positions WHERE id = $1
	`, positionID).Scan(&positionTitle); err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "position not found"})
			return
		}
		log.Printf("Error fetching position for activity: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch position"})
		return
	}

	var overview struct {
		Total              int
		Qualified          int
		Shortlisted        int
		Interviewing       int
		Offered            int
		Hired              int
		Rejected           int
		AvgOverallScore    sql.NullFloat64
		AvgAssignmentScore sql.NullFloat64
	}

	err := h.DB.QueryRow(`
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE is_qualified),
			COUNT(*) FILTER (WHERE is_shortlisted),
			COUNT(*) FILTER (WHERE status = 'interviewing'),
			COUNT(*) FILTER (WHERE status = 'offered'),
			COUNT(*) FILTER (WHERE status = 'hired'),
			COUNT(*) FILTER (WHERE status = 'rejected'),
			AVG(overall_score) FILTER (WHERE overall_score IS NOT NULL),
			AVG(assignment_overall_score) FILTER (WHERE assignment_overall_score IS NOT NULL)
		FROM job_applications
		WHERE position_id = $1
	`, positionID).Scan(
		&overview.Total, &overview.Qualified, &overview.Shortlisted,
		&overview.Interviewing, &overview.Offered, &overview.Hired, &overview.Rejected,
		&overview.AvgOverallScore, &overview.AvgAssignmentScore,
	)
	if err != nil {
		log.Printf("Error fetching position activity overview: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch activity overview"})
		return
	}

	statusRows, err := h.DB.Query(`
		SELECT status, COUNT(*)
		FROM job_applications
		WHERE position_id = $1
		GROUP BY status
	`, positionID)
	if err != nil {
		log.Printf("Error fetching position status breakdown: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch status breakdown"})
		return
	}
	statusBreakdown := map[string]int{}
	for statusRows.Next() {
		var st string
		var count int
		if err := statusRows.Scan(&st, &count); err == nil {
			statusBreakdown[st] = count
		}
	}
	statusRows.Close()

	var radar struct {
		Technical      sql.NullFloat64
		Communication  sql.NullFloat64
		ProblemSolving sql.NullFloat64
		CulturalFit    sql.NullFloat64
		FeedbackCount  int
	}
	err = h.DB.QueryRow(`
		SELECT
			AVG(f.technical_skills_score),
			AVG(f.communication_score),
			AVG(f.problem_solving_score),
			AVG(f.cultural_fit_score),
			COUNT(*)
		FROM interview_feedback f
		JOIN interview_sessions s ON f.interview_session_id = s.id
		JOIN job_applications ja ON s.application_id = ja.id
		WHERE ja.position_id = $1
	`, positionID).Scan(
		&radar.Technical, &radar.Communication, &radar.ProblemSolving,
		&radar.CulturalFit, &radar.FeedbackCount,
	)
	if err != nil {
		log.Printf("Error fetching position radar data: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch scorecard averages"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"position_id":    positionID,
			"position_title": positionTitle,
			"overview": gin.H{
				"total_applications":   overview.Total,
				"qualified":            overview.Qualified,
				"shortlisted":          overview.Shortlisted,
				"interviewing":         overview.Interviewing,
				"offered":              overview.Offered,
				"hired":                overview.Hired,
				"rejected":             overview.Rejected,
				"avg_overall_score":    nullFloatOrNil(overview.AvgOverallScore),
				"avg_assignment_score": nullFloatOrNil(overview.AvgAssignmentScore),
			},
			"pipeline": statusBreakdown,
			"radar": gin.H{
				"feedback_count": radar.FeedbackCount,
				"dimensions": gin.H{
					"technical_skills": nullFloatOrNil(radar.Technical),
					"communication":    nullFloatOrNil(radar.Communication),
					"problem_solving":  nullFloatOrNil(radar.ProblemSolving),
					"cultural_fit":     nullFloatOrNil(radar.CulturalFit),
				},
			},
		},
	})
}
