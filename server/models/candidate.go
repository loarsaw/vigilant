// server/models/candidate.go
package models

import "time"

// ========================================
// CANDIDATE MODELS
// ========================================

type Candidate struct {
	ID                 string     `json:"id"`
	Email              string     `json:"email"`
	FullName           string     `json:"full_name,omitempty"`
	PhoneNumber        string     `json:"phone_number,omitempty"`
	IsActive           bool       `json:"is_active"`
	OnboardingComplete bool       `json:"onboarding_complete"`
	LastLogin          *time.Time `json:"last_login,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type CandidateSession struct {
	ID           string     `json:"id"`
	CandidateID  string     `json:"candidate_id"`
	SessionToken string     `json:"session_token"`
	LoggedInAt   time.Time  `json:"logged_in_at"`
	LoggedOutAt  *time.Time `json:"logged_out_at,omitempty"`
	LastActivity time.Time  `json:"last_activity"`
	SystemType   string     `json:"system_type,omitempty"`
	OSVersion    string     `json:"os_version,omitempty"`
	IPAddress    string     `json:"ip_address,omitempty"`
	UserAgent    string     `json:"user_agent,omitempty"`
	Country      string     `json:"country,omitempty"`
	City         string     `json:"city,omitempty"`
	IsActive     bool       `json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
}

type CreateCandidateRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	FullName string `json:"full_name"`
}

type CompleteOnboardingRequest struct {
	PhoneNumber     string   `json:"phone_number" validate:"required,min=10"`
	GithubID        string   `json:"github_id" validate:"required"`
	ResumeLink      string   `json:"resume_link" validate:"required,url"`
	Skills          []string `json:"skills" validate:"required,gt=0"`
	ExperienceYears int      `json:"experience_years" validate:"min=0,max=50"`
}
