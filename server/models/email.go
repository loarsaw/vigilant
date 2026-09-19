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

type EmailConfigRequest struct {
	Provider           string `json:"provider"` // "ses" or "sendgrid"
	AWSRegion          string `json:"aws_region,omitempty"`
	AWSAccessKeyID     string `json:"aws_access_key_id,omitempty"`
	AWSSecretAccessKey string `json:"aws_secret_access_key,omitempty"`
	APIKey             string `json:"api_key,omitempty"` // sendgrid
	FromEmail          string `json:"from_email"`
	LoginURL           string `json:"login_url"`
	TestEmail          string `json:"test_email"`
}

type SendEmailRequest struct {
	Recipients []struct {
		FullName string `json:"full_name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	} `json:"recipients"`
}

type ConfigVerificationData struct {
	Provider  string
	FromEmail string
	AWSRegion string
	LoginURL  string
}
