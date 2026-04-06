package candidate

import (
	"database/sql"
	"encoding/json"
	"math"

	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
	"vigilant/config"
	"vigilant/models"

	"github.com/gin-gonic/gin"
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

func (h *Handlers) GetActiveInterview(c *gin.Context) {
	candidateID := c.Param("candidate_id")

	var session models.InterviewSession
	var position sql.NullString

	query := `
        SELECT id, session_id, status, position
        FROM interview_sessions
        WHERE candidate_id = $1 AND status IN ('scheduled', 'in_progress')
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
		"position":   position.String,
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

func (h *Handlers) CompleteOnboarding(c *gin.Context) {
	rawID, exists := c.Get("candidate_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	candidateID := fmt.Sprintf("%v", rawID)

	var req struct {
		PhoneNumber     string   `json:"phone_number"`
		GithubID        string   `json:"github_id"`
		ResumeLink      string   `json:"resume_link"`
		Skills          []string `json:"skills"`
		ExperienceYears int      `json:"experience_years"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if req.PhoneNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "phone_number is required"})
		return
	}
	if req.GithubID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "github_id is required"})
		return
	}
	if req.ResumeLink == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "resume_link is required"})
		return
	}
	if len(req.Skills) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "at least one skill is required"})
		return
	}
	if req.ExperienceYears < 0 || req.ExperienceYears > 50 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "experience_years must be between 0 and 50"})
		return
	}

	skillsStr := strings.Join(req.Skills, ",")

	result, err := h.DB.ExecContext(c.Request.Context(), `
		UPDATE candidates SET
			phone_number        = $1,
			github_url          = $2,
			resume_url          = $3,
			skills              = $4,
			experience_years    = $5,
			onboarding_complete = TRUE,
			updated_at          = NOW()
		WHERE id = $6::uuid
	`, req.PhoneNumber, req.GithubID, req.ResumeLink, skillsStr, req.ExperienceYears, candidateID)

	if err != nil {
		log.Printf("CompleteOnboarding: failed to update candidate %s: %v", candidateID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to complete onboarding"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		log.Printf("CompleteOnboarding: no rows updated for candidate_id=%q", candidateID)
		c.JSON(http.StatusNotFound, gin.H{"error": "candidate not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "onboarding complete"})
}

func (h *Handlers) GetOpenPositions(c *gin.Context) {
	query := `
		SELECT id, position_title
		FROM hiring_positions
		WHERE is_active = true AND status = 'active'
		ORDER BY created_at DESC
	`

	rows, err := h.DB.Query(query)
	if err != nil {
		log.Printf("Error querying open positions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve positions"})
		return
	}
	defer rows.Close()

	type OpenPosition struct {
		ID            string `json:"id"`
		PositionTitle string `json:"position_title"`
	}

	positions := []OpenPosition{}
	for rows.Next() {
		var pos OpenPosition

		if err := rows.Scan(&pos.ID, &pos.PositionTitle); err != nil {
			log.Printf("Error scanning position: %v", err)
			continue
		}

		positions = append(positions, pos)
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error iterating positions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve positions"})
		return
	}

	if len(positions) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"data":  []OpenPosition{},
			"total": 0,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  positions,
		"total": len(positions),
	})
}

func (h *Handlers) GetPositionDetails(c *gin.Context) {
	positionID := c.Param("id")

	var pos struct {
		ID                 string
		PositionTitle      string
		Department         string
		Location           string
		EmploymentType     string
		ExperienceRequired string
		SalaryRangeMin     sql.NullInt64
		SalaryRangeMax     sql.NullInt64
		SalaryRangeText    sql.NullString
		NumberOfOpenings   int
		JobDescription     string
		Requirements       string
	}

	query := `
		SELECT id, position_title, department, location, employment_type,
		       experience_required, salary_range_min, salary_range_max,
		       salary_range_text, number_of_openings, job_description, requirements
		FROM hiring_positions
		WHERE id = $1 AND is_active = true AND status = 'active'
	`

	err := h.DB.QueryRow(query, positionID).Scan(
		&pos.ID, &pos.PositionTitle, &pos.Department, &pos.Location,
		&pos.EmploymentType, &pos.ExperienceRequired,
		&pos.SalaryRangeMin, &pos.SalaryRangeMax, &pos.SalaryRangeText,
		&pos.NumberOfOpenings, &pos.JobDescription, &pos.Requirements,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "position not found"})
		return
	}
	if err != nil {
		log.Printf("Error fetching position details: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve position"})
		return
	}

	response := gin.H{
		"id":                  pos.ID,
		"position_title":      pos.PositionTitle,
		"department":          pos.Department,
		"location":            pos.Location,
		"employment_type":     pos.EmploymentType,
		"experience_required": pos.ExperienceRequired,
		"number_of_openings":  pos.NumberOfOpenings,
		"job_description":     pos.JobDescription,
		"requirements":        pos.Requirements,
	}

	if pos.SalaryRangeMin.Valid {
		response["salary_range_min"] = pos.SalaryRangeMin.Int64
	}
	if pos.SalaryRangeMax.Valid {
		response["salary_range_max"] = pos.SalaryRangeMax.Int64
	}
	if pos.SalaryRangeText.Valid {
		response["salary_range_text"] = pos.SalaryRangeText.String
	}

	c.JSON(http.StatusOK, gin.H{"data": response})
}
func (h *Handlers) ListPositions(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "10")
	search := strings.TrimSpace(c.Query("search"))
	status := strings.TrimSpace(c.Query("status"))
	department := strings.TrimSpace(c.Query("department"))
	location := strings.TrimSpace(c.Query("location"))
	isActive := c.DefaultQuery("is_active", "")

	candidateIDVal, exists := c.Get("candidate_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	candidateID, ok := candidateIDVal.(string)
	if !ok || candidateID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid candidate id"})
		return
	}

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
		whereConditions = append(whereConditions, fmt.Sprintf("(hp.position_title ILIKE $%d OR hp.job_description ILIKE $%d)", len(args)+1, len(args)+1))
		args = append(args, "%"+search+"%")
	}
	if status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("hp.status = $%d", len(args)+1))
		args = append(args, status)
	}
	if department != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("hp.department ILIKE $%d", len(args)+1))
		args = append(args, "%"+department+"%")
	}
	if location != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("hp.location ILIKE $%d", len(args)+1))
		args = append(args, "%"+location+"%")
	}
	if isActive != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("hp.is_active = $%d", len(args)+1))
		args = append(args, isActive == "true")
	}

	where := ""
	if len(whereConditions) > 0 {
		where = "WHERE " + strings.Join(whereConditions, " AND ")
	}

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM hiring_positions hp %s", where)
	if err := h.DB.QueryRow(countQuery, args...).Scan(&total); err != nil {
		log.Printf("Error counting positions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count positions"})
		return
	}

	candidateIDPlaceholder := fmt.Sprintf("$%d", len(args)+1)
	limitPlaceholder := fmt.Sprintf("$%d", len(args)+2)
	offsetPlaceholder := fmt.Sprintf("$%d", len(args)+3)
	args = append(args, candidateID, limit, offset)

	query := fmt.Sprintf(`
		SELECT
			hp.id, hp.position_title, hp.department, hp.location,
			hp.employment_type, hp.experience_required,
			hp.salary_range_min, hp.salary_range_max, hp.salary_range_text,
			hp.number_of_openings, hp.job_description, hp.requirements,
			hp.status, hp.created_at, hp.updated_at,
			hp.created_by, hp.updated_by, hp.is_active,

			-- application info
			ja.id           AS application_id,
			ja.status       AS application_status,
			ja.applied_at   AS applied_at,

			-- interview session info (only if exists)
			is2.scheduled_at   AS interview_scheduled_at,
			is2.interview_url  AS interview_url,
			is2.status         AS interview_status

		FROM hiring_positions hp
		LEFT JOIN job_applications ja
			ON ja.position_id = hp.id AND ja.candidate_id = %s
		LEFT JOIN LATERAL (
			SELECT scheduled_at, interview_url, status
			FROM interview_sessions
			WHERE application_id = ja.id
			ORDER BY created_at DESC
			LIMIT 1
		) is2 ON ja.id IS NOT NULL
		%s
		ORDER BY hp.created_at DESC
		LIMIT %s OFFSET %s
	`, candidateIDPlaceholder, where, limitPlaceholder, offsetPlaceholder)

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		log.Printf("Error querying positions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve positions"})
		return
	}
	defer rows.Close()

	type InterviewInfo struct {
		ScheduledAt  time.Time `json:"scheduled_at"`
		InterviewURL string    `json:"interview_url"`
		Status       string    `json:"status"`
	}

	type PositionWithApplication struct {
		models.HiringPosition
		ApplicationID     *string        `json:"application_id,omitempty"`
		ApplicationStatus *string        `json:"application_status,omitempty"`
		AppliedAt         *time.Time     `json:"applied_at,omitempty"`
		Interview         *InterviewInfo `json:"interview,omitempty"`
	}

	positions := []PositionWithApplication{}

	for rows.Next() {
		var pos models.HiringPosition
		var createdBy, updatedBy, salaryRangeText sql.NullString

		var applicationID, applicationStatus sql.NullString
		var appliedAt sql.NullTime

		var interviewScheduledAt sql.NullTime
		var interviewURL, interviewStatus sql.NullString

		if err := rows.Scan(
			&pos.ID, &pos.PositionTitle, &pos.Department, &pos.Location,
			&pos.EmploymentType, &pos.ExperienceRequired,
			&pos.SalaryRangeMin, &pos.SalaryRangeMax, &salaryRangeText,
			&pos.NumberOfOpenings, &pos.JobDescription, &pos.Requirements,
			&pos.Status, &pos.CreatedAt, &pos.UpdatedAt,
			&createdBy, &updatedBy, &pos.IsActive,
			&applicationID, &applicationStatus, &appliedAt,
			&interviewScheduledAt, &interviewURL, &interviewStatus,
		); err != nil {
			log.Printf("Error scanning position: %v", err)
			continue
		}

		if createdBy.Valid {
			pos.CreatedBy = createdBy.String
		}
		if updatedBy.Valid {
			pos.UpdatedBy = updatedBy.String
		}
		if salaryRangeText.Valid {
			pos.SalaryRangeText = salaryRangeText.String
		}

		entry := PositionWithApplication{HiringPosition: pos}

		if applicationID.Valid {
			entry.ApplicationID = &applicationID.String
			entry.ApplicationStatus = &applicationStatus.String
			if appliedAt.Valid {
				entry.AppliedAt = &appliedAt.Time
			}
		}

		if interviewScheduledAt.Valid {
			entry.Interview = &InterviewInfo{
				ScheduledAt:  interviewScheduledAt.Time,
				InterviewURL: interviewURL.String,
				Status:       interviewStatus.String,
			}
		}

		positions = append(positions, entry)
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
func (h *Handlers) ApplyForPosition(c *gin.Context) {

	candidateIDVal, exists := c.Get("candidate_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	candidateID, ok := candidateIDVal.(string)
	if !ok || candidateID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token claims"})
		return
	}

	positionID := c.Param("position_id")
	if positionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "position_id is required"})
		return
	}

	var req models.CreateJobApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req = models.CreateJobApplicationRequest{}
	}

	var positionExists bool
	err := h.DB.QueryRow(`
        SELECT EXISTS(
            SELECT 1 FROM hiring_positions 
            WHERE id = $1 AND is_active = TRUE AND status = 'active'
        )
    `, positionID).Scan(&positionExists)
	if err != nil {
		log.Printf("Error verifying position: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify position"})
		return
	}
	if !positionExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "position not found or no longer active"})
		return
	}

	var app models.JobApplication
	var coverLetter sql.NullString
	err = h.DB.QueryRow(`
        INSERT INTO job_applications (candidate_id, position_id, cover_letter)
        VALUES ($1, $2, $3)
        RETURNING id, candidate_id, position_id, status, applied_at, updated_at, cover_letter
    `, candidateID, positionID, req.CoverLetter).Scan(
		&app.ID, &app.CandidateID, &app.PositionID,
		&app.Status, &app.AppliedAt, &app.UpdatedAt, &coverLetter,
	)
	if err != nil {
		if strings.Contains(err.Error(), "unique constraint") || strings.Contains(err.Error(), "duplicate key") {
			c.JSON(http.StatusConflict, gin.H{"error": "you have already applied for this position"})
			return
		}
		log.Printf("Error creating application: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to submit application"})
		return
	}

	if coverLetter.Valid {
		app.CoverLetter = coverLetter.String
	}

	c.JSON(http.StatusCreated, gin.H{"data": app})
}

func (h *Handlers) JoinInterviewSession(c *gin.Context) {
	sessionID := c.Param("session_id")

	candidateSessionIDVal, exists := c.Get("candidate_session_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	candidateSessionID, ok := candidateSessionIDVal.(string)
	if !ok || candidateSessionID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
		return
	}

	result, err := h.DB.Exec(`
        UPDATE interview_sessions
        SET candidate_session_id = $1,
            started_at = NOW(),
            status = 'in_progress'
        WHERE session_id = $2
          AND status = 'scheduled'
    `, candidateSessionID, sessionID)
	if err != nil {
		log.Printf("JoinInterviewSession: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to join session"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found or already started"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "joined session", "session_id": sessionID})
}
