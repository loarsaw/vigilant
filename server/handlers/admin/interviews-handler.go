package admin

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"
	"vigilant/email"
	"vigilant/middleware"
	"vigilant/models"
	"vigilant/utils"

	"os"

	_ "time/tzdata"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

// https://stackoverflow.com/a/16600612/15088678
var legacyTZAliases = map[string]string{
	"Asia/Calcutta": "Asia/Kolkata",
	"Asia/Katmandu": "Asia/Kathmandu",
	"Asia/Saigon":   "Asia/Ho_Chi_Minh",
	"Asia/Rangoon":  "Asia/Yangon",
	"Asia/Dacca":    "Asia/Dhaka",
	"Europe/Kiev":   "Europe/Kyiv",
	"US/Eastern":    "America/New_York",
	"US/Central":    "America/Chicago",
	"US/Mountain":   "America/Denver",
	"US/Pacific":    "America/Los_Angeles",
}

func normalizeTimezone(tz string) string {
	if canonical, ok := legacyTZAliases[tz]; ok {
		return canonical
	}
	return tz
}

func (h *AdminHandlers) CreateInterviewSession(c *gin.Context) {
	var req models.CreateInterviewSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request format", "details": err.Error()})
		return
	}

	loc, err := time.LoadLocation(normalizeTimezone(req.ScheduledTimezone))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid timezone", "details": err.Error()})
		return
	}

	const wallClockLayout = "2006-01-02T15:04:05"
	scheduledAtLocal, err := time.ParseInLocation(wallClockLayout, req.ScheduledAt, loc)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid scheduled_at format", "details": err.Error()})
		return
	}

	scheduledAtUTC := scheduledAtLocal.UTC()

	if !scheduledAtUTC.After(time.Now().UTC()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "scheduled_at must be in the future"})
		return
	}

	ctx := c.Request.Context()

	var candidateEmail, candidateName string
	err = h.DB.QueryRowContext(ctx, `
		SELECT email, full_name FROM candidates
		WHERE id = $1 AND is_active = true
	`, req.CandidateID).Scan(&candidateEmail, &candidateName)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"error": "candidate not found or inactive"})
		return
	}
	if err != nil {
		log.Printf("CreateInterviewSession: failed to fetch candidate: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	var interviewerEmail string
	var interviewerRole string
	err = h.DB.QueryRowContext(ctx, `
		SELECT email, role FROM administrators
		WHERE id = $1 AND is_active = true
	`, req.InterviewerID).Scan(&interviewerEmail, &interviewerRole)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusBadRequest, gin.H{"error": "interviewer not found or inactive"})
		return
	}
	if err != nil {
		log.Printf("CreateInterviewSession: failed to fetch interviewer: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	if interviewerRole != "interviewer" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "assigned admin is not an interviewer"})
		return
	}

	var finalApplicationID interface{}

	if req.ApplicationID != "" {
		var appExists bool
		err = h.DB.QueryRowContext(ctx, `
			SELECT EXISTS(
				SELECT 1 FROM job_applications
				WHERE id = $1 AND candidate_id = $2
			)
		`, req.ApplicationID, req.CandidateID).Scan(&appExists)
		if err != nil {
			log.Printf("CreateInterviewSession: failed to verify application: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			return
		}
		if appExists {
			finalApplicationID = req.ApplicationID
		}
	}

	if finalApplicationID == nil && req.PositionID != "" {
		var newAppID string
		err = h.DB.QueryRowContext(ctx, `
			INSERT INTO job_applications (candidate_id, position_id, cover_letter)
			VALUES ($1, $2, '')
			ON CONFLICT (candidate_id, position_id) DO UPDATE
				SET updated_at = NOW()
			RETURNING id
		`, req.CandidateID, req.PositionID).Scan(&newAppID)
		if err != nil {
			log.Printf("CreateInterviewSession: failed to auto-create application: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create application"})
			return
		}
		finalApplicationID = newAppID
	}

	sessionID := uuid.New().String()

	metadataBytes, err := json.Marshal(gin.H{
		"candidate_email": candidateEmail,
		"candidate_name":  candidateName,
		"timezone":        req.ScheduledTimezone,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to build metadata"})
		return
	}

	interviewPlatform := 1
	interviewURL := req.InterviewURL

	var id int64
	var createdAt time.Time

	err = h.DB.QueryRowContext(ctx, `
		INSERT INTO interview_sessions (
			session_id, candidate_id, candidate_session_id,
			application_id, interviewer_id, position,
			interview_type, interview_platform, interview_url,
			scheduled_at, scheduled_duration, status, metadata
		) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at
	`,
		sessionID,
		req.CandidateID,
		finalApplicationID,
		req.InterviewerID,
		req.Position,
		req.InterviewType,
		interviewPlatform,
		interviewURL,
		scheduledAtUTC,
		req.ScheduledDuration,
		"scheduled",
		string(metadataBytes),
	).Scan(&id, &createdAt)

	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23503" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid reference: candidate or interviewer not found"})
			return
		}
		log.Printf("CreateInterviewSession: failed to insert: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create interview session"})
		return
	}

	resolvedAppID := ""
	if finalApplicationID != nil {
		resolvedAppID = finalApplicationID.(string)
	}

	log.Printf("Interview session created. ID: %d, candidate: %s, interviewer: %s", id, candidateEmail, interviewerEmail)

	validFor := time.Until(scheduledAtUTC) + time.Duration(req.ScheduledDuration)*time.Minute + 2*time.Hour
	if validFor < 0 {
		validFor = time.Duration(req.ScheduledDuration)*time.Minute + 2*time.Hour
	}

	var livekitToken, livekitHost string
	if h.LiveKitService != nil {
		if _, err := h.LiveKitService.CreateRoom(ctx, sessionID); err != nil {
			log.Printf("CreateInterviewSession: failed to create LiveKit room for %s: %v", sessionID, err)
		} else {
			token, host, tokenErr := h.LiveKitService.GenerateToken(sessionID, candidateEmail, false, validFor)
			if tokenErr != nil {
				log.Printf("CreateInterviewSession: failed to generate candidate token for %s: %v", sessionID, tokenErr)
			} else {
				livekitToken, livekitHost = token, host
			}
		}
	} else {
		log.Printf("CreateInterviewSession: LiveKitService not configured, skipping room/token creation for %s", sessionID)
	}

	var passcode string
	var passcodeExpiresAt time.Time
	if livekitToken != "" {
		passcode, passcodeExpiresAt, err = h.createRoomPasscode(ctx, sessionID, livekitToken, livekitHost, scheduledAtUTC, validFor)
		if err != nil {
			log.Printf("CreateInterviewSession: failed to create passcode for %s: %v", sessionID, err)
		}
	} else {
		log.Printf("CreateInterviewSession: skipping passcode creation for %s — no livekit token", sessionID)
	}

	if passcode != "" {
		key, keyErr := email.DecodeKey(h.Cfg.EncryptionKey)
		if keyErr != nil {
			log.Printf("CreateInterviewSession: failed to decode encryption key for invite email: %v", keyErr)
		} else {
			sesCfg, sesErr := email.LoadSESConfig(ctx, h.DB, key)
			if sesErr != nil {
				log.Printf("CreateInterviewSession: failed to load SES config for invite email: %v", sesErr)
			} else {
				domain := os.Getenv("DOMAIN")
				if domain == "" {
					domain = "localhost"
				}

				body, renderErr := email.Render(email.TemplateInterviewJoinInvite, models.InterviewJoinInviteData{
					CandidateName: candidateName,
					Position:      req.Position,
					ScheduledAt:   scheduledAtLocal.Format("Mon, 02 Jan 2006 03:04 PM MST"),
					Duration:      req.ScheduledDuration,
					Passcode:      passcode,
					Domain:        email.ReverseDomain(domain),
				})
				if renderErr != nil {
					log.Printf("CreateInterviewSession: failed to render invite email: %v", renderErr)
				} else {
					_, enqueueErr := email.Enqueue(ctx, h.DB, email.EmailJob{
						ToEmail:     candidateEmail,
						ToName:      candidateName,
						FromEmail:   sesCfg.SESFromEmail,
						Subject:     fmt.Sprintf("Interview Scheduled: %s", req.Position),
						BodyHTML:    body,
						Template:    email.TemplateInterviewJoinInvite,
						EntityType:  "interview_session",
						EntityID:    sessionID,
						TriggeredBy: "create_interview_session",
						Priority:    email.PriorityHigh,
					})
					if enqueueErr != nil {
						log.Printf("CreateInterviewSession: failed to enqueue invite email: %v", enqueueErr)
					}
				}
			}
		}
	} else {
		log.Printf("CreateInterviewSession: skipping invite email for %s — passcode missing", sessionID)
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":                  id,
		"session_id":          sessionID,
		"candidate_id":        req.CandidateID,
		"application_id":      resolvedAppID,
		"interviewer_id":      req.InterviewerID,
		"interviewer_email":   interviewerEmail,
		"candidate_email":     candidateEmail,
		"candidate_name":      candidateName,
		"position":            req.Position,
		"interview_type":      req.InterviewType,
		"interview_platform":  interviewPlatform,
		"interview_url":       interviewURL,
		"scheduled_at":        scheduledAtUTC,
		"scheduled_timezone":  req.ScheduledTimezone,
		"scheduled_duration":  req.ScheduledDuration,
		"status":              "scheduled",
		"created_at":          createdAt,
		"passcode":            passcode,
		"passcode_expires_at": passcodeExpiresAt,
	})
}

// createRoomPasscode generates a unique passcode and stores it alongside the
// LiveKit room token/host for this session, retrying on rare collisions.
func (h *AdminHandlers) createRoomPasscode(ctx context.Context, sessionID, roomToken, roomHost string, interviewStartsAt time.Time, validFor time.Duration) (string, time.Time, error) {
	expiresAt := time.Now().UTC().Add(validFor)
	interviewStartsAt = interviewStartsAt.UTC()

	for attempt := 0; attempt < 5; attempt++ {
		passcode, err := utils.GeneratePasscode(8)
		if err != nil {
			return "", time.Time{}, err
		}

		_, err = h.DB.ExecContext(ctx, `
			INSERT INTO interview_room_passcodes (
				session_id, passcode, room_token, room_host, interview_starts_at, expires_at
			) VALUES ($1, $2, $3, $4, $5, $6)
		`, sessionID, passcode, roomToken, roomHost, interviewStartsAt, expiresAt)
		if err == nil {
			return passcode, expiresAt, nil
		}

		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" { // unique_violation on passcode
			continue
		}
		return "", time.Time{}, fmt.Errorf("insert passcode: %w", err)
	}

	return "", time.Time{}, fmt.Errorf("failed to generate unique passcode after retries")
}

func (h *AdminHandlers) ListApplicationInterviewFeedback(c *gin.Context) {
	applicationID := c.Param("id")
	if applicationID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "application_id is required"})
		return
	}

	role, _ := c.Get("admin_role")
	isSuperAdmin := role.(string) == "superadmin"

	interviewerID := ""
	if !isSuperAdmin {
		if id, exists := c.Get("admin_id"); exists {
			interviewerID = id.(string)
		}
	}

	args := []interface{}{applicationID}
	argCount := 2

	conditions := []string{
		"iss.application_id = $1",
		"iss.status = 'completed'",
	}

	if interviewerID != "" {
		conditions = append(conditions, fmt.Sprintf("iss.interviewer_id = $%d", argCount))
		args = append(args, interviewerID)
		argCount++
	}

	where := "WHERE " + strings.Join(conditions, " AND ")

	query := fmt.Sprintf(`
		SELECT
			iss.id, iss.session_id, iss.candidate_id, iss.application_id,
			iss.interviewer_id, iss.position, iss.interview_type,
			iss.interview_url, iss.scheduled_at, iss.scheduled_duration,
			iss.status, iss.created_at, iss.metadata,
			iss.started_at, iss.ended_at,

			f.id AS feedback_id,
			f.interviewer_id AS feedback_interviewer_id,
			f.technical_skills_score,
			f.communication_score,
			f.problem_solving_score,
			f.cultural_fit_score,
			f.overall_score,
			f.comments,
			f.recommendation,
			f.created_at AS feedback_created_at
		FROM interview_sessions iss
		LEFT JOIN interview_feedback f ON iss.id = f.interview_session_id
		%s
		ORDER BY iss.scheduled_at DESC
	`, where)

	rows, err := h.DB.QueryContext(c.Request.Context(), query, args...)
	if err != nil {
		log.Printf("ListApplicationInterviewFeedback: query error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch interview sessions"})
		return
	}
	defer rows.Close()

	sessions := []models.Session{}

	for rows.Next() {
		var s models.Session
		var appID, ivrID, metadata sql.NullString
		var startedAt, endedAt sql.NullTime

		var feedbackID sql.NullInt64
		var feedbackInterviewerID, comments, recommendation sql.NullString
		var technicalScore, communicationScore, problemSolvingScore, culturalFitScore sql.NullInt16
		var overallScore sql.NullFloat64
		var feedbackCreatedAt sql.NullTime

		if err := rows.Scan(
			&s.ID, &s.SessionID, &s.CandidateID, &appID,
			&ivrID, &s.Position, &s.InterviewType,
			&s.InterviewURL, &s.ScheduledAt, &s.ScheduledDuration,
			&s.Status, &s.CreatedAt, &metadata,
			&startedAt, &endedAt,

			&feedbackID, &feedbackInterviewerID,
			&technicalScore, &communicationScore,
			&problemSolvingScore, &culturalFitScore,
			&overallScore, &comments, &recommendation,
			&feedbackCreatedAt,
		); err != nil {
			log.Printf("ListApplicationInterviewFeedback: scan error: %v", err)
			continue
		}

		if appID.Valid {
			s.ApplicationID = &appID.String
		}
		if ivrID.Valid {
			s.InterviewerID = &ivrID.String
		}
		if metadata.Valid {
			s.Metadata = metadata.String
		}
		if startedAt.Valid {
			t := startedAt.Time.Format(time.RFC3339)
			s.StartedAt = &t
		}
		if endedAt.Valid {
			t := endedAt.Time.Format(time.RFC3339)
			s.EndedAt = &t
		}
		s.IsUpcoming = false

		if feedbackID.Valid {
			f := &models.Feedback{}
			f.ID = feedbackID.Int64
			if feedbackInterviewerID.Valid {
				f.InterviewerID = &feedbackInterviewerID.String
			}
			if technicalScore.Valid {
				v := int(technicalScore.Int16)
				f.TechnicalSkillsScore = &v
			}
			if communicationScore.Valid {
				v := int(communicationScore.Int16)
				f.CommunicationScore = &v
			}
			if problemSolvingScore.Valid {
				v := int(problemSolvingScore.Int16)
				f.ProblemSolvingScore = &v
			}
			if culturalFitScore.Valid {
				v := int(culturalFitScore.Int16)
				f.CulturalFitScore = &v
			}
			if overallScore.Valid {
				f.OverallScore = &overallScore.Float64
			}
			if comments.Valid {
				f.Comments = &comments.String
			}
			if recommendation.Valid {
				f.Recommendation = &recommendation.String
			}
			if feedbackCreatedAt.Valid {
				f.CreatedAt = feedbackCreatedAt.Time.Format(time.RFC3339)
			}
			s.Feedback = f
		}

		sessions = append(sessions, s)
	}

	if err := rows.Err(); err != nil {
		log.Printf("ListApplicationInterviewFeedback: rows error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch interview sessions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"application_id": applicationID,
		"total":          len(sessions),
		"data":           sessions,
	})
}

func (h *AdminHandlers) ListInterviewSessions(c *gin.Context) {
	candidateID := c.Query("candidate_id")
	applicationID := c.Query("application_id")
	filter := c.DefaultQuery("filter", "all")
	status := c.Query("status")
	role, _ := c.Get("admin_role")
	adminRole := role.(string)

	isSuperAdmin := adminRole == "superadmin"
	isHR := adminRole == "hr"

	interviewerID := c.Query("interviewer_id")
	if !isSuperAdmin && !isHR {
		if id, exists := c.Get("admin_id"); exists {
			interviewerID = id.(string)
		}
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	args := []interface{}{}
	argCount := 1
	conditions := []string{}

	if candidateID != "" {
		conditions = append(conditions, fmt.Sprintf("candidate_id = $%d", argCount))
		args = append(args, candidateID)
		argCount++
	}

	if applicationID != "" {
		conditions = append(conditions, fmt.Sprintf("application_id = $%d", argCount))
		args = append(args, applicationID)
		argCount++
	}

	if interviewerID != "" {
		conditions = append(conditions, fmt.Sprintf("interviewer_id = $%d", argCount))
		args = append(args, interviewerID)
		argCount++
	}

	if status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argCount))
		args = append(args, status)
		argCount++
	}

	now := time.Now().UTC()
	switch filter {
	case "upcoming":
		conditions = append(conditions, fmt.Sprintf("scheduled_at > $%d", argCount))
		args = append(args, now)
		argCount++
	case "past":
		conditions = append(conditions, fmt.Sprintf("scheduled_at <= $%d", argCount))
		args = append(args, now)
		argCount++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM interview_sessions %s", where)
	if err := h.DB.QueryRowContext(c.Request.Context(), countQuery, args...).Scan(&total); err != nil {
		log.Printf("ListInterviewSessions: count error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count sessions"})
		return
	}

	orderDir := "ASC"
	if filter == "past" {
		orderDir = "DESC"
	}

	query := fmt.Sprintf(`
		SELECT
			id, session_id, candidate_id, application_id,
			interviewer_id, position, interview_type,
			interview_url, scheduled_at, scheduled_duration,
			status, created_at, metadata
		FROM interview_sessions
		%s
		ORDER BY scheduled_at %s
		LIMIT $%d OFFSET $%d
	`, where, orderDir, argCount, argCount+1)
	args = append(args, limit, offset)

	rows, err := h.DB.QueryContext(c.Request.Context(), query, args...)
	if err != nil {
		log.Printf("ListInterviewSessions: query error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch sessions"})
		return
	}
	defer rows.Close()

	type Session struct {
		ID                int64     `json:"id"`
		SessionID         string    `json:"session_id"`
		CandidateID       string    `json:"candidate_id"`
		ApplicationID     *string   `json:"application_id"`
		InterviewerID     *string   `json:"interviewer_id"`
		Position          string    `json:"position"`
		InterviewType     string    `json:"interview_type"`
		InterviewURL      string    `json:"interview_url"`
		ScheduledAt       time.Time `json:"scheduled_at"`
		ScheduledDuration int       `json:"scheduled_duration"`
		Status            string    `json:"status"`
		CreatedAt         time.Time `json:"created_at"`
		Metadata          string    `json:"metadata"`
		IsUpcoming        bool      `json:"is_upcoming"`
	}

	sessions := []Session{}
	for rows.Next() {
		var s Session
		var appID, ivrID, metadata sql.NullString

		if err := rows.Scan(
			&s.ID, &s.SessionID, &s.CandidateID, &appID,
			&ivrID, &s.Position, &s.InterviewType,
			&s.InterviewURL, &s.ScheduledAt, &s.ScheduledDuration,
			&s.Status, &s.CreatedAt, &metadata,
		); err != nil {
			log.Printf("ListInterviewSessions: scan error: %v", err)
			continue
		}

		if appID.Valid {
			s.ApplicationID = &appID.String
		}
		if ivrID.Valid {
			s.InterviewerID = &ivrID.String
		}
		if metadata.Valid {
			s.Metadata = metadata.String
		}
		s.IsUpcoming = s.ScheduledAt.After(now)

		sessions = append(sessions, s)
	}

	if err := rows.Err(); err != nil {
		log.Printf("ListInterviewSessions: rows error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch sessions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":        sessions,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": int(math.Ceil(float64(total) / float64(limit))),
		"filter":      filter,
	})
}

func (h *AdminHandlers) GetInterviewerRoomToken(c *gin.Context) {
	sessionID := c.Param("session_id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id is required"})
		return
	}

	ctx := c.Request.Context()

	adminID, exists := c.Get("admin_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var (
		interviewerID string
		scheduledAt   time.Time
		scheduledDur  int
		status        string
		adminEmail    string
		adminRole     string
	)

	err := h.DB.QueryRowContext(ctx, `
		SELECT interviewer_id, scheduled_at, scheduled_duration, status
		FROM interview_sessions
		WHERE session_id = $1
	`, sessionID).Scan(&interviewerID, &scheduledAt, &scheduledDur, &status)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "interview session not found"})
		return
	}
	if err != nil {
		log.Printf("GetInterviewerRoomToken: failed to fetch session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// The super admin (X-Admin-Token) is a synthetic identity that is never
	// stored in the administrators table, so it can't be looked up there.
	// Use what the middleware already attached to the context and skip the
	// interviewer-match check - the super admin can join any room.
	if isSuperAdmin, _ := c.Get("is_super_admin"); isSuperAdmin == true {
		if email, ok := c.Get("user_email"); ok {
			adminEmail, _ = email.(string)
		}
		if role, ok := c.Get("admin_role"); ok {
			adminRole, _ = role.(string)
		}
	} else {
		err = h.DB.QueryRowContext(ctx, `
			SELECT email, role FROM administrators WHERE id = $1
		`, adminID).Scan(&adminEmail, &adminRole)
		if err != nil {
			log.Printf("GetInterviewerRoomToken: failed to fetch admin: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			return
		}

		if adminID.(string) != interviewerID && adminRole != "hr" {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: not the assigned interviewer for this session"})
			return
		}
	}

	if status == "cancelled" || status == "completed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("interview session is %s", status)})
		return
	}

	if h.LiveKitService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "livekit not configured"})
		return
	}

	validFor := time.Until(scheduledAt) + time.Duration(scheduledDur)*time.Minute + 2*time.Hour
	if validFor < 0 {
		validFor = time.Duration(scheduledDur)*time.Minute + 2*time.Hour
	}

	token, host, err := h.LiveKitService.GenerateToken(sessionID, adminEmail, true, validFor)
	if err != nil {
		log.Printf("GetInterviewerRoomToken: failed to generate token for session %s: %v", sessionID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate room token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session_id": sessionID,
		"room_token": token,
		"room_host":  host,
	})
}

func (h *AdminHandlers) GetCompletedInterviewWithFeedback(c *gin.Context) {
	sessionID := c.Param("id")

	type Feedback struct {
		ID                   int64    `json:"id"`
		InterviewerID        *string  `json:"interviewer_id"`
		TechnicalSkillsScore *int     `json:"technical_skills_score"`
		CommunicationScore   *int     `json:"communication_score"`
		ProblemSolvingScore  *int     `json:"problem_solving_score"`
		CulturalFitScore     *int     `json:"cultural_fit_score"`
		OverallScore         *float64 `json:"overall_score"`
		Comments             *string  `json:"comments"`
		Recommendation       *string  `json:"recommendation"`
		CreatedAt            string   `json:"created_at"`
	}

	type CompletedSession struct {
		ID                int64     `json:"id"`
		SessionID         string    `json:"session_id"`
		CandidateID       string    `json:"candidate_id"`
		ApplicationID     *string   `json:"application_id"`
		InterviewerID     *string   `json:"interviewer_id"`
		Position          string    `json:"position"`
		InterviewType     string    `json:"interview_type"`
		InterviewURL      string    `json:"interview_url"`
		ScheduledAt       time.Time `json:"scheduled_at"`
		ScheduledDuration int       `json:"scheduled_duration"`
		Status            string    `json:"status"`
		CreatedAt         time.Time `json:"created_at"`
		StartedAt         *string   `json:"started_at"`
		EndedAt           *string   `json:"ended_at"`
		Metadata          string    `json:"metadata"`
		Feedback          *Feedback `json:"feedback"`
	}

	var s CompletedSession
	var appID, ivrID, metadata sql.NullString
	var startedAt, endedAt sql.NullTime

	// feedback fields
	var feedbackID sql.NullInt64
	var feedbackInterviewerID, comments, recommendation sql.NullString
	var technicalScore, communicationScore, problemSolvingScore, culturalFitScore sql.NullInt16
	var overallScore sql.NullFloat64
	var feedbackCreatedAt sql.NullTime

	err := h.DB.QueryRowContext(c.Request.Context(), `
		SELECT
			iss.id, iss.session_id, iss.candidate_id, iss.application_id,
			iss.interviewer_id, iss.position, iss.interview_type,
			iss.interview_url, iss.scheduled_at, iss.scheduled_duration,
			iss.status, iss.created_at, iss.metadata,
			iss.started_at, iss.ended_at,

			f.id as feedback_id,
			f.interviewer_id as feedback_interviewer_id,
			f.technical_skills_score,
			f.communication_score,
			f.problem_solving_score,
			f.cultural_fit_score,
			f.overall_score,
			f.comments,
			f.recommendation,
			f.created_at as feedback_created_at
		FROM interview_sessions iss
		LEFT JOIN interview_feedback f ON iss.id = f.interview_session_id
		WHERE iss.session_id = $1
	`, sessionID).Scan(
		&s.ID, &s.SessionID, &s.CandidateID, &appID,
		&ivrID, &s.Position, &s.InterviewType,
		&s.InterviewURL, &s.ScheduledAt, &s.ScheduledDuration,
		&s.Status, &s.CreatedAt, &metadata,
		&startedAt, &endedAt,

		&feedbackID, &feedbackInterviewerID,
		&technicalScore, &communicationScore,
		&problemSolvingScore, &culturalFitScore,
		&overallScore, &comments, &recommendation,
		&feedbackCreatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "interview session not found"})
		return
	}
	if err != nil {
		log.Printf("GetCompletedInterviewWithFeedback: query error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch session"})
		return
	}

	if appID.Valid {
		s.ApplicationID = &appID.String
	}
	if ivrID.Valid {
		s.InterviewerID = &ivrID.String
	}
	if metadata.Valid {
		s.Metadata = metadata.String
	}
	if startedAt.Valid {
		t := startedAt.Time.Format(time.RFC3339)
		s.StartedAt = &t
	}
	if endedAt.Valid {
		t := endedAt.Time.Format(time.RFC3339)
		s.EndedAt = &t
	}

	if feedbackID.Valid {
		f := &Feedback{}
		f.ID = feedbackID.Int64
		if feedbackInterviewerID.Valid {
			f.InterviewerID = &feedbackInterviewerID.String
		}
		if technicalScore.Valid {
			v := int(technicalScore.Int16)
			f.TechnicalSkillsScore = &v
		}
		if communicationScore.Valid {
			v := int(communicationScore.Int16)
			f.CommunicationScore = &v
		}
		if problemSolvingScore.Valid {
			v := int(problemSolvingScore.Int16)
			f.ProblemSolvingScore = &v
		}
		if culturalFitScore.Valid {
			v := int(culturalFitScore.Int16)
			f.CulturalFitScore = &v
		}
		if overallScore.Valid {
			f.OverallScore = &overallScore.Float64
		}
		if comments.Valid {
			f.Comments = &comments.String
		}
		if recommendation.Valid {
			f.Recommendation = &recommendation.String
		}
		if feedbackCreatedAt.Valid {
			f.CreatedAt = feedbackCreatedAt.Time.Format(time.RFC3339)
		}
		s.Feedback = f
	}

	c.JSON(http.StatusOK, gin.H{
		"data": s,
	})
}

func (h *AdminHandlers) GetInterviewSessionStatus(c *gin.Context) {
	sessionID := c.Param("id")

	var status string

	err := h.DB.QueryRowContext(c.Request.Context(), `
        SELECT status
        FROM interview_sessions
        WHERE session_id = $1
    `, sessionID).Scan(&status)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "interview session not found"})
		return
	}
	if err != nil {
		log.Printf("Error fetching interview session status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch session status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session_id": sessionID,
		"status":     status,
	})
}
func (h *AdminHandlers) ListInterviewers(c *gin.Context) {
	// callerRole := c.GetString("admin_role")
	callerID := c.GetString("admin_id")

	// if callerRole != "hr" {
	// 	c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
	// 	return
	// }

	rows, err := h.DB.QueryContext(c.Request.Context(), `
		SELECT id, email, full_name
		FROM administrators
		WHERE is_active = true
		AND (role = 'interviewer' OR id = $1)
		ORDER BY full_name ASC
	`, callerID)
	if err != nil {
		log.Printf("ListInterviewers: failed to fetch: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch interviewers"})
		return
	}
	defer rows.Close()

	var interviewers []gin.H
	for rows.Next() {
		var id, email, fullName string
		if err := rows.Scan(&id, &email, &fullName); err != nil {
			continue
		}
		interviewers = append(interviewers, gin.H{
			"interviewer_id": id,
			"email":          email,
			"full_name":      fullName,
		})
	}

	c.JSON(http.StatusOK, gin.H{"interviewers": interviewers})
}

func (h *AdminHandlers) CreateInterviewFeedback(c *gin.Context) {
	var req models.CreateInterviewFeedbackRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Validation error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid payload",
			"details": err.Error(),
		})
		return
	}

	interviewerID, exists := c.Get("admin_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized: missing admin identity"})
		return
	}
	interviewerIDStr, ok := interviewerID.(string)
	if !ok || interviewerIDStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized: invalid admin identity"})
		return
	}

	ctx := c.Request.Context()

	if interviewerIDStr == middleware.SuperAdminUUID {
		if _, err := h.DB.ExecContext(ctx, `
			INSERT INTO administrators (id, email, password_hash, full_name, role, is_active)
			VALUES ($1, 'superadmin@system', '', 'Super Admin', 'superadmin', true)
			ON CONFLICT (id) DO NOTHING
		`, middleware.SuperAdminUUID); err != nil {
			log.Printf("CreateInterviewFeedback: failed to ensure super admin row exists: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to prepare interviewer identity"})
			return
		}
	}

	log.Printf("CreateInterviewFeedback: looking up session_id=%q for interviewer=%q", req.InterviewSessionID, interviewerIDStr)

	var interviewSessionIntID int
	err := h.DB.QueryRowContext(ctx, `
		SELECT id FROM interview_sessions WHERE session_id = $1
	`, req.InterviewSessionID).Scan(&interviewSessionIntID)

	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("CreateInterviewFeedback: no session found for session_id=%q", req.InterviewSessionID)
			c.JSON(http.StatusNotFound, gin.H{
				"error": fmt.Sprintf("interview session not found for session_id: %s", req.InterviewSessionID),
			})
			return
		}
		log.Printf("CreateInterviewFeedback: failed to lookup session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to lookup interview session"})
		return
	}

	log.Printf("CreateInterviewFeedback: resolved session_id=%q to internal id=%d", req.InterviewSessionID, interviewSessionIntID)

	var feedback models.InterviewFeedback
	err = h.DB.QueryRowContext(ctx, `
		INSERT INTO interview_feedback (
			interview_session_id,
			interviewer_id,
			technical_skills_score,
			communication_score,
			problem_solving_score,
			cultural_fit_score,
			comments,
			recommendation
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING
			id,
			interview_session_id,
			interviewer_id,
			technical_skills_score,
			communication_score,
			problem_solving_score,
			cultural_fit_score,
			overall_score,
			comments,
			recommendation,
			created_at,
			updated_at
	`,
		interviewSessionIntID,
		interviewerIDStr,
		req.TechnicalSkillsScore,
		req.CommunicationScore,
		req.ProblemSolvingScore,
		req.CulturalFitScore,
		req.Comments,
		req.Recommendation,
	).Scan(
		&feedback.ID,
		&feedback.InterviewSessionID,
		&feedback.InterviewerID,
		&feedback.TechnicalSkillsScore,
		&feedback.CommunicationScore,
		&feedback.ProblemSolvingScore,
		&feedback.CulturalFitScore,
		&feedback.OverallScore,
		&feedback.Comments,
		&feedback.Recommendation,
		&feedback.CreatedAt,
		&feedback.UpdatedAt,
	)

	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) {
			log.Printf("CreateInterviewFeedback: pq error code=%s message=%s", pqErr.Code, pqErr.Message)
			switch pqErr.Code {
			case "23505":
				c.JSON(http.StatusConflict, gin.H{
					"error": "feedback from this interviewer for this session already exists",
				})
				return
			case "23503":
				log.Printf("CreateInterviewFeedback: FK violation — interviewSessionIntID=%d interviewerID=%s", interviewSessionIntID, interviewerIDStr)
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "referenced interview_session_id or interviewer_id does not exist",
				})
				return
			}
		}
		log.Printf("CreateInterviewFeedback: failed to insert: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create interview feedback"})
		return
	}

	log.Printf("CreateInterviewFeedback: created feedback id=%d for session internal id=%d", feedback.ID, interviewSessionIntID)

	c.JSON(http.StatusCreated, gin.H{
		"id":                     feedback.ID,
		"interview_session_id":   feedback.InterviewSessionID,
		"interviewer_id":         feedback.InterviewerID,
		"technical_skills_score": feedback.TechnicalSkillsScore,
		"communication_score":    feedback.CommunicationScore,
		"problem_solving_score":  feedback.ProblemSolvingScore,
		"cultural_fit_score":     feedback.CulturalFitScore,
		"overall_score":          feedback.OverallScore,
		"comments":               feedback.Comments,
		"recommendation":         feedback.Recommendation,
		"created_at":             feedback.CreatedAt,
		"updated_at":             feedback.UpdatedAt,
	})
}

func (h *AdminHandlers) StartInterviewSession(c *gin.Context) {
	sessionID := c.Param("session_id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id is required"})
		return
	}

	ctx := c.Request.Context()
	now := time.Now().UTC()

	var session struct {
		ID        int       `json:"id"`
		SessionID string    `json:"session_id"`
		StartedAt time.Time `json:"started_at"`
		Status    string    `json:"status"`
		UpdatedAt time.Time `json:"updated_at"`
	}

	err := h.DB.QueryRowContext(ctx, `
		UPDATE interview_sessions
		SET
			started_at = $1,
			status     = 'in_progress',
			updated_at = $1
		WHERE session_id = $2
		  AND started_at IS NULL
		  AND status = 'scheduled'
		RETURNING id, session_id, started_at, status, updated_at
	`, now, sessionID).Scan(
		&session.ID,
		&session.SessionID,
		&session.StartedAt,
		&session.Status,
		&session.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		var exists bool
		_ = h.DB.QueryRowContext(ctx,
			`SELECT EXISTS(SELECT 1 FROM interview_sessions WHERE session_id = $1)`, sessionID,
		).Scan(&exists)

		if !exists {
			c.JSON(http.StatusNotFound, gin.H{"error": "interview session not found"})
			return
		}
		c.JSON(http.StatusConflict, gin.H{"error": "interview session has already been started or is not in scheduled status"})
		return
	}
	if err != nil {
		log.Printf("StartInterviewSession: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start interview session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":         session.ID,
		"session_id": session.SessionID,
		"started_at": session.StartedAt,
		"status":     session.Status,
		"updated_at": session.UpdatedAt,
	})
}

func (h *AdminHandlers) EndInterviewSession(c *gin.Context) {
	sessionID := c.Param("session_id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id is required"})
		return
	}

	ctx := c.Request.Context()
	now := time.Now().UTC()

	var session struct {
		ID        int       `json:"id"`
		SessionID string    `json:"session_id"`
		StartedAt time.Time `json:"started_at"`
		EndedAt   time.Time `json:"ended_at"`
		Status    string    `json:"status"`
		UpdatedAt time.Time `json:"updated_at"`
	}

	err := h.DB.QueryRowContext(ctx, `
		UPDATE interview_sessions
		SET
			ended_at   = $1,
			status     = 'completed',
			updated_at = $1
		WHERE session_id = $2
		  AND ended_at IS NULL
		  AND status = 'in_progress'
		RETURNING id, session_id, started_at, ended_at, status, updated_at
	`, now, sessionID).Scan(
		&session.ID,
		&session.SessionID,
		&session.StartedAt,
		&session.EndedAt,
		&session.Status,
		&session.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		var current struct {
			exists  bool
			status  string
			endedAt *time.Time
		}

		fallbackErr := h.DB.QueryRowContext(ctx,
			`SELECT EXISTS(SELECT 1 FROM interview_sessions WHERE session_id = $1),
			        COALESCE((SELECT status FROM interview_sessions WHERE session_id = $1), ''),
			        (SELECT ended_at FROM interview_sessions WHERE session_id = $1)`,
			sessionID,
		).Scan(&current.exists, &current.status, &current.endedAt)

		if fallbackErr != nil {
			log.Printf("EndInterviewSession fallback lookup for session_id=%s: %v", sessionID, fallbackErr)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check interview session"})
			return
		}

		if !current.exists {
			c.JSON(http.StatusNotFound, gin.H{"error": "interview session not found"})
			return
		}
		if current.endedAt != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "interview session has already ended"})
			return
		}
		c.JSON(http.StatusConflict, gin.H{
			"error": fmt.Sprintf("interview session cannot be ended: current status is '%s', must be 'in_progress'", current.status),
		})
		return
	}

	if err != nil {
		log.Printf("EndInterviewSession: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to end interview session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":         session.ID,
		"session_id": session.SessionID,
		"started_at": session.StartedAt,
		"ended_at":   session.EndedAt,
		"status":     session.Status,
		"updated_at": session.UpdatedAt,
	})
}

// RescheduleInterviewSession updates scheduled_at/duration for an existing
// session and sends a fresh invite email with a new LiveKit token +
// candidate JWT (both scoped to the new schedule window). The old LiveKit
// room is reused — only the token validity window changes.
// func (h *AdminHandlers) RescheduleInterviewSession(c *gin.Context) {
// 	sessionID := c.Param("session_id")
// 	if sessionID == "" {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id is required"})
// 		return
// 	}

// 	var req struct {
// 		ScheduledAt       time.Time `json:"scheduled_at"       binding:"required"`
// 		ScheduledDuration int       `json:"scheduled_duration" binding:"required,min=15"`
// 	}
// 	if err := c.ShouldBindJSON(&req); err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request format", "details": err.Error()})
// 		return
// 	}

// 	ctx := c.Request.Context()

// 	var candidateID, candidateEmail, candidateName, position string
// 	err := h.DB.QueryRowContext(ctx, `
// 		UPDATE interview_sessions iss
// 		SET scheduled_at = $1, scheduled_duration = $2, status = 'scheduled',
// 		    started_at = NULL, ended_at = NULL, updated_at = CURRENT_TIMESTAMP
// 		FROM candidates c
// 		WHERE iss.session_id = $3 AND iss.candidate_id = c.id
// 		RETURNING iss.candidate_id, c.email, c.full_name, iss.position
// 	`, req.ScheduledAt, req.ScheduledDuration, sessionID).
// 		Scan(&candidateID, &candidateEmail, &candidateName, &position)

// 	if err == sql.ErrNoRows {
// 		c.JSON(http.StatusNotFound, gin.H{"error": "interview session not found"})
// 		return
// 	}
// 	if err != nil {
// 		log.Printf("RescheduleInterviewSession: failed to update session %s: %v", sessionID, err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reschedule interview session"})
// 		return
// 	}

// 	validFor := time.Until(req.ScheduledAt) + time.Duration(req.ScheduledDuration)*time.Minute + 2*time.Hour
// 	if validFor < 0 {
// 		validFor = time.Duration(req.ScheduledDuration)*time.Minute + 2*time.Hour
// 	}

// 	var livekitToken, livekitHost string
// 	if h.LiveKitService != nil {
// 		token, host, tokenErr := h.LiveKitService.GenerateToken(sessionID, candidateEmail, false, validFor)
// 		if tokenErr != nil {
// 			log.Printf("RescheduleInterviewSession: failed to generate candidate token for %s: %v", sessionID, tokenErr)
// 		} else {
// 			livekitToken, livekitHost = token, host
// 		}
// 	}

// 	candidateJWT, err := middleware.IssueCandidateJWT(h.Cfg, candidateID, candidateEmail, sessionID, validFor)
// 	if err != nil {
// 		log.Printf("RescheduleInterviewSession: failed to issue candidate JWT for %s: %v", sessionID, err)
// 	}

// 	if livekitToken != "" && candidateJWT != "" {
// 		key, keyErr := email.DecodeKey(h.Cfg.EncryptionKey)
// 		if keyErr != nil {
// 			log.Printf("RescheduleInterviewSession: failed to decode encryption key: %v", keyErr)
// 		} else {
// 			sesCfg, sesErr := email.LoadSESConfig(ctx, h.DB, key)
// 			if sesErr != nil {
// 				log.Printf("RescheduleInterviewSession: failed to load SES config: %v", sesErr)
// 			} else {
// 				domainName := strings.TrimPrefix(strings.TrimPrefix(sesCfg.SESLoginURL, "https://"), "http://")
// 				deepLink := buildInterviewDeepLink(domainName, candidateEmail, candidateJWT, sessionID, livekitToken, livekitHost)

// 				body, renderErr := email.Render(email.TemplateInterviewJoinInvite, email.InterviewJoinInviteData{
// 					CandidateName: candidateName,
// 					Position:      position,
// 					ScheduledAt:   req.ScheduledAt.Format(time.RFC1123),
// 					Duration:      req.ScheduledDuration,
// 					DeepLink:      deepLink,
// 				})
// 				if renderErr != nil {
// 					log.Printf("RescheduleInterviewSession: failed to render invite email: %v", renderErr)
// 				} else {
// 					_, enqueueErr := email.Enqueue(ctx, h.DB, email.EmailJob{
// 						ToEmail:     candidateEmail,
// 						ToName:      candidateName,
// 						FromEmail:   sesCfg.SESFromEmail,
// 						Subject:     fmt.Sprintf("Interview Rescheduled: %s", position),
// 						BodyHTML:    body,
// 						Template:    email.TemplateInterviewJoinInvite,
// 						EntityType:  "interview_session",
// 						EntityID:    sessionID,
// 						TriggeredBy: "reschedule_interview_session",
// 						Priority:    email.PriorityHigh,
// 					})
// 					if enqueueErr != nil {
// 						log.Printf("RescheduleInterviewSession: failed to enqueue invite email: %v", enqueueErr)
// 					}
// 				}
// 			}
// 		}
// 	}

// 	c.JSON(http.StatusOK, gin.H{
// 		"session_id":         sessionID,
// 		"scheduled_at":       req.ScheduledAt,
// 		"scheduled_duration": req.ScheduledDuration,
// 		"status":             "scheduled",
// 		"livekit_token":      livekitToken,
// 		"livekit_host":       livekitHost,
// 		"candidate_jwt":      candidateJWT,
// 	})
// }
