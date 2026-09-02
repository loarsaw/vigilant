package analyzer

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing/transport/http"
	"github.com/google/uuid"
)

func cloneRepo(repoURL, authToken string) (string, *git.Repository, error) {
	localPath := filepath.Join(os.TempDir(), "repo-scan-"+uuid.NewString())

	opts := &git.CloneOptions{
		URL:   repoURL,
		Depth: 1000,
	}
	if authToken != "" {
		opts.Auth = &http.BasicAuth{
			Username: "x-access-token",
			Password: authToken,
		}
	}

	repo, err := git.PlainClone(localPath, false, opts)
	if err != nil {
		return "", nil, fmt.Errorf("failed to clone repo: %w", err)
	}
	return localPath, repo, nil
}

func cleanup(localPath string) {
	if localPath == "" {
		return
	}
	if err := os.RemoveAll(localPath); err != nil {
		fmt.Printf("warning: failed to remove cloned repo at %s: %v\n", localPath, err)
	}
}
