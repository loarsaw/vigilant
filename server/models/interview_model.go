// models/interview_questions.go
package models

import "time"

type GenerateQuestionsRequest struct {
	Difficulty string `json:"difficulty"`
	Count      int    `json:"count"`
	Category   string `json:"category"`
	Notes      string `json:"notes"`
}

type GeneratedQuestion struct {
	Question       string   `json:"question"`
	Category       string   `json:"category"`
	FollowUps      []string `json:"follow_ups"`
	EvaluationTips string   `json:"evaluation_tips"`
}

type GeneratedQuestionSet struct {
	Questions []GeneratedQuestion `json:"questions"`
}

type QuestionSet struct {
	ID                 string              `json:"id"`
	InterviewSessionID int                 `json:"interview_session_id"`
	AttemptNumber      int                 `json:"attempt_number"`
	DifficultyLevel    string              `json:"difficulty_level"`
	Category           string              `json:"category"`
	Questions          []GeneratedQuestion `json:"questions"`
	GeneratedByAI      bool                `json:"generated_by_ai"`
	Notes              string              `json:"notes"`
	GeneratedBy        *string             `json:"generated_by"`
	CreatedAt          time.Time           `json:"created_at"`
}
