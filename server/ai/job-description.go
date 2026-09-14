package ai

import (
	"context"
	"fmt"
	"strings"

	"vigilant/models"
)

const (
	JobDescriptionTemperature = 0.8
	JobDescriptionMaxTokens   = 2048
)

const DefaultJobDescriptionSystemPrompt = `You are an expert technical recruiter writing job descriptions
for a hiring team. You MUST respond with ONLY clean HTML — no markdown, no code fences, no commentary
before or after, no <html>/<body>/<div> wrapper.

Use ONLY these HTML tags: <p>, <h2>, <ul>, <ol>, <li>, <strong>, <em>. No other tags, no inline styles,
no classes, no attributes of any kind.

Structure: a short intro paragraph, then an <h2>Responsibilities</h2> heading followed by a bullet list,
then an <h2>What We're Looking For</h2> heading followed by a bullet list if requirements were given.
Do not invent a company name — say "our team" or "the company" generically. Do not include salary,
benefits, or equal-opportunity boilerplate unless the notes explicitly ask for it.`

func (s *Service) GenerateJobDescription(ctx context.Context, req models.GenerateJobDescriptionRequest) (*models.GeneratedJobDescription, error) {
	if strings.TrimSpace(req.PositionTitle) == "" {
		return nil, fmt.Errorf("position_title is required")
	}

	tone := req.Tone
	if tone == "" {
		tone = "professional"
	}

	userPrompt := buildJobDescriptionUserPrompt(req, tone)

	raw, err := s.GenerateDirect(ctx, DefaultJobDescriptionSystemPrompt, userPrompt, JobDescriptionTemperature, JobDescriptionMaxTokens)
	if err != nil {
		return nil, fmt.Errorf("job description generation failed: %w", err)
	}

	cleaned := cleanGeneratedHTML(raw)
	if cleaned == "" {
		return nil, fmt.Errorf("AI response contained no content")
	}

	return &models.GeneratedJobDescription{JobDescription: cleaned}, nil
}

func buildJobDescriptionUserPrompt(req models.GenerateJobDescriptionRequest, tone string) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Position title: %s\n", req.PositionTitle)
	if req.Department != "" {
		fmt.Fprintf(&b, "Department: %s\n", req.Department)
	}
	if req.Location != "" {
		fmt.Fprintf(&b, "Location: %s\n", req.Location)
	}
	if req.EmploymentType != "" {
		fmt.Fprintf(&b, "Employment type: %s\n", req.EmploymentType)
	}
	if req.ExperienceRequired != "" {
		fmt.Fprintf(&b, "Experience required: %s\n", req.ExperienceRequired)
	}
	if req.Requirements != "" {
		fmt.Fprintf(&b, "Key requirements/skills: %s\n", req.Requirements)
	}
	fmt.Fprintf(&b, "Tone: %s\n", tone)
	if req.Notes != "" {
		fmt.Fprintf(&b, "Additional notes from the hiring team: %s\n", req.Notes)
	}
	b.WriteString("\nWrite the job description now, following the required HTML output format exactly.")
	return b.String()
}

func cleanGeneratedHTML(raw string) string {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.TrimPrefix(cleaned, "```html")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	return strings.TrimSpace(cleaned)
}
