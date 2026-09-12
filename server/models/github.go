// server/models/github.go
package models

import (
	"regexp"
	"strings"
	"time"
)

// ========================================
// GITHUB CREDENTIALS VALIDATION
// ========================================

type SaveGithubCredentialsRequest struct {
	OrgName string `json:"org_name" binding:"required"`
	Token   string `json:"token" binding:"required"`
}

var (
	// classic/OAuth/app tokens: prefix_ + 36+ alphanumeric chars
	githubPrefixedTokenRe = regexp.MustCompile(`^(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}$`)

	// fine-grained PATs: github_pat_ + 22 chars + "_" + 59 chars (roughly)
	githubFineGrainedTokenRe = regexp.MustCompile(`^github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59}$`)

	// legacy classic tokens: bare 40-char hex string
	githubLegacyTokenRe = regexp.MustCompile(`^[a-f0-9]{40}$`)

	// GitHub org/user name rules: alphanumeric + single hyphens, no leading/trailing hyphen
	githubOrgNameRe = regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$`)
)

func IsValidGithubToken(token string) bool {
	token = strings.TrimSpace(token)
	if token == "" {
		return false
	}
	return githubPrefixedTokenRe.MatchString(token) ||
		githubFineGrainedTokenRe.MatchString(token) ||
		githubLegacyTokenRe.MatchString(token)
}

func IsValidGithubOrgName(orgName string) bool {
	orgName = strings.TrimSpace(orgName)
	if orgName == "" || len(orgName) > 39 {
		return false
	}
	return githubOrgNameRe.MatchString(orgName)
}

// ========================================
// REPO ANALYSIS MODEL
// ========================================

type RepoAnalysis struct {
	ID                int       `json:"id"`
	JobApplicationID  string    `json:"job_application_id"`
	RepoURL           string    `json:"repo_url"`
	CandidateID       string    `json:"candidate_id"`
	TotalScore        float64   `json:"total_score"`
	MessageScore      float64   `json:"message_score"`
	AtomicityScore    float64   `json:"atomicity_score"`
	CadenceScore      float64   `json:"cadence_score"`
	AuthorScore       float64   `json:"author_score"`
	SemanticScore     *float64  `json:"semantic_score,omitempty"`
	Tier              string    `json:"tier"`
	CommitCount       int       `json:"commit_count"`
	AvgLinesPerCommit float64   `json:"avg_lines_per_commit"`
	Details           string    `json:"details,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

// ========================================
// ASSIGNMENT SCORE MODEL
// ========================================

type AssignmentScore struct {
	ID               int    `json:"id"`
	JobApplicationID string `json:"job_application_id"`

	TotalScore     float64 `json:"total_score"`
	MessageScore   float64 `json:"message_score"`
	AtomicityScore float64 `json:"atomicity_score"`
	CadenceScore   float64 `json:"cadence_score"`
	AuthorScore    float64 `json:"author_score"`

	CommitScore float64 `json:"commit_score"`
	AIScore     float64 `json:"ai_score"`
	AISummary   string  `json:"ai_summary,omitempty"`

	Tier              string  `json:"tier"`
	CommitCount       int     `json:"commit_count"`
	AvgLinesPerCommit float64 `json:"avg_lines_per_commit"`

	Details   string    `json:"details,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// ========================================
// REPO SCORING HELPERS (non-persisted)
// ========================================

type ScoreBreakdown struct {
	MessageScore      float64
	AtomicityScore    float64
	CadenceScore      float64
	AuthorScore       float64
	TotalScore        float64
	Tier              string
	CommitCount       int
	AvgLinesPerCommit float64
}

type AnalyzeInput struct {
	JobApplicationID string
	CandidateID      string
	RepoURLs         []string
	AuthToken        string
}

type RepoResult struct {
	RepoURL   string
	Breakdown ScoreBreakdown
	Err       error
}
