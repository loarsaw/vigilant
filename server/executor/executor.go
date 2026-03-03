package executor

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"vigilant/models"
)

var runnerURLs = map[models.Language]string{
	models.LangC:    "http://runner-c:8080/run",
	models.LangCPP:  "http://runner-cpp:8080/run",
	models.LangJS:   "http://runner-js:8080/run",
	models.LangJava: "http://runner-java:8080/run",
}

type RunRequest struct {
	Code string `json:"code"`
}

type RunResult struct {
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
	ExitCode int    `json:"exit_code"`
	TimeMS   int64  `json:"time_ms"`
	MemoryKB int64  `json:"memory_kb"`
}

func Execute(lang models.Language, code string) (*RunResult, error) {
	url, ok := runnerURLs[lang]
	if !ok {
		return nil, fmt.Errorf("unsupported language: %s", lang)
	}

	body, _ := json.Marshal(RunRequest{Code: code})

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		// Timeout from context
		if ctx.Err() == context.DeadlineExceeded {
			return &RunResult{
				Stderr:   "execution timed out (15s limit)",
				ExitCode: 124,
				TimeMS:   15000,
			}, nil
		}
		return nil, fmt.Errorf("runner unreachable: %w", err)
	}
	defer resp.Body.Close()

	var result RunResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("invalid runner response: %w", err)
	}
	return &result, nil
}
