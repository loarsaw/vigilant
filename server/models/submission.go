package models

import "time"

type Language string

const (
	LangC    Language = "c"
	LangCPP  Language = "cpp"
	LangJS   Language = "js"
	LangJava Language = "java"
)

var SupportedLanguages = map[Language]bool{
	LangC:    true,
	LangCPP:  true,
	LangJS:   true,
	LangJava: true,
}

type Submission struct {
	ID        int64     `json:"id"`
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
	Code     string   `json:"code"     binding:"required"`
}
