package analyzer

import (
	"math"
	"regexp"
	"strings"
)

var (
	conventionalCommitRe = regexp.MustCompile(`^(feat|fix|chore|docs|style|refactor|test|perf|build|ci)(\(.+\))?:\s.+`)
	badWordsRe           = regexp.MustCompile(`(?i)^\s*(wip|temp|fix|update|asdf|test|xxx|misc)\s*$`)
)

type ScoreBreakdown struct {
	MessageScore      float64
	AtomicityScore    float64
	CadenceScore      float64
	AuthorScore       float64
	TotalScore        float64
	Tier              string
	CommitCount       int
	AvgLinesPerCommit float64
}

func Score(commits []CommitInfo) ScoreBreakdown {
	if len(commits) == 0 {
		return ScoreBreakdown{Tier: "poor"}
	}

	msgScore := messageQualityScore(commits)
	atomScore, avgLines := atomicityScore(commits)
	cadenceScore := cadenceScore(commits)
	authorScore := authorConsistencyScore(commits)

	total := msgScore*0.30 + atomScore*0.30 + cadenceScore*0.20 + authorScore*0.20

	return ScoreBreakdown{
		MessageScore:      msgScore,
		AtomicityScore:    atomScore,
		CadenceScore:      cadenceScore,
		AuthorScore:       authorScore,
		TotalScore:        total,
		Tier:              tierFor(total),
		CommitCount:       len(commits),
		AvgLinesPerCommit: avgLines,
	}
}

func tierFor(score float64) string {
	switch {
	case score >= 80:
		return "good"
	case score >= 50:
		return "normal"
	default:
		return "poor"
	}
}

func messageQualityScore(commits []CommitInfo) float64 {
	var points float64
	for _, c := range commits {
		msg := strings.TrimSpace(c.Message)
		switch {
		case badWordsRe.MatchString(msg), len(msg) < 10:
			points += 0
		case conventionalCommitRe.MatchString(msg):
			points += 100
		case len(msg) >= 15:
			points += 70
		default:
			points += 40
		}
	}
	return points / float64(len(commits))
}

func atomicityScore(commits []CommitInfo) (score float64, avgLines float64) {
	var total, sumSquares float64
	for _, c := range commits {
		lines := float64(c.LinesAdded + c.LinesDeleted)
		total += lines
	}
	avg := total / float64(len(commits))

	for _, c := range commits {
		lines := float64(c.LinesAdded + c.LinesDeleted)
		sumSquares += (lines - avg) * (lines - avg)
	}
	stddev := math.Sqrt(sumSquares / float64(len(commits)))

	// Penalize large averages and high variance (giant dump commits)
	avgPenalty := math.Max(0, 100-avg/5) // loses points past ~300 lines avg
	variancePenalty := math.Max(0, 100-stddev/10)

	return (avgPenalty + variancePenalty) / 2, avg
}

func cadenceScore(commits []CommitInfo) float64 {
	if len(commits) < 2 {
		return 50 // not enough data to judge
	}

	// commits are typically returned newest-first by go-git's Log
	var deltas []float64
	for i := 0; i < len(commits)-1; i++ {
		delta := commits[i].When.Sub(commits[i+1].When).Hours()
		if delta < 0 {
			delta = -delta
		}
		deltas = append(deltas, delta)
	}

	var sum float64
	for _, d := range deltas {
		sum += d
	}
	mean := sum / float64(len(deltas))

	var sumSquares float64
	for _, d := range deltas {
		sumSquares += (d - mean) * (d - mean)
	}
	stddev := math.Sqrt(sumSquares / float64(len(deltas)))

	if mean < 0.1 && len(commits) > 20 {
		return 20 // likely a single-day bulk dump
	}
	penalty := math.Min(80, stddev/24) // rough normalization, tune as needed
	return math.Max(0, 100-penalty)
}

func authorConsistencyScore(commits []CommitInfo) float64 {
	emails := map[string]int{}
	for _, c := range commits {
		emails[strings.ToLower(c.AuthorEmail)]++
	}

	// Single or few consistent authors = healthy for most candidate repos
	if len(emails) <= 2 {
		return 100
	}
	if len(emails) <= 4 {
		return 70
	}
	return 40
}
