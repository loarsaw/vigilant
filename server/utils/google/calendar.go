package utils

import (
	"context"
	"fmt"
	"time"

	"golang.org/x/oauth2/google"
	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
)

type GoogleCalendarService struct {
	service *calendar.Service
}

type InterviewMeetingRequest struct {
	Summary          string
	Description      string
	StartTime        time.Time
	EndTime          time.Time
	InterviewerEmail string
	CandidateEmail   string
	TimeZone         string
}

type InterviewMeetingResponse struct {
	EventID   string
	MeetLink  string
	EventLink string
	StartTime time.Time
	EndTime   time.Time
}

func NewGoogleCalendarService(ctx context.Context, credentialsJSON []byte, impersonateEmail string) (*GoogleCalendarService, error) {

	config, err := google.JWTConfigFromJSON(credentialsJSON, calendar.CalendarScope)
	if err != nil {
		return nil, fmt.Errorf("unable to parse service account credentials: %v", err)
	}

	config.Subject = impersonateEmail

	srv, err := calendar.NewService(ctx, option.WithHTTPClient(config.Client(ctx)))
	if err != nil {
		return nil, fmt.Errorf("unable to create calendar service: %v", err)
	}

	return &GoogleCalendarService{service: srv}, nil
}

func (g *GoogleCalendarService) CreateInterviewEvent(ctx context.Context, req InterviewMeetingRequest) (*InterviewMeetingResponse, error) {
	event := &calendar.Event{
		Summary:     req.Summary,
		Description: req.Description,
		Start: &calendar.EventDateTime{
			DateTime: req.StartTime.Format(time.RFC3339),
			TimeZone: req.TimeZone,
		},
		End: &calendar.EventDateTime{
			DateTime: req.EndTime.Format(time.RFC3339),
			TimeZone: req.TimeZone,
		},
		Attendees: []*calendar.EventAttendee{
			{
				Email:          req.CandidateEmail,
				ResponseStatus: "needsAction",
			},
		},
		ConferenceData: &calendar.ConferenceData{
			CreateRequest: &calendar.CreateConferenceRequest{
				RequestId: fmt.Sprintf("interview-%d", time.Now().Unix()),
				ConferenceSolutionKey: &calendar.ConferenceSolutionKey{
					Type: "hangoutsMeet", // This creates a Google Meet link
				},
			},
		},
		Reminders: &calendar.EventReminders{
			UseDefault: false,
			Overrides: []*calendar.EventReminder{
				{Method: "email", Minutes: 24 * 60}, // 1 day before
				{Method: "popup", Minutes: 30},      // 30 min before
			},
		},
	}

	createdEvent, err := g.service.Events.Insert("primary", event).
		ConferenceDataVersion(1).
		SendNotifications(true).
		Context(ctx).
		Do()

	if err != nil {
		return nil, fmt.Errorf("failed to create calendar event: %v", err)
	}

	meetLink := ""
	if createdEvent.ConferenceData != nil && len(createdEvent.ConferenceData.EntryPoints) > 0 {
		for _, ep := range createdEvent.ConferenceData.EntryPoints {
			if ep.EntryPointType == "video" {
				meetLink = ep.Uri
				break
			}
		}
	}

	return &InterviewMeetingResponse{
		EventID:   createdEvent.Id,
		MeetLink:  meetLink,
		EventLink: createdEvent.HtmlLink,
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
	}, nil
}

func (g *GoogleCalendarService) UpdateInterviewEvent(ctx context.Context, eventID string, req InterviewMeetingRequest) error {
	event, err := g.service.Events.Get("primary", eventID).Context(ctx).Do()
	if err != nil {
		return fmt.Errorf("failed to get event: %v", err)
	}

	event.Summary = req.Summary
	event.Description = req.Description
	event.Start.DateTime = req.StartTime.Format(time.RFC3339)
	event.End.DateTime = req.EndTime.Format(time.RFC3339)

	_, err = g.service.Events.Update("primary", eventID, event).
		SendNotifications(true).
		Context(ctx).
		Do()

	return err
}

func (g *GoogleCalendarService) CancelInterviewEvent(ctx context.Context, eventID string) error {
	return g.service.Events.Delete("primary", eventID).
		SendNotifications(true).
		Context(ctx).
		Do()
}
