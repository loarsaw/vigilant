// server/models/application.go
package models

import "time"

// ========================================
// JOB APPLICATIONS MODELS
// ========================================

type JobApplication struct {
	ID          string `json:"id"`
	CandidateID string `json:"candidate_id"`
	PositionID  string `json:"position_id"`

	FullName        string   `json:"full_name,omitempty"`
	PhoneNumber     string   `json:"phone_number,omitempty"`
	ResumeUrl       string   `json:"resume_url,omitempty"`
	GithubUrls      []string `json:"github_urls,omitempty"`
	Skills          string   `json:"skills,omitempty"`
	ExperienceYears uint8    `json:"experience_years"`
	AssignmentID    string   `json:"assignment_id,omitempty"`

	Status      string    `json:"status"`
	CoverLetter string    `json:"cover_letter,omitempty"`
	Notes       string    `json:"notes,omitempty"`
	AppliedAt   time.Time `json:"applied_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Analyzed     bool     `json:"analyzed"`
	OverallScore *float64 `json:"overall_score,omitempty"`
	OverallTier  string   `json:"overall_tier,omitempty"`

	IsQualified   bool `json:"is_qualified"`
	IsShortlisted bool `json:"is_shortlisted"`

	GithubRepoName         string     `json:"github_repo_name,omitempty"`
	GithubRepoURL          string     `json:"github_repo_url,omitempty"`
	GithubInviteStatus     string     `json:"github_invite_status,omitempty"`
	GithubInvitedAt        *time.Time `json:"github_invited_at,omitempty"`
	GithubRepoDeletedAt    *time.Time `json:"github_repo_deleted_at,omitempty"`
	AssignmentEmailSent    *time.Time `json:"assignment_email_sent_at,omitempty"`
	AssignmentOverallScore *float64   `json:"assignment_overall_score,omitempty"`
	AssignmentOverallTier  string     `json:"assignment_overall_tier,omitempty"`
	AssignmentLastScoredAt *time.Time `json:"assignment_last_scored_at,omitempty"`
}

type CreateJobApplicationRequest struct {
	PositionID string `json:"position_id"`

	FullName        string   `json:"full_name" binding:"required"`
	Email           string   `json:"email" binding:"required,email"`
	PhoneNumber     string   `json:"phone_number,omitempty"`
	ResumeUrl       string   `json:"resume_url" binding:"required"`
	GithubUrls      []string `json:"github_urls" binding:"required,min=1,max=3,dive,required,url"`
	Skills          string   `json:"skills,omitempty"`
	ExperienceYears uint8    `json:"experience_years"`

	CoverLetter string `json:"cover_letter,omitempty"`
}

type JobApplicationDetail struct {
	JobApplication
	Candidate        *Candidate            `json:"candidate,omitempty"`
	Position         *HiringPosition       `json:"position,omitempty"`
	Assignment       *Assignment           `json:"assignment,omitempty"`
	LatestSubmission *AssignmentSubmission `json:"latest_submission,omitempty"`
	RepoAnalyses     []RepoAnalysis        `json:"repo_analyses,omitempty"`
}

type AssignmentReviewResult struct {
	Score      float64  `json:"score"` // 0-100
	Summary    string   `json:"summary"`
	Strengths  []string `json:"strengths"`
	Weaknesses []string `json:"weaknesses"`
}
