// server/email/tamplates.go
package email

import (
	"bytes"
	"fmt"
	"html/template"
	"strings"
)

const (
	TemplateCandidateCredentials    = "candidate_credentials"
	TemplateInterviewInvite         = "interview_invite"
	TemplateInterviewReminder       = "interview_reminder"
	TemplateInterviewerRemainder    = "interviewer_remainder"
	TemplateInterviewerNotification = "interviewer_notification"
	TemplateCustomMessage           = "custom_message"
	TemplateLoginLink               = "login_link"
	TemplateCandidateInvite         = "candidate_invite"
	TemplateAssignmentInvite        = "assignment_invite"
	TemplateInterviewJoinInvite     = "interview_join_invite"
	TemplateShortlistedFinal        = "shortlisted_final"
)

var templates = map[string]*template.Template{}

func init() {
	register(TemplateCandidateCredentials, candidateCredentialsText)
	register(TemplateInterviewInvite, interviewInviteText)
	register(TemplateInterviewReminder, interviewReminderText)
	register(TemplateCustomMessage, customMessageText)
	register(TemplateLoginLink, interviewStartingText)
	register(TemplateInterviewerRemainder, interviewerNotificationText)
	register(TemplateInterviewerNotification, interviewerNotificationText)
	register(TemplateCandidateInvite, candidateInviteText)
	register(TemplateAssignmentInvite, assignmentInviteText)
	register(TemplateShortlistedFinal, shortlistedFinalText)

	register(TemplateInterviewJoinInvite, interviewJoinInviteText)
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

func ReverseDomain(domain string) string {
	parts := strings.Split(domain, ".")
	for i, j := 0, len(parts)-1; i < j; i, j = i+1, j-1 {
		parts[i], parts[j] = parts[j], parts[i]
	}
	return strings.Join(parts, ".")
}

var interviewJoinInviteText = `Your Interview Has Been Scheduled

Hi {{.CandidateName}},

Your interview for the {{.Position}} position has been scheduled for {{.ScheduledAt}} ({{.Duration}} minutes).

Use the passcode and domain below to join your interview through the Vigilant desktop app at your scheduled time:

  Passcode: {{.Passcode}}
  Domain: {{.Domain}}

Please make sure you have the Vigilant desktop app installed before your scheduled time.

If you have any issues joining, please reach out to us directly.

Good luck!
`

var candidateInviteText = `You've Been Invited to Apply

Hi,

You've been invited to submit an application. Click the link below to get started:

  {{.ApplyURL}}

This link is valid for 10 days from when it was issued.

`

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

var interviewStartingText = `Your Interview is Starting

Hi {{.CandidateName}},

Your interview is about to begin. Click the link below to log in and join:

  {{.LoginURL}}

If you have any issues joining, please contact your interviewer directly.

Good luck!
`

var interviewerNotificationText = `Interview Session Started

Hi {{.InterviewerName}},

An interview session with {{.CandidateName}} has just started.

Click the link below to access the interview dashboard:

  {{.InterviewURL}}

You can monitor the session, view process logs, and provide feedback from the dashboard.

Best regards,
`

var assignmentInviteText = `{{if .HighTier}}Your Application Stood Out - Here's Your Assignment{{else}}Next Step: Your Assignment{{end}}

Hi {{.CandidateName}},

{{if .HighTier}}Your application for the {{.Position}} position really stood out to us.{{else}}Thank you for applying for the {{.Position}} position.{{end}} As the next step, we'd like you to complete a short assignment.

We've created a private repository for you:

  {{.RepoURL}}

You should have received (or will shortly receive) a GitHub invitation to access it. Please accept the invite, then clone the repo and push your solution there when ready.

You have 7 days from today to complete and submit the assignment. The repository will be removed after this window, so please make sure your work is pushed before then.

If you don't see the invitation, check your GitHub notifications or spam folder, or reach out to us directly.

Good luck!
`

var shortlistedFinalText = `Congratulations - You've Been Shortlisted

Hi {{.CandidateName}},

Great news - after reviewing your assignment for the {{.Position}} position, you've been shortlisted to move forward in our process.

We'll be in touch soon with next steps.

Congratulations again!
`
