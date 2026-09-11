// ai/questions.go
package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"regexp"
	"vigilant/models"
)

var apiKeyPattern = regexp.MustCompile(`([?&]key=)[^&\s"]+`)

func redactAPIKey(s string) string {
	return apiKeyPattern.ReplaceAllString(s, "${1}[REDACTED]")
}

const (
	QuestionsTemperature = 0.7
	QuestionsMaxTokens   = 4096

	DefaultQuestionCount = 5
)

const DefaultQuestionsSystemPrompt = `You are generating interview questions for a candidate
                                       applying to a software engineering position.
                                       You MUST respond with ONLY a single valid JSON object — no markdown code fences,
                                       no commentary before or after. The JSON object must have exactly this shape:

{
  "questions": [
    {
      "question": "string, the question to ask the candidate",
      "category": "string, one of: coding, system_design, behavioral, conceptual",
      "follow_ups": ["string", "string", ...],
      "evaluation_tips": "string, what distinguishes a strong answer from a weak one"
    }
  ]
}

Calibrate depth and scope to the difficulty level given in the user message. If a category is specified,
generate only questions of that category; if "mixed" or unspecified, distribute across categories
sensibly for the role. Do not include any text outside the JSON object.`

func (s *Service) GenerateQuestions(ctx context.Context, positionTitle, jobDescription, jobRequirements string, req models.GenerateQuestionsRequest) (*models.GeneratedQuestionSet, error) {
	if !models.ValidDifficulties[req.Difficulty] {
		return nil, fmt.Errorf("invalid difficulty %q", req.Difficulty)
	}

	count := req.Count
	if count <= 0 {
		count = DefaultQuestionCount
	}

	userPrompt := buildQuestionsUserPrompt(positionTitle, jobDescription, jobRequirements, req.Difficulty, req.Category, count, req.Notes)

	raw, err := s.GenerateDirect(ctx, DefaultQuestionsSystemPrompt, userPrompt, QuestionsTemperature, QuestionsMaxTokens)
	if err != nil {
		return nil, fmt.Errorf("question generation failed: %w", err)
	}

	return parseGeneratedQuestions(raw)
}

func buildQuestionsUserPrompt(positionTitle, jobDescription, jobRequirements, difficulty, category string, count int, notes string) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Position: %s\n", positionTitle)
	if jobDescription != "" {
		fmt.Fprintf(&b, "\nJob description:\n%s\n", jobDescription)
	}
	if jobRequirements != "" {
		fmt.Fprintf(&b, "\nJob requirements:\n%s\n", jobRequirements)
	}
	fmt.Fprintf(&b, "\nDifficulty level: %s\n", difficulty)
	fmt.Fprintf(&b, "Number of questions: %d\n", count)
	if category != "" {
		fmt.Fprintf(&b, "Category: %s\n", category)
	} else {
		b.WriteString("Category: mixed\n")
	}
	if notes != "" {
		fmt.Fprintf(&b, "Additional notes from the hiring team: %s\n", notes)
	}
	b.WriteString("\nBase the questions on the job description and requirements above so they probe skills this role actually needs, not generic trivia. Generate the questions now, following the required JSON shape exactly.")
	return b.String()
}

func parseGeneratedQuestions(raw string) (*models.GeneratedQuestionSet, error) {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var out models.GeneratedQuestionSet
	if err := json.Unmarshal([]byte(cleaned), &out); err != nil {
		return nil, fmt.Errorf("failed to parse AI response as JSON: %w (raw: %.200s)", err, cleaned)
	}

	if len(out.Questions) == 0 {
		return nil, fmt.Errorf("AI response contained no questions")
	}
	for i, q := range out.Questions {
		if q.Question == "" {
			return nil, fmt.Errorf("question at index %d missing 'question' field", i)
		}
	}

	return &out, nil
}
