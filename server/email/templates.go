package email

import (
	"bytes"
	"fmt"
	"html/template"
)

const (
	TemplateCandidateCredentials = "candidate_credentials"
	TemplateInterviewInvite      = "interview_invite"
	TemplateInterviewReminder    = "interview_reminder"
	TemplateCustomMessage        = "custom_message"
)

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

type InterviewReminderData struct {
	CandidateName string
	Position      string
	ScheduledAt   string
	MeetLink      string
}

var templates = map[string]*template.Template{}

func init() {
	register(TemplateCandidateCredentials, candidateCredentialsText)
	register(TemplateInterviewInvite, interviewInviteText)
	register(TemplateInterviewReminder, interviewReminderText)
	register(TemplateCustomMessage, customMessageText)
}

func register(name, html string) {
	t, err := template.New(name).Parse(html)
	if err != nil {
		panic(fmt.Sprintf("email: failed to parse template %q: %v", name, err))
	}
	templates[name] = t
}

func Render(templateName string, data any) (string, error) {
	t, ok := templates[templateName]
	if !ok {
		return "", fmt.Errorf("email: unknown template %q", templateName)
	}

	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("email: render %q: %w", templateName, err)
	}

	return buf.String(), nil
}

var candidateCredentialsText = `Welcome to Vigilant

Hi {{.CandidateName}},

Your account has been created. Here are your login credentials:

  Email:    {{.Email}}
  Password: {{.Password}}

Login here: {{.LoginURL}}

Please change your password after your first login.`

var interviewInviteText = `Interview Scheduled

Hi {{.CandidateName}},

Your interview has been scheduled. Here are the details:

  Position:       {{.Position}}
  Interview Type: {{.InterviewType}}
  Scheduled At:   {{.ScheduledAt}}
  Duration:       {{.Duration}} minutes
  Interviewer:    {{.InterviewerEmail}}
{{if .MeetLink}}
  Meet Link:      {{.MeetLink}}
{{end}}
If you have any questions, please contact your interviewer directly.`

var interviewReminderText = `Interview Reminder

Hi {{.CandidateName}},

This is a reminder that your interview for {{.Position}} is scheduled at {{.ScheduledAt}}.
{{if .MeetLink}}
Join here: {{.MeetLink}}
{{end}}`

var customMessageText = `Hi {{.CandidateName}},

{{.Message}}`
