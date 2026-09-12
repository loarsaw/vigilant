// server/models/position.go
package models

import "time"

// ========================================
// HIRING POSITIONS MODELS
// ========================================

type HiringPosition struct {
	ID                 string    `json:"id"`
	PositionTitle      string    `json:"position_title"`
	Department         string    `json:"department"`
	Location           string    `json:"location"`
	EmploymentType     string    `json:"employment_type"`
	ExperienceRequired string    `json:"experience_required"`
	SalaryRangeMin     *int      `json:"salary_range_min,omitempty"`
	SalaryRangeMax     *int      `json:"salary_range_max,omitempty"`
	SalaryRangeText    string    `json:"salary_range_text,omitempty"`
	NumberOfOpenings   int       `json:"number_of_openings"`
	JobDescription     string    `json:"job_description"`
	Requirements       string    `json:"requirements"`
	AssignmentID       *string   `json:"assignment_id,omitempty"`
	AssignmentTitle    *string   `json:"assignment_title,omitempty"`
	Status             string    `json:"status"`
	IsActive           bool      `json:"is_active"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
	CreatedBy          *string   `json:"created_by,omitempty"`
	UpdatedBy          *string   `json:"updated_by,omitempty"`
}

type UpdateHiringPositionRequest struct {
	PositionTitle      string  `json:"position_title,omitempty"`
	Department         string  `json:"department,omitempty"`
	Location           string  `json:"location,omitempty"`
	EmploymentType     string  `json:"employment_type,omitempty"`
	ExperienceRequired string  `json:"experience_required,omitempty"`
	SalaryRangeMin     *int    `json:"salary_range_min,omitempty"`
	SalaryRangeMax     *int    `json:"salary_range_max,omitempty"`
	SalaryRangeText    string  `json:"salary_range_text,omitempty"`
	NumberOfOpenings   int     `json:"number_of_openings,omitempty"`
	JobDescription     string  `json:"job_description,omitempty"`
	Requirements       string  `json:"requirements,omitempty"`
	AssignmentID       *string `json:"assignment_id,omitempty" validate:"omitempty,uuid"`
	Status             string  `json:"status,omitempty"`
	IsActive           bool    `json:"is_active,omitempty"`
}
