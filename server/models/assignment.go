// server/models/assignment.go
package models

import "time"

// ========================================
// ASSIGNMENT MODELS
// ========================================

type Assignment struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	Description     string    `json:"description"`
	Instructions    string    `json:"instructions,omitempty"`
	ResourceLinks   []string  `json:"resource_links,omitempty"`
	DurationMinutes *int      `json:"duration_minutes,omitempty"`
	PassingScore    *int      `json:"passing_score,omitempty"`
	Status          string    `json:"status"`
	DifficultyLevel string    `json:"difficulty_level,omitempty"`
	GeneratedByAI   bool      `json:"generated_by_ai"`
	AINotes         string    `json:"ai_notes,omitempty"`
	StarterReadme   string    `json:"starter_readme,omitempty"`
	IsActive        bool      `json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	CreatedBy       *string   `json:"created_by,omitempty"`
	UpdatedBy       *string   `json:"updated_by,omitempty"`
}

type CreateAssignmentRequest struct {
	Title           string   `json:"title" validate:"required"`
	Description     string   `json:"description" validate:"required"`
	Instructions    string   `json:"instructions,omitempty"`
	ResourceLinks   []string `json:"resource_links,omitempty"`
	DurationMinutes *int     `json:"duration_minutes,omitempty" validate:"omitempty,min=1"`
	PassingScore    *int     `json:"passing_score,omitempty" validate:"omitempty,min=0"`
}

type UpdateAssignmentRequest struct {
	Title           string   `json:"title,omitempty"`
	Description     string   `json:"description,omitempty"`
	Instructions    string   `json:"instructions,omitempty"`
	ResourceLinks   []string `json:"resource_links,omitempty"`
	DurationMinutes *int     `json:"duration_minutes,omitempty"`
	PassingScore    *int     `json:"passing_score,omitempty"`
	Status          string   `json:"status,omitempty"`
	IsActive        bool     `json:"is_active,omitempty"`
}

// ========================================
// ASSIGNMENT SUBMISSION MODELS
// ========================================

type AssignmentSubmission struct {
	ID               string     `json:"id"`
	JobApplicationID string     `json:"job_application_id"`
	AssignmentID     string     `json:"assignment_id"`
	AttemptNumber    int        `json:"attempt_number"`
	SubmissionText   string     `json:"submission_text,omitempty"`
	SubmissionFiles  []string   `json:"submission_files,omitempty"`
	SubmissionLinks  []string   `json:"submission_links,omitempty"`
	Status           string     `json:"status"`
	Score            *int       `json:"score,omitempty"`
	Feedback         string     `json:"feedback,omitempty"`
	SubmittedAt      time.Time  `json:"submitted_at"`
	ReviewedAt       *time.Time `json:"reviewed_at,omitempty"`
	ReviewedBy       *string    `json:"reviewed_by,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type CreateAssignmentSubmissionRequest struct {
	JobApplicationID string   `json:"job_application_id" validate:"required,uuid"`
	AssignmentID     string   `json:"assignment_id" validate:"required,uuid"`
	SubmissionText   string   `json:"submission_text,omitempty"`
	SubmissionFiles  []string `json:"submission_files,omitempty"`
	SubmissionLinks  []string `json:"submission_links,omitempty" validate:"omitempty,dive,url"`
}

type ReviewAssignmentSubmissionRequest struct {
	Status   string `json:"status" validate:"required,oneof=reviewed passed failed"`
	Score    *int   `json:"score,omitempty" validate:"omitempty,min=0"`
	Feedback string `json:"feedback,omitempty"`
}

const (
	DifficultyIntern = "intern"
	DifficultyJunior = "junior"
	DifficultySDE1   = "sde1"
	DifficultySDE2   = "sde2"
	DifficultySDE3   = "sde3"
)

var ValidDifficulties = map[string]bool{
	DifficultyIntern: true,
	DifficultyJunior: true,
	DifficultySDE1:   true,
	DifficultySDE2:   true,
	DifficultySDE3:   true,
}

type GenerateAssignmentRequest struct {
	PositionID string `json:"position_id" binding:"required"`
	Difficulty string `json:"difficulty" binding:"required"`
	Notes      string `json:"notes,omitempty"`
}

type GeneratedAssignment struct {
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	Requirements   []string `json:"requirements"`
	StarterReadme  string   `json:"starter_readme"`
	EstimatedHours float64  `json:"estimated_hours"`
}
