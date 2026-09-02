package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"vigilant/models"
)

const (
	AssignmentTemperature = 0.7
	AssignmentMaxTokens   = 4096
)

const DefaultAssignmentSystemPrompt = `You are generating a take-home coding assignment for a candidate 
                                       applying to a software engineering position.
                                       You MUST respond with ONLY a single valid JSON object — no markdown code fences,
                                       no commentary before or after. The JSON object must have exactly this shape:

{
  "title": "string, short assignment name",
  "description": "string, 2-4 paragraphs explaining the task, what the candidate should build, and how it will be evaluated",
  "requirements": ["string", "string", ...],
  "starter_readme": "string, markdown content for a README.md that will be placed in the candidate's repo — should restate the task, setup instructions, and submission expectations",
  "estimated_hours": number
}

Calibrate difficulty, scope, and expected depth to the difficulty level given in the user message. Keep the assignment completable within the estimated_hours you provide. Do not include any text outside the JSON object.`

func (s *Service) GenerateAssignment(ctx context.Context, positionTitle, jobDescription, jobRequirements string, req models.GenerateAssignmentRequest) (*models.GeneratedAssignment, error) {
	if !models.ValidDifficulties[req.Difficulty] {
		return nil, fmt.Errorf("invalid difficulty %q", req.Difficulty)
	}

	userPrompt := buildAssignmentUserPrompt(positionTitle, jobDescription, jobRequirements, req.Difficulty, req.Notes)

	raw, err := s.GenerateDirect(ctx, DefaultAssignmentSystemPrompt, userPrompt, AssignmentTemperature, AssignmentMaxTokens)
	if err != nil {
		return nil, fmt.Errorf("assignment generation failed: %w", err)
	}

	return parseGeneratedAssignment(raw)
}

func buildAssignmentUserPrompt(positionTitle, jobDescription, jobRequirements, difficulty, notes string) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Position: %s\n", positionTitle)
	if jobDescription != "" {
		fmt.Fprintf(&b, "\nJob description:\n%s\n", jobDescription)
	}
	if jobRequirements != "" {
		fmt.Fprintf(&b, "\nJob requirements:\n%s\n", jobRequirements)
	}
	fmt.Fprintf(&b, "\nDifficulty level: %s\n", difficulty)
	if notes != "" {
		fmt.Fprintf(&b, "Additional notes from the hiring team: %s\n", notes)
	}
	b.WriteString("\nBase the assignment's subject matter and technical focus on the job description and requirements above — the assignment should feel directly relevant to what this role actually does, not generic. Generate the assignment now, following the required JSON shape exactly.")
	return b.String()
}

func parseGeneratedAssignment(raw string) (*models.GeneratedAssignment, error) {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var out models.GeneratedAssignment
	if err := json.Unmarshal([]byte(cleaned), &out); err != nil {
		return nil, fmt.Errorf("failed to parse AI response as JSON: %w (raw: %.200s)", err, cleaned)
	}

	if out.Title == "" || out.Description == "" || len(out.Requirements) == 0 {
		return nil, fmt.Errorf("AI response missing required fields (title/description/requirements)")
	}

	return &out, nil
}
