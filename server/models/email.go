// server/models/email.go"
package models

// ========================================
// EMAIL / MESSAGING MODELS
// ========================================

type SendCustomEmailRequest struct {
	ToEmail       string `json:"to_email" binding:"required,email"`
	CandidateName string `json:"candidate_name" binding:"required"`
	Subject       string `json:"subject" binding:"required"`
	Message       string `json:"message" binding:"required"`
}

type CandidatePushRequest struct {
	Type    string `json:"type" binding:"required"`
	Payload any    `json:"payload" binding:"required"`
}

type InterviewJoinInviteData struct {
	CandidateName string
	Position      string
	ScheduledAt   string
	Duration      int
	Passcode      string
	Domain        string
}

type CandidateInviteData struct {
	ApplyURL string
}

type CustomMessageData struct {
	CandidateName string
	Message       string
}

type CandidateCredentialsData struct {
	CandidateName string
	Email         string
	Password      string
	LoginURL      string
}

type InterviewInviteData struct {
	CandidateName    string
	InterviewerEmail string
	Position         string
	InterviewType    string
	ScheduledAt      string
	Duration         int
	MeetLink         string
	LoginURL         string
}
