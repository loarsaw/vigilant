// server/slack/messages.go
package slack

import (
	"fmt"
	"strings"
	"time"
	"unicode/utf8"
)

const maxSectionChars = 2800

func Escape(s string) string {
	r := strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;")
	return r.Replace(s)
}

func clip(s string, n int) string {
	s = strings.Join(strings.Fields(s), " ")
	if utf8.RuneCountInString(s) <= n {
		return s
	}
	r := []rune(s)
	return string(r[:n-1]) + "…"
}

func safe(s string) string { return Escape(clip(s, 80)) }

func section(text string) map[string]any {
	return map[string]any{"type": "section", "text": map[string]any{"type": "mrkdwn", "text": text}}
}

func header(text string) map[string]any {
	return map[string]any{"type": "header", "text": map[string]any{"type": "plain_text", "text": text, "emoji": true}}
}

func contextBlock(text string) map[string]any {
	return map[string]any{"type": "context", "elements": []map[string]any{{"type": "mrkdwn", "text": text}}}
}

// ---------- real-time events ----------

type CandidateEvent struct {
	CandidateName string
	PositionTitle string
	Score         *float64 // shortlist only
	MarkedBy      string   // hired only
}

func shortlistedMessage(e CandidateEvent) Message {
	name, pos := safe(e.CandidateName), safe(e.PositionTitle)
	line := fmt.Sprintf("*%s* was shortlisted for *%s*", name, pos)
	if e.Score != nil {
		line += fmt.Sprintf(" (assignment score %.1f)", *e.Score)
	}
	return Message{
		Text: fmt.Sprintf("Shortlisted: %s for %s", clip(e.CandidateName, 80), clip(e.PositionTitle, 80)),
		Blocks: []map[string]any{
			section("⭐ *Candidate shortlisted*\n" + line + "\nNext step: schedule an interview."),
		},
	}
}

func hiredMessage(e CandidateEvent) Message {
	name, pos := safe(e.CandidateName), safe(e.PositionTitle)
	line := fmt.Sprintf("*%s* was marked as *hired* for *%s*", name, pos)
	blocks := []map[string]any{section("🎉 *New hire*\n" + line)}
	if e.MarkedBy != "" {
		blocks = append(blocks, contextBlock("Marked by "+safe(e.MarkedBy)))
	}
	return Message{
		Text:   fmt.Sprintf("Hired: %s for %s", clip(e.CandidateName, 80), clip(e.PositionTitle, 80)),
		Blocks: blocks,
	}
}

func pingMessage() Message {
	return Message{
		Text: "Vigilant is connected to this channel.",
		Blocks: []map[string]any{
			section("✅ *Vigilant is connected.* You'll receive shortlist, hire and daily digest updates here."),
		},
	}
}

// ---------- daily digest ----------

type PositionCount struct {
	Title string
	Count int
}

type CandidateLine struct {
	Name     string
	Position string
}

type Digest struct {
	From, To         time.Time
	TotalApplied     int
	ByPosition       []PositionCount
	Shortlisted      []CandidateLine
	ShortlistedTotal int
	Hired            []CandidateLine
	HiredTotal       int
}

func capLines(lines []string) string {
	var b strings.Builder
	for i, l := range lines {
		remaining := len(lines) - i
		tail := fmt.Sprintf("\n_…and %d more_", remaining)
		if b.Len()+len(l)+1+len(tail) > maxSectionChars {
			b.WriteString(tail)
			return b.String()
		}
		if i > 0 {
			b.WriteByte('\n')
		}
		b.WriteString(l)
	}
	return b.String()
}

func digestMessage(d Digest) Message {
	title := "Hiring digest — " + d.To.Format("Mon, 2 Jan")
	blocks := []map[string]any{
		header("📋 " + title),
		{
			"type": "section",
			"fields": []map[string]any{
				{"type": "mrkdwn", "text": fmt.Sprintf("*New applications*\n%d", d.TotalApplied)},
				{"type": "mrkdwn", "text": fmt.Sprintf("*Shortlisted*\n%d", d.ShortlistedTotal)},
				{"type": "mrkdwn", "text": fmt.Sprintf("*Hired*\n%d", d.HiredTotal)},
			},
		},
	}

	if len(d.ByPosition) > 0 {
		lines := make([]string, 0, len(d.ByPosition))
		for _, p := range d.ByPosition {
			lines = append(lines, fmt.Sprintf("• %s — *%d*", safe(p.Title), p.Count))
		}
		blocks = append(blocks, section("*Applications by position*\n"+capLines(lines)))
	}
	if len(d.Shortlisted) > 0 {
		lines := candLines(d.Shortlisted, d.ShortlistedTotal)
		blocks = append(blocks, section("*Shortlisted*\n"+capLines(lines)))
	}
	if len(d.Hired) > 0 {
		lines := candLines(d.Hired, d.HiredTotal)
		blocks = append(blocks, section("*Hired*\n"+capLines(lines)))
	}
	if d.TotalApplied == 0 && d.ShortlistedTotal == 0 && d.HiredTotal == 0 {
		blocks = append(blocks, section("No new applications, shortlists or hires in this period."))
	}

	blocks = append(blocks, contextBlock(fmt.Sprintf("Covers %s → %s (%s)",
		d.From.Format("Mon 3:04 PM"), d.To.Format("Mon 3:04 PM"), d.To.Format("MST"))))

	return Message{
		Text: fmt.Sprintf("%s: %d applications, %d shortlisted, %d hired",
			title, d.TotalApplied, d.ShortlistedTotal, d.HiredTotal),
		Blocks: blocks,
	}
}

func candLines(cs []CandidateLine, total int) []string {
	lines := make([]string, 0, len(cs)+1)
	for _, c := range cs {
		lines = append(lines, fmt.Sprintf("• %s — %s", safe(c.Name), safe(c.Position)))
	}
	if total > len(cs) {
		lines = append(lines, fmt.Sprintf("_…and %d more_", total-len(cs)))
	}
	return lines
}
