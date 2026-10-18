package ai

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"vigilant/models"
)

const (
	JobDescriptionTemperature = 0.8
	JobDescriptionMaxTokens   = 2048

	skillsMarker = "===SKILLS==="
)

const DefaultJobDescriptionSystemPrompt = `You are an expert technical recruiter writing job descriptions
for a hiring team.

Your reply has exactly TWO parts, in this order, and nothing else — no markdown, no code fences,
no commentary before, between, or after:

PART 1 — the job description as clean HTML, with no <html>/<body>/<div> wrapper.
Use ONLY these HTML tags: <p>, <h2>, <ul>, <ol>, <li>, <strong>, <em>. No other tags, no inline styles,
no classes, no attributes of any kind.
Structure: a short intro paragraph, then an <h2>Responsibilities</h2> heading followed by a bullet list,
then an <h2>What We're Looking For</h2> heading followed by a bullet list.
Do not invent a company name — say "our team" or "the company" generically. Do not include salary,
benefits, or equal-opportunity boilerplate unless the notes explicitly ask for it.

PART 2 — on a new line, the exact marker ` + skillsMarker + `
followed on the next line by 8 to 12 key skills for this role as a single comma-separated list.
Each skill is a short name of a technology, tool, or competency (1 to 4 words, e.g. "Go", "PostgreSQL",
"REST API design", "Docker"). Include any skills the hiring team already listed, then add the most
relevant missing ones. No numbering, no bullets, no explanations, no trailing period.`

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

	htmlPart, skills := splitDescriptionAndSkills(raw)

	cleaned := cleanGeneratedHTML(htmlPart)
	if cleaned == "" {
		return nil, fmt.Errorf("AI response contained no content")
	}

	// Skills are best-effort: if the model skipped the marker we still
	// return the description, just with an empty skills list.
	return &models.GeneratedJobDescription{
		JobDescription: cleaned,
		Skills:         skills,
	}, nil
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
		fmt.Fprintf(&b, "Key requirements/skills already listed: %s\n", req.Requirements)
	}
	fmt.Fprintf(&b, "Tone: %s\n", tone)
	if req.Notes != "" {
		fmt.Fprintf(&b, "Additional notes from the hiring team: %s\n", req.Notes)
	}
	b.WriteString("\nWrite the job description now, then the " + skillsMarker +
		" marker and the skills line, following the required output format exactly.")
	return b.String()
}

func splitDescriptionAndSkills(raw string) (string, []string) {
	text := stripCodeFences(raw)

	idx := strings.Index(text, skillsMarker)
	if idx == -1 {
		return text, []string{}
	}
	return text[:idx], parseSkills(text[idx+len(skillsMarker):])
}

var skillPrefixRe = regexp.MustCompile(`^\s*(?:[-*•]|\d+[.)])\s*`)

func parseSkills(s string) []string {
	s = strings.TrimSpace(s)
	s = strings.NewReplacer("\r\n", ",", "\n", ",", ";", ",").Replace(s)

	out := []string{}
	for _, part := range strings.Split(s, ",") {
		part = skillPrefixRe.ReplaceAllString(part, "")
		part = strings.Trim(strings.TrimSpace(part), `."'`)
		part = strings.TrimSpace(part)
		if part == "" || strings.ContainsAny(part, "<>") {
			continue
		}
		out = append(out, part)
	}
	// Final trimming, dedupe and the 15-item cap happen in the handler's
	// normalizeSkills.
	return out
}

func stripCodeFences(raw string) string {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.TrimPrefix(cleaned, "```html")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	return strings.TrimSpace(cleaned)
}

func cleanGeneratedHTML(raw string) string {
	return stripCodeFences(raw)
}
