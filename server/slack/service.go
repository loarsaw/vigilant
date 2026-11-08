package slack

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"
	_ "time/tzdata"
)

type Cipher interface {
	Encrypt(plaintext string) (string, error)
	Decrypt(ciphertext string) (string, error)
}

const (
	DefaultDigestHour = 18
	DefaultTimezone   = "Asia/Kolkata"
	maxListedPerGroup = 15
)

type Settings struct {
	Configured        bool
	WebhookURL        string
	NotifyShortlisted bool
	NotifyHired       bool
	DigestEnabled     bool
	DigestHour        int
	Timezone          string
	LastDigestAt      *time.Time
	LastSuccessAt     *time.Time
	LastError         string
	LastErrorAt       *time.Time
	UpdatedAt         time.Time
}

type SaveInput struct {
	WebhookURL        *string
	NotifyShortlisted *bool
	NotifyHired       *bool
	DigestEnabled     *bool
	DigestHour        *int
	Timezone          *string
}

type Service struct {
	db     *sql.DB
	cipher Cipher
	client *Client
	now    func() time.Time
}

func NewService(db *sql.DB, cipher Cipher) *Service {
	return &Service{db: db, cipher: cipher, client: NewClient(), now: time.Now}
}

func (s *Service) LoadSettings(ctx context.Context) (*Settings, error) {
	var (
		enc                           string
		st                            Settings
		lastDigest, lastOK, lastErrAt sql.NullTime
		lastErr                       sql.NullString
	)
	err := s.db.QueryRowContext(ctx, `
		SELECT webhook_url_encrypted, notify_shortlisted, notify_hired,
		       daily_digest_enabled, daily_digest_hour, timezone,
		       last_digest_at, last_success_at, last_error, last_error_at, updated_at
		FROM slack_settings WHERE id = 1
	`).Scan(&enc, &st.NotifyShortlisted, &st.NotifyHired, &st.DigestEnabled,
		&st.DigestHour, &st.Timezone, &lastDigest, &lastOK, &lastErr, &lastErrAt, &st.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return &Settings{Configured: false}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("load slack settings: %w", err)
	}
	url, err := s.cipher.Decrypt(enc)
	if err != nil {
		return nil, fmt.Errorf("decrypt slack webhook: %w", err)
	}
	st.Configured = true
	st.WebhookURL = url
	if lastDigest.Valid {
		st.LastDigestAt = &lastDigest.Time
	}
	if lastOK.Valid {
		st.LastSuccessAt = &lastOK.Time
	}
	if lastErrAt.Valid {
		st.LastErrorAt = &lastErrAt.Time
	}
	st.LastError = lastErr.String
	return &st, nil
}

func (s *Service) Save(ctx context.Context, in SaveInput, adminID string) (*Settings, error) {
	cur, err := s.LoadSettings(ctx)
	if err != nil {
		return nil, err
	}
	next := *cur
	if !cur.Configured {
		next.NotifyShortlisted, next.NotifyHired, next.DigestEnabled = true, true, true
		next.DigestHour, next.Timezone = DefaultDigestHour, DefaultTimezone
	}

	if in.WebhookURL != nil && strings.TrimSpace(*in.WebhookURL) != "" {
		next.WebhookURL = strings.TrimSpace(*in.WebhookURL)
	}
	if next.WebhookURL == "" {
		return nil, ValidationError("webhook_url is required")
	}
	if err := ValidateWebhookURL(next.WebhookURL); err != nil {
		return nil, ValidationError(err.Error())
	}
	if in.NotifyShortlisted != nil {
		next.NotifyShortlisted = *in.NotifyShortlisted
	}
	if in.NotifyHired != nil {
		next.NotifyHired = *in.NotifyHired
	}
	if in.DigestEnabled != nil {
		next.DigestEnabled = *in.DigestEnabled
	}
	if in.DigestHour != nil {
		if *in.DigestHour < 0 || *in.DigestHour > 23 {
			return nil, ValidationError("daily_digest_hour must be between 0 and 23")
		}
		next.DigestHour = *in.DigestHour
	}
	if in.Timezone != nil {
		tz := strings.TrimSpace(*in.Timezone)
		if _, err := time.LoadLocation(tz); err != nil || tz == "" || tz == "Local" {
			return nil, ValidationError("timezone must be a valid IANA name such as Asia/Kolkata")
		}
		next.Timezone = tz
	}

	enc, err := s.cipher.Encrypt(next.WebhookURL)
	if err != nil {
		return nil, fmt.Errorf("encrypt slack webhook: %w", err)
	}

	clearErr := in.WebhookURL != nil && strings.TrimSpace(*in.WebhookURL) != ""

	_, err = s.db.ExecContext(ctx, `
		INSERT INTO slack_settings
			(id, webhook_url_encrypted, notify_shortlisted, notify_hired,
			 daily_digest_enabled, daily_digest_hour, timezone, created_by, updated_at)
		VALUES (1, $1, $2, $3, $4, $5, $6, NULLIF($7,'')::uuid, CURRENT_TIMESTAMP)
		ON CONFLICT (id) DO UPDATE SET
			webhook_url_encrypted = EXCLUDED.webhook_url_encrypted,
			notify_shortlisted    = EXCLUDED.notify_shortlisted,
			notify_hired          = EXCLUDED.notify_hired,
			daily_digest_enabled  = EXCLUDED.daily_digest_enabled,
			daily_digest_hour     = EXCLUDED.daily_digest_hour,
			timezone              = EXCLUDED.timezone,
			last_error            = CASE WHEN $8 THEN NULL ELSE slack_settings.last_error END,
			last_error_at         = CASE WHEN $8 THEN NULL ELSE slack_settings.last_error_at END,
			updated_at            = CURRENT_TIMESTAMP
	`, enc, next.NotifyShortlisted, next.NotifyHired, next.DigestEnabled,
		next.DigestHour, next.Timezone, adminID, clearErr)
	if err != nil {
		return nil, fmt.Errorf("save slack settings: %w", err)
	}
	return s.LoadSettings(ctx)
}

func (s *Service) Delete(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM slack_settings WHERE id = 1`)
	return err
}

type ValidationError string

func (e ValidationError) Error() string { return string(e) }

func (s *Service) SendTest(ctx context.Context, webhookURL string) error {
	if strings.TrimSpace(webhookURL) == "" {
		cur, err := s.LoadSettings(ctx)
		if err != nil {
			return err
		}
		if !cur.Configured {
			return ValidationError("Slack is not configured yet")
		}
		webhookURL = cur.WebhookURL
	}
	return s.client.Send(ctx, webhookURL, pingMessage())
}

func (s *Service) NotifyShortlisted(applicationID string, score float64) {
	if s == nil {
		return
	}
	go s.notifyCandidate(applicationID, "shortlisted", func(e *CandidateEvent) Message {
		e.Score = &score
		return shortlistedMessage(*e)
	})
}

func (s *Service) NotifyHired(applicationID, markedBy string) {
	if s == nil {
		return
	}
	go s.notifyCandidate(applicationID, "hired", func(e *CandidateEvent) Message {
		e.MarkedBy = markedBy
		return hiredMessage(*e)
	})
}

func (s *Service) notifyCandidate(applicationID, kind string, build func(*CandidateEvent) Message) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("slack: panic notifying %s for %s: %v", kind, applicationID, r)
		}
	}()
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	st, err := s.LoadSettings(ctx)
	if err != nil {
		log.Printf("slack: load settings: %v", err)
		return
	}
	if !st.Configured || (kind == "shortlisted" && !st.NotifyShortlisted) || (kind == "hired" && !st.NotifyHired) {
		return
	}

	var name, title sql.NullString
	err = s.db.QueryRowContext(ctx, `
		SELECT COALESCE(NULLIF(ja.full_name, ''), c.full_name), p.position_title
		FROM job_applications ja
		JOIN candidates c        ON c.id = ja.candidate_id
		JOIN hiring_positions p  ON p.id = ja.position_id
		WHERE ja.id = $1::uuid
	`, applicationID).Scan(&name, &title)
	if err != nil {
		log.Printf("slack: look up application %s: %v", applicationID, err)
		return
	}
	ev := CandidateEvent{CandidateName: orDefault(name.String, "A candidate"), PositionTitle: orDefault(title.String, "a position")}

	s.deliver(ctx, st.WebhookURL, build(&ev), kind)
}

func (s *Service) deliver(ctx context.Context, url string, msg Message, what string) error {
	err := s.client.Send(ctx, url, msg)
	s.recordResult(err)
	if err != nil {
		log.Printf("slack: %s delivery failed: %v", what, err)
	}
	return err
}

func (s *Service) recordResult(sendErr error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if sendErr == nil {
		_, _ = s.db.ExecContext(ctx, `UPDATE slack_settings SET last_success_at = CURRENT_TIMESTAMP, last_error = NULL, last_error_at = NULL WHERE id = 1`)
		return
	}
	msg := sendErr.Error()
	var se *SendError
	if errors.As(sendErr, &se) {
		msg = se.UserMessage()
	}
	_, _ = s.db.ExecContext(ctx, `UPDATE slack_settings SET last_error = $1, last_error_at = CURRENT_TIMESTAMP WHERE id = 1`, msg)
}

func orDefault(v, d string) string {
	if strings.TrimSpace(v) == "" {
		return d
	}
	return v
}

func (s *Service) RunDigestIfDue(ctx context.Context) error {
	if s == nil {
		return nil
	}
	st, err := s.LoadSettings(ctx)
	if err != nil {
		return err
	}
	if !st.Configured || !st.DigestEnabled {
		return nil
	}
	loc, err := time.LoadLocation(st.Timezone)
	if err != nil {
		return fmt.Errorf("slack digest: bad timezone %q: %w", st.Timezone, err)
	}

	now := s.now().Truncate(time.Microsecond)
	local := now.In(loc)
	scheduled := time.Date(local.Year(), local.Month(), local.Day(), st.DigestHour, 0, 0, 0, loc)
	if local.Before(scheduled) {
		return nil
	}
	if st.LastDigestAt != nil && !st.LastDigestAt.Before(scheduled) {
		return nil
	}

	res, err := s.db.ExecContext(ctx, `
		UPDATE slack_settings SET last_digest_at = $1
		WHERE id = 1 AND last_digest_at IS NOT DISTINCT FROM $2::timestamptz
	`, now, st.LastDigestAt)
	if err != nil {
		return fmt.Errorf("claim digest slot: %w", err)
	}
	if n, _ := res.RowsAffected(); n != 1 {
		return nil
	}

	from := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, loc)
	if st.LastDigestAt != nil && now.Sub(*st.LastDigestAt) < 36*time.Hour {
		from = st.LastDigestAt.In(loc)
	}

	d, err := s.buildDigest(ctx, from, now.In(loc))
	if err == nil {
		err = s.deliver(ctx, st.WebhookURL, digestMessage(d), "digest")
	}
	if err != nil {
		var se *SendError
		permanent := errors.As(err, &se) && !se.Retryable
		if !permanent {

			_, _ = s.db.ExecContext(context.Background(), `
				UPDATE slack_settings SET last_digest_at = $1::timestamptz
				WHERE id = 1 AND last_digest_at = $2`, st.LastDigestAt, now)
		}

		return err
	}
	return nil
}

func (s *Service) SendDigestNow(ctx context.Context) error {
	st, err := s.LoadSettings(ctx)
	if err != nil {
		return err
	}
	if !st.Configured {
		return ValidationError("Slack is not configured yet")
	}
	loc, err := time.LoadLocation(st.Timezone)
	if err != nil {
		loc = time.UTC
	}
	now := s.now().In(loc)
	d, err := s.buildDigest(ctx, now.Add(-24*time.Hour), now)
	if err != nil {
		return err
	}
	return s.deliver(ctx, st.WebhookURL, digestMessage(d), "digest-test")
}

func (s *Service) buildDigest(ctx context.Context, from, to time.Time) (Digest, error) {
	d := Digest{From: from, To: to}

	rows, err := s.db.QueryContext(ctx, `
		SELECT p.position_title, COUNT(*)
		FROM job_applications ja
		JOIN hiring_positions p ON p.id = ja.position_id
		WHERE ja.applied_at >= $1 AND ja.applied_at < $2
		GROUP BY p.id, p.position_title
		ORDER BY COUNT(*) DESC, p.position_title
	`, from, to)
	if err != nil {
		return d, fmt.Errorf("digest: applications by position: %w", err)
	}
	for rows.Next() {
		var pc PositionCount
		if err := rows.Scan(&pc.Title, &pc.Count); err != nil {
			rows.Close()
			return d, err
		}
		d.TotalApplied += pc.Count
		d.ByPosition = append(d.ByPosition, pc)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return d, err
	}

	if d.Shortlisted, d.ShortlistedTotal, err = s.candidateList(ctx, "shortlisted_at", from, to); err != nil {
		return d, err
	}
	if d.Hired, d.HiredTotal, err = s.candidateList(ctx, "hired_at", from, to); err != nil {
		return d, err
	}
	return d, nil
}

func (s *Service) candidateList(ctx context.Context, col string, from, to time.Time) ([]CandidateLine, int, error) {
	if col != "shortlisted_at" && col != "hired_at" {
		return nil, 0, errors.New("invalid column")
	}
	rows, err := s.db.QueryContext(ctx, fmt.Sprintf(`
		SELECT COALESCE(NULLIF(ja.full_name, ''), c.full_name, 'Unknown'), p.position_title,
		       COUNT(*) OVER ()
		FROM job_applications ja
		JOIN candidates c       ON c.id = ja.candidate_id
		JOIN hiring_positions p ON p.id = ja.position_id
		WHERE ja.%s >= $1 AND ja.%s < $2
		ORDER BY ja.%s
		LIMIT %d
	`, col, col, col, maxListedPerGroup), from, to)
	if err != nil {
		return nil, 0, fmt.Errorf("digest: %s: %w", col, err)
	}
	defer rows.Close()

	var out []CandidateLine
	total := 0
	for rows.Next() {
		var l CandidateLine
		if err := rows.Scan(&l.Name, &l.Position, &total); err != nil {
			return nil, 0, err
		}
		out = append(out, l)
	}
	return out, total, rows.Err()
}
