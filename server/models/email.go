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

type SESConfigRequest struct {
	AWSRegion          string `json:"aws_region"`
	AWSAccessKeyID     string `json:"aws_access_key_id"`
	AWSSecretAccessKey string `json:"aws_secret_access_key"`
	SESFromEmail       string `json:"ses_from_email"`
	SESLoginURL        string `json:"ses_login_url"`
	TestEmail          string `json:"ses_test_email"`
}

type SendEmailRequest struct {
	Recipients []struct {
		FullName string `json:"full_name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	} `json:"recipients"`
}

type ConfigVerificationData struct {
	FromEmail string
	AWSRegion string
	LoginURL  string
}
