// models/ob-description.go
package models

type GenerateJobDescriptionRequest struct {
	PositionTitle      string `json:"position_title" binding:"required"`
	Department         string `json:"department"`
	Location           string `json:"location"`
	EmploymentType     string `json:"employment_type"`
	ExperienceRequired string `json:"experience_required"`
	Requirements       string `json:"requirements"`
	Tone               string `json:"tone" binding:"omitempty,oneof=professional casual enthusiastic"`
	Notes              string `json:"notes"`
}

type GeneratedJobDescription struct {
	JobDescription string `json:"job_description"`
}
