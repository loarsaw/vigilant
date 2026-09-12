// server/models/interview.go
package models

import "time"

// ========================================
// INTERVIEW SESSION MODELS
// ========================================

type CreateInterviewSessionRequest struct {
	CandidateID       string `json:"candidate_id"        binding:"required"`
	ApplicationID     string `json:"application_id"`
	PositionID        string `json:"position_id"`
	InterviewerID     string `json:"interviewer_id"      binding:"required"`
	Position          string `json:"position"            binding:"required"`
	InterviewType     string `json:"interview_type"      binding:"required"`
	ScheduledAt       string `json:"scheduled_at"        binding:"required"`
	ScheduledTimezone string `json:"scheduled_timezone"  binding:"required"`
	ScheduledDuration int    `json:"scheduled_duration"  binding:"required,min=15"`
	InterviewURL      string `json:"interview_url"`
}

type InterviewSession struct {
	ID                 int64      `json:"id"`
	SessionID          string     `json:"session_id"`
	CandidateID        string     `json:"candidate_id"`
	CandidateSessionID *string    `json:"candidate_session_id,omitempty"`
	ApplicationID      *string    `json:"application_id,omitempty"`
	InterviewerID      *string    `json:"interviewer_id,omitempty"`
	Position           *string    `json:"position,omitempty"`
	InterviewType      *string    `json:"interview_type,omitempty"`
	InterviewPlatform  int        `json:"interview_platform"`
	InterviewURL       *string    `json:"interview_url,omitempty"`
	ScheduledAt        *time.Time `json:"scheduled_at,omitempty"`
	StartedAt          *time.Time `json:"started_at,omitempty"`
	EndedAt            *time.Time `json:"ended_at,omitempty"`
	ScheduledDuration  *int       `json:"scheduled_duration,omitempty"`
	Status             string     `json:"status"`
	Metadata           *string    `json:"metadata,omitempty"`
	Notes              *string    `json:"notes,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type CreateInterviewFeedbackRequest struct {
	InterviewSessionID   string `json:"interview_session_id" binding:"required"`
	TechnicalSkillsScore int    `json:"technical_skills_score" binding:"required,gte=0,lte=100"`
	CommunicationScore   int    `json:"communication_score" binding:"required,gte=0,lte=100"`
	ProblemSolvingScore  int    `json:"problem_solving_score" binding:"required,gte=0,lte=100"`
	CulturalFitScore     int    `json:"cultural_fit_score" binding:"required,gte=0,lte=100"`
	Comments             string `json:"comments" binding:"required"`
	Recommendation       string `json:"recommendation" binding:"required,oneof=hire consider reject"`
}

type InterviewFeedback struct {
	ID                   int       `json:"id" db:"id"`
	InterviewSessionID   int       `json:"interview_session_id" db:"interview_session_id"`
	InterviewerID        string    `json:"interviewer_id" db:"interviewer_id"`
	TechnicalSkillsScore int       `json:"technical_skills_score" db:"technical_skills_score"`
	CommunicationScore   int       `json:"communication_score" db:"communication_score"`
	ProblemSolvingScore  int       `json:"problem_solving_score" db:"problem_solving_score"`
	CulturalFitScore     int       `json:"cultural_fit_score" db:"cultural_fit_score"`
	OverallScore         float64   `json:"overall_score" db:"overall_score"`
	Comments             string    `json:"comments" db:"comments"`
	Recommendation       string    `json:"recommendation" db:"recommendation"`
	CreatedAt            time.Time `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time `json:"updated_at" db:"updated_at"`
}

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
	StartedAt         *string   `json:"started_at"`
	EndedAt           *string   `json:"ended_at"`
	Metadata          string    `json:"metadata"`
	IsUpcoming        bool      `json:"is_upcoming"`
	Feedback          *Feedback `json:"feedback"`
}

type LSession struct {
	ID                int64     `json:"id"`
	SessionID         string    `json:"session_id"`
	CandidateID       string    `json:"candidate_id"`
	CandidateName     *string   `json:"candidate_name"`
	ApplicationID     *string   `json:"application_id"`
	InterviewerID     *string   `json:"interviewer_id"`
	InterviewerName   *string   `json:"interviewer_name"`
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

type InterviewReminder struct {
	SessionID         string
	ScheduledAt       time.Time
	InterviewURL      *string
	Position          *string
	ScheduledDuration *int
	CandidateEmail    string
	CandidateName     *string
	InterviewerName   string
}
