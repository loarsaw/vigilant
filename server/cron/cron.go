package cron

import (
	"context"
	"database/sql"
	"log"
	"time"

	"vigilant/ai"
	"vigilant/analyzer"
	"vigilant/config"
	"vigilant/notifications"
	"vigilant/slack"

	"github.com/robfig/cron/v3"
)

type Scheduler struct {
	c             *cron.Cron
	db            *sql.DB
	analyzerSvc   *analyzer.Service
	encryptionKey string
	slack         *slack.Service
}

func NewScheduler(db *sql.DB, cfg *config.Config) *Scheduler {
	slackSvc, err := slack.NewFromConfig(db, cfg.EncryptionKey)
	if err != nil {
		log.Printf("cron: slack disabled: %v", err)
	}
	return &Scheduler{
		c:             cron.New(),
		db:            db,
		analyzerSvc:   analyzer.NewService(db, cfg.EncryptionKey, ai.NewService(db), notifications.NewService(db)).WithSlack(slackSvc),
		encryptionKey: cfg.EncryptionKey,
		slack:         slackSvc,
	}
}
func (s *Scheduler) Start() {
	s.c.AddFunc("0 1 * * *", func() {
		if err := s.CancelUnstartedInterviews(); err != nil {
			log.Printf("cron: cancel interviews: %v", err)
		}
	})

	s.c.AddFunc("0 2 * * *", func() {
		if err := s.ExpireCandidateSessions(); err != nil {
			log.Printf("cron: expire candidate sessions: %v", err)
		}
		if err := s.ExpireAdminSessions(); err != nil {
			log.Printf("cron: expire admin sessions: %v", err)
		}
	})

	s.c.AddFunc("*/15 * * * *", func() {
		if err := s.RetryStuckEmailJobs(); err != nil {
			log.Printf("cron: retry email jobs: %v", err)
		}
	})

	s.c.AddFunc("0 3 * * 0", func() {
		if err := s.ArchiveOldProcessLogs(); err != nil {
			log.Printf("cron: archive process logs: %v", err)
		}
	})

	s.c.AddFunc("0 * * * *", func() {
		if err := s.SendInterviewReminders(); err != nil {
			log.Printf("cron: send interview reminders: %v", err)
		}
	})

	s.c.AddFunc("0 * * * *", func() {
		if err := s.ReconcileStaleInterviewSessions(); err != nil {
			log.Printf("cron: reconcile stale interview sessions: %v", err)
		}
	})

	s.c.AddFunc("*/1 * * * *", func() {
		if err := s.AnalyzeJobApplications(); err != nil {
			log.Printf("cron: analyze job applications: %v", err)
		}
	})

	s.c.AddFunc("0 0 * * *", func() {
		if err := s.analyzerSvc.ScoreAssignmentRepos(50); err != nil {
			log.Printf("cron: score assignment repos: %v", err)
		}
	})

	s.c.AddFunc("0 5 * * *", func() {
		if err := s.CleanupExpiredGithubRepos(); err != nil {
			log.Printf("cron: cleanup github repos: %v", err)
		}
	})

	s.c.AddFunc("0 6 * * *", func() {
		if err := s.PruneExpiredApplications(); err != nil {
			log.Printf("cron: prune expired applications: %v", err)
		}
	})

	// Slack daily digest. Runs often, but RunDigestIfDue only sends once per
	// day at the hour/timezone configured in settings (so changing the hour in
	// the UI needs no restart).
	s.c.AddFunc("*/10 * * * *", func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()
		if err := s.slack.RunDigestIfDue(ctx); err != nil {
			log.Printf("cron: slack digest: %v", err)
		}
	})

	s.c.Start()
	log.Println("Cron jobs started")
}

func (s *Scheduler) Stop() {
	s.c.Stop()
}
