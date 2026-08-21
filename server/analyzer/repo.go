package analyzer

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const (
	maxFileBytes  = 20 * 1024
	maxTotalBytes = 150 * 1024
)

var skipDirs = map[string]bool{
	".git": true, "node_modules": true, "vendor": true, "dist": true,
	"build": true, "target": true, ".next": true, "__pycache__": true,
	".venv": true, "venv": true, ".idea": true, ".vscode": true,
}

var skipExtensions = map[string]bool{
	".png": true, ".jpg": true, ".jpeg": true, ".gif": true, ".ico": true,
	".pdf": true, ".zip": true, ".tar": true, ".gz": true, ".woff": true,
	".woff2": true, ".ttf": true, ".eot": true, ".mp4": true, ".mov": true,
	".exe": true, ".bin": true, ".so": true, ".dylib": true, ".dll": true,
	".class": true, ".jar": true,
}

var skipFilenames = map[string]bool{
	"package-lock.json": true, "yarn.lock": true, "pnpm-lock.yaml": true,
	"go.sum": true, "Cargo.lock": true, "poetry.lock": true,
}

func BuildRepoTextBundle(localPath string) (string, error) {
	var b strings.Builder
	totalBytes := 0
	skippedCount := 0

	err := filepath.Walk(localPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		rel, relErr := filepath.Rel(localPath, path)
		if relErr != nil {
			rel = path
		}

		if info.IsDir() {
			if skipDirs[info.Name()] {
				return filepath.SkipDir
			}
			return nil
		}

		if skipFilenames[info.Name()] || skipExtensions[strings.ToLower(filepath.Ext(info.Name()))] {
			return nil
		}

		if totalBytes >= maxTotalBytes {
			skippedCount++
			return nil
		}

		content, readErr := os.ReadFile(path)
		if readErr != nil {
			skippedCount++
			return nil
		}

		checkLen := len(content)
		if checkLen > 512 {
			checkLen = 512
		}
		if strings.Contains(string(content[:checkLen]), "\x00") {
			return nil
		}

		truncated := false
		if len(content) > maxFileBytes {
			content = content[:maxFileBytes]
			truncated = true
		}

		remaining := maxTotalBytes - totalBytes
		if len(content) > remaining {
			content = content[:remaining]
			truncated = true
		}

		fmt.Fprintf(&b, "\n--- FILE: %s ---\n", rel)
		b.Write(content)
		if truncated {
			b.WriteString("\n[...truncated...]\n")
		}

		totalBytes += len(content)
		return nil
	})
	if err != nil {
		return "", fmt.Errorf("failed to walk repo: %w", err)
	}

	if skippedCount > 0 {
		fmt.Fprintf(&b, "\n\n[%d additional file(s) omitted for size/type]\n", skippedCount)
	}

	return b.String(), nil
}
