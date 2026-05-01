package cron

import (
	"database/sql"
	"log"

	"github.com/robfig/cron/v3"
)

type Scheduler struct {
	c  *cron.Cron
	db *sql.DB
}

func NewScheduler(db *sql.DB) *Scheduler {
	return &Scheduler{
		c:  cron.New(),
		db: db,
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

	s.c.Start()
	log.Println("Cron jobs started")
}

func (s *Scheduler) Stop() {
	s.c.Stop()
}
