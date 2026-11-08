package slack

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestValidateWebhookURL(t *testing.T) {
	good := []string{"https://hooks.slack.com/services/T000/B000/abcdEFGH"}
	bad := []string{
		"", "http://hooks.slack.com/services/T/B/x",
		"https://evil.com/services/T/B/x",
		"https://hooks.slack.com.evil.com/services/T/B/x",
		"https://hooks.slack.com@evil.com/services/T/B/x",
		"https://user:pw@hooks.slack.com/services/T/B/x",
		"https://hooks.slack.com:8443/services/T/B/x",
		"https://hooks.slack.com/services/T/B/x?x=1",
		"https://hooks.slack.com/triggers/T/B/x",
		"https://hooks.slack.com/services/T/B",
		"https://169.254.169.254/latest/meta-data",
		"https://localhost/services/T/B/x",
	}
	for _, g := range good {
		if err := ValidateWebhookURL(g); err != nil {
			t.Errorf("expected valid: %s: %v", g, err)
		}
	}
	for _, b := range bad {
		if err := ValidateWebhookURL(b); err == nil {
			t.Errorf("expected invalid: %q", b)
		}
	}
}

func TestMaskHidesSecret(t *testing.T) {
	m := MaskWebhookURL("https://hooks.slack.com/services/T000/B000/SECRETTOKENwxyz")
	if strings.Contains(m, "SECRET") || strings.Contains(m, "T000") || !strings.HasSuffix(m, "wxyz") {
		t.Fatalf("bad mask: %s", m)
	}
}

func TestEscapeBlocksInjection(t *testing.T) {
	got := Escape("<!channel> <https://evil.com|Click> & co")
	if strings.ContainsAny(got, "<>") || !strings.Contains(got, "&amp;") {
		t.Fatalf("not escaped: %s", got)
	}
	msg := hiredMessage(CandidateEvent{CandidateName: "<!channel>", PositionTitle: "Dev"})
	b, _ := json.Marshal(msg)
	if strings.Contains(string(b), "<!channel>") {
		t.Fatal("raw <!channel> reached payload")
	}
}

func fastClient() *Client {
	c := NewClient()
	c.backoff = time.Millisecond
	return c
}

func TestRetryOn5xxThenSucceed(t *testing.T) {
	var n int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if atomic.AddInt32(&n, 1) < 3 {
			w.WriteHeader(502)
			return
		}
		w.Write([]byte("ok"))
	}))
	defer srv.Close()
	if err := fastClient().send(context.Background(), srv.URL, pingMessage()); err != nil {
		t.Fatal(err)
	}
	if n != 3 {
		t.Fatalf("attempts = %d, want 3", n)
	}
}

func TestNoRetryOn4xx(t *testing.T) {
	var n int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&n, 1)
		w.WriteHeader(404)
		w.Write([]byte("no_service"))
	}))
	defer srv.Close()
	err := fastClient().send(context.Background(), srv.URL, pingMessage())
	se, ok := err.(*SendError)
	if !ok || se.Retryable || n != 1 {
		t.Fatalf("err=%v attempts=%d", err, n)
	}
	if !strings.Contains(se.UserMessage(), "revoked") {
		t.Fatalf("unfriendly message: %s", se.UserMessage())
	}
}

func TestRedirectsNotFollowed(t *testing.T) {
	var hit int32
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { atomic.AddInt32(&hit, 1) }))
	defer target.Close()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, target.URL, 302)
	}))
	defer srv.Close()
	if err := fastClient().send(context.Background(), srv.URL, pingMessage()); err == nil {
		t.Fatal("302 should be an error")
	}
	if hit != 0 {
		t.Fatal("redirect was followed")
	}
}

func TestDigestStaysUnderSlackLimits(t *testing.T) {
	d := Digest{From: time.Now().Add(-24 * time.Hour), To: time.Now(), TotalApplied: 500}
	for i := 0; i < 500; i++ {
		d.ByPosition = append(d.ByPosition, PositionCount{Title: strings.Repeat("Senior Staff Engineer ", 5), Count: i + 1})
	}
	msg := digestMessage(d)
	for _, b := range msg.Blocks {
		if tx, ok := b["text"].(map[string]any); ok {
			if l := len(tx["text"].(string)); l > 3000 {
				t.Fatalf("section is %d chars (> 3000)", l)
			}
		}
	}
	if len(msg.Blocks) > 50 {
		t.Fatal("too many blocks")
	}
}

func TestEmptyDigest(t *testing.T) {
	msg := digestMessage(Digest{From: time.Now().Add(-time.Hour), To: time.Now()})
	b, _ := json.Marshal(msg)
	if !strings.Contains(string(b), "No new applications") {
		t.Fatal("missing empty-state line")
	}
}
