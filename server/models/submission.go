// server/models/submission.go
package models

import "time"

type Language string

const (
	LangC      Language = "c"
	LangCPP    Language = "cpp"
	LangJS     Language = "js"
	LangJava   Language = "java"
	LangPython Language = "python"
)

var SupportedLanguages = map[Language]bool{
	LangC:      true,
	LangCPP:    true,
	LangJS:     true,
	LangJava:   true,
	LangPython: true,
}

type Submission struct {
	ID        string    `json:"id"`
	Language  Language  `json:"language"`
	Code      string    `json:"code"`
	Stdout    string    `json:"stdout"`
	Stderr    string    `json:"stderr"`
	ExitCode  int       `json:"exit_code"`
	TimeMS    int64     `json:"time_ms"`
	MemoryKB  int64     `json:"memory_kb"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type ExecuteRequest struct {
	Language Language `json:"language" binding:"required"`
	Code     string   `json:"code_b64" binding:"required"`
	Stdin    string   `json:"stdin_b64"`
}

type RunRequest struct {
	Code  string `json:"code"`
	Stdin string `json:"stdin"`
}

type RunResult struct {
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
	ExitCode int    `json:"exit_code"`
	TimeMS   int64  `json:"time_ms"`
	MemoryKB int64  `json:"memory_kb"`
}
