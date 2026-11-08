// server/slack/client.go
package slack

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	webhookHost       = "hooks.slack.com"
	webhookPathPrefix = "/services/"
)

func ValidateWebhookURL(raw string) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return errors.New("webhook URL is required")
	}
	u, err := url.Parse(raw)
	if err != nil {
		return errors.New("webhook URL is not a valid URL")
	}
	if u.Scheme != "https" {
		return errors.New("webhook URL must use https")
	}
	if u.Hostname() != webhookHost || u.Port() != "" || u.User != nil {
		return fmt.Errorf("webhook URL must be a %s incoming webhook", webhookHost)
	}
	if u.RawQuery != "" || u.Fragment != "" {
		return errors.New("webhook URL must not contain a query string or fragment")
	}
	if !strings.HasPrefix(u.Path, webhookPathPrefix) {
		return errors.New("webhook URL must look like https://hooks.slack.com/services/T…/B…/…")
	}
	parts := strings.Split(strings.TrimPrefix(u.Path, webhookPathPrefix), "/")
	if len(parts) != 3 || parts[0] == "" || parts[1] == "" || parts[2] == "" {
		return errors.New("webhook URL must look like https://hooks.slack.com/services/T…/B…/…")
	}
	return nil
}

func MaskWebhookURL(raw string) string {
	raw = strings.TrimSpace(raw)
	tail := ""
	if len(raw) >= 4 {
		tail = raw[len(raw)-4:]
	}
	return "https://hooks.slack.com/services/•••/•••/••••" + tail
}

type Message struct {
	Text   string           `json:"text"`
	Blocks []map[string]any `json:"blocks,omitempty"`
}

type SendError struct {
	Status    int
	Body      string
	Retryable bool
	Err       error
}

func (e *SendError) Error() string {
	if e.Err != nil {
		return "slack: request failed: " + e.Err.Error()
	}
	return fmt.Sprintf("slack: HTTP %d: %s", e.Status, e.Body)
}

func (e *SendError) Unwrap() error { return e.Err }

func (e *SendError) UserMessage() string {
	switch strings.TrimSpace(e.Body) {
	case "no_service", "invalid_token":
		return "Slack says this webhook no longer exists or was revoked. Create a new incoming webhook and paste it again."
	case "channel_not_found":
		return "The channel this webhook posts to no longer exists."
	case "channel_is_archived":
		return "The channel this webhook posts to is archived."
	case "action_prohibited":
		return "Your Slack workspace admin has restricted this webhook."
	case "rate_limited":
		return "Slack is rate-limiting this webhook. It will be retried."
	}
	if e.Err != nil {
		return "Could not reach Slack. Check the server's outbound network access."
	}
	return fmt.Sprintf("Slack rejected the message (HTTP %d).", e.Status)
}

type Client struct {
	http        *http.Client
	maxAttempts int
	backoff     time.Duration
	maxRetryAft time.Duration
}

func NewClient() *Client {
	return &Client{
		http: &http.Client{
			Timeout: 10 * time.Second,

			CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
		},
		maxAttempts: 3,
		backoff:     1 * time.Second,
		maxRetryAft: 30 * time.Second,
	}
}

func (c *Client) Send(ctx context.Context, webhookURL string, msg Message) error {
	if err := ValidateWebhookURL(webhookURL); err != nil {
		return err
	}
	return c.send(ctx, webhookURL, msg)
}

func (c *Client) send(ctx context.Context, webhookURL string, msg Message) error {
	payload, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("slack: marshal message: %w", err)
	}

	var lastErr error
	for attempt := 1; attempt <= c.maxAttempts; attempt++ {
		wait, err := c.attempt(ctx, webhookURL, payload)
		if err == nil {
			return nil
		}
		lastErr = err

		var se *SendError
		if !errors.As(err, &se) || !se.Retryable || attempt == c.maxAttempts {
			return err
		}
		if wait <= 0 {
			wait = c.backoff * time.Duration(1<<(attempt-1))
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(wait):
		}
	}
	return lastErr
}

func (c *Client) attempt(ctx context.Context, webhookURL string, payload []byte) (time.Duration, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, webhookURL, bytes.NewReader(payload))
	if err != nil {
		return 0, &SendError{Err: err}
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		// Don't leak the secret webhook path into logs via the url.Error.
		return 0, &SendError{Err: errors.New(sanitizeTransportErr(err)), Retryable: true}
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return 0, nil
	}

	se := &SendError{Status: resp.StatusCode, Body: strings.TrimSpace(string(body))}
	switch {
	case resp.StatusCode == http.StatusTooManyRequests:
		se.Retryable = true
		if secs, convErr := strconv.Atoi(resp.Header.Get("Retry-After")); convErr == nil && secs > 0 {
			wait := time.Duration(secs) * time.Second
			if wait > c.maxRetryAft {
				wait = c.maxRetryAft
			}
			return wait, se
		}
	case resp.StatusCode >= 500:
		se.Retryable = true
	}
	return 0, se
}

func sanitizeTransportErr(err error) string {
	var ue *url.Error
	if errors.As(err, &ue) {
		return ue.Op + ": " + ue.Err.Error()
	}
	return err.Error()
}
