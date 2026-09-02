package cron

import (
	"log"

	"vigilant/analyzer"
)

const analyzeJobBatchSize = 10

func (s *Scheduler) AnalyzeJobApplications() error {
	pending, err := s.analyzerSvc.FetchPendingApplications(analyzeJobBatchSize)
	if err != nil {
		return err
	}

	if len(pending) == 0 {
		return nil
	}

	log.Printf("cron: analyzing %d pending job application(s)", len(pending))

	for _, app := range pending {
		if len(app.GithubURLs) == 0 {
			log.Printf("cron: application %s has no github_urls, skipping", app.ID)
			continue
		}

		err := s.analyzerSvc.AnalyzeApplication(analyzer.AnalyzeInput{
			JobApplicationID: app.ID,
			CandidateID:      app.CandidateID,
			RepoURLs:         app.GithubURLs,
			// AuthToken:
		})
		if err != nil {
			log.Printf("cron: failed to analyze application %s: %v", app.ID, err)
			continue
		}
	}

	return nil
}
