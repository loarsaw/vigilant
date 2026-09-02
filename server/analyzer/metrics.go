package analyzer

import (
	"time"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing/object"
)

type CommitInfo struct {
	Hash         string
	Message      string
	AuthorName   string
	AuthorEmail  string
	When         time.Time
	LinesAdded   int
	LinesDeleted int
}

func extractCommits(repo *git.Repository) ([]CommitInfo, error) {
	ref, err := repo.Head()
	if err != nil {
		return nil, err
	}

	commitIter, err := repo.Log(&git.LogOptions{From: ref.Hash()})
	if err != nil {
		return nil, err
	}
	defer commitIter.Close()

	var commits []CommitInfo

	err = commitIter.ForEach(func(c *object.Commit) error {
		added, deleted := diffStats(c)

		commits = append(commits, CommitInfo{
			Hash:         c.Hash.String(),
			Message:      c.Message,
			AuthorName:   c.Author.Name,
			AuthorEmail:  c.Author.Email,
			When:         c.Author.When,
			LinesAdded:   added,
			LinesDeleted: deleted,
		})
		return nil
	})
	if err != nil {
		return nil, err
	}

	return commits, nil
}

func diffStats(c *object.Commit) (added, deleted int) {
	parent, err := c.Parent(0)
	if err != nil {
		stats, err := c.Stats()
		if err != nil {
			return 0, 0
		}
		for _, s := range stats {
			added += s.Addition
		}
		return added, 0
	}

	patch, err := parent.Patch(c)
	if err != nil {
		return 0, 0
	}
	stats := patch.Stats()
	for _, s := range stats {
		added += s.Addition
		deleted += s.Deletion
	}
	return added, deleted
}
