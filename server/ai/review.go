// server/ai/review.go
package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"vigilant/models"
)

const (
	CodeReviewTemperature = 0.3
	CodeReviewMaxTokens   = 2048
)

const DefaultCodeReviewSystemPrompt = `You are reviewing a candidate's submitted solution to a take-home coding assignment.

You MUST respond with ONLY a single valid JSON object — no markdown code fences, no commentary before or after. The JSON object must have exactly this shape:

{
  "score": number (0-100, how well the submission fulfills the assignment),
  "summary": "string, 2-3 sentences on overall quality and correctness",
  "strengths": ["string", ...],
  "weaknesses": ["string", ...]
}

Judge the submission against the assignment's stated requirements: does it functionally do what was asked, is the code reasonably well-structured for the stated difficulty level, are edge cases handled. A score of 100 means it fully and correctly satisfies the requirements with clean code; 0 means it does not attempt the task or is fundamentally broken. Be specific in strengths/weaknesses rather than generic. Do not include any text outside the JSON object.`

func (s *Service) ReviewAssignmentSubmission(ctx context.Context, assignmentTitle, assignmentDescription, requirements, repoBundle string) (*models.AssignmentReviewResult, error) {
	userPrompt := buildReviewUserPrompt(assignmentTitle, assignmentDescription, requirements, repoBundle)

	raw, err := s.GenerateDirect(ctx, DefaultCodeReviewSystemPrompt, userPrompt, CodeReviewTemperature, CodeReviewMaxTokens)
	if err != nil {
		return nil, fmt.Errorf("code review generation failed: %w", err)
	}

	return parseReviewResult(raw)
}

func buildReviewUserPrompt(title, description, requirements, repoBundle string) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Assignment: %s\n\n", title)
	if description != "" {
		fmt.Fprintf(&b, "Description:\n%s\n\n", description)
	}
	if requirements != "" {
		fmt.Fprintf(&b, "Requirements:\n%s\n\n", requirements)
	}
	b.WriteString("Candidate's submitted repository contents follow:\n")
	b.WriteString(repoBundle)
	b.WriteString("\n\nReview the submission now, following the required JSON shape exactly.")
	return b.String()
}

func parseReviewResult(raw string) (*models.AssignmentReviewResult, error) {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var out models.AssignmentReviewResult
	if err := json.Unmarshal([]byte(cleaned), &out); err != nil {
		return nil, fmt.Errorf("failed to parse AI review response as JSON: %w (raw: %.200s)", err, cleaned)
	}

	if out.Summary == "" {
		return nil, fmt.Errorf("AI review response missing summary")
	}
	if out.Score < 0 || out.Score > 100 {
		return nil, fmt.Errorf("AI review returned out-of-range score: %.1f", out.Score)
	}

	return &out, nil
}
