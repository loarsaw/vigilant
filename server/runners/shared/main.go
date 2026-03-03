package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type RunRequest struct {
	Code string `json:"code"`
}

type RunResponse struct {
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
	ExitCode int    `json:"exit_code"`
	TimeMS   int64  `json:"time_ms"`
	MemoryKB int64  `json:"memory_kb"`
}

type langConfig struct {
	sourceFile  string
	compileArgs []string 
	runArgs     []string
}

var langs = map[string]langConfig{
	"c": {
		sourceFile:  "main.c",
		compileArgs: []string{"gcc", "-O2", "-o", "/tmp/prog", "/tmp/main.c", "-lm"},
		runArgs:     []string{"/tmp/prog"},
	},
	"cpp": {
		sourceFile:  "main.cpp",
		compileArgs: []string{"g++", "-O2", "-o", "/tmp/prog", "/tmp/main.cpp", "-lm"},
		runArgs:     []string{"/tmp/prog"},
	},
	"js": {
		sourceFile: "main.js",
		runArgs:    []string{"node", "/tmp/main.js"},
	},
	"java": {
		sourceFile:  "Main.java",
		compileArgs: []string{"javac", "/tmp/Main.java"},
		runArgs:     []string{"java", "-cp", "/tmp", "Main"},
	},
}

func handle(w http.ResponseWriter, r *http.Request) {
	var req RunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"bad request"}`, http.StatusBadRequest)
		return
	}

	language := os.Getenv("LANGUAGE")
	cfg, ok := langs[language]
	if !ok {
		http.Error(w, `{"error":"unknown language"}`, http.StatusInternalServerError)
		return
	}

	// Write source file
	srcPath := filepath.Join("/tmp", cfg.sourceFile)
	if err := os.WriteFile(srcPath, []byte(req.Code), 0644); err != nil {
		http.Error(w, `{"error":"write failed"}`, http.StatusInternalServerError)
		return
	}

	resp := RunResponse{}

	// Compile (if needed)
	if cfg.compileArgs != nil {
		var compileOut bytes.Buffer
		cmd := exec.Command(cfg.compileArgs[0], cfg.compileArgs[1:]...)
		cmd.Stdout = &compileOut
		cmd.Stderr = &compileOut
		if err := cmd.Run(); err != nil {
			resp.Stderr = compileOut.String()
			resp.ExitCode = 1
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(resp)
			return
		}
	}

	// Run
	var stdout, stderr bytes.Buffer
	cmd := exec.Command(cfg.runArgs[0], cfg.runArgs[1:]...)
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	start := time.Now()
	err := cmd.Run()
	resp.TimeMS = time.Since(start).Milliseconds()

	resp.Stdout = stdout.String()
	resp.Stderr = stderr.String()

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			resp.ExitCode = exitErr.ExitCode()
		} else {
			resp.ExitCode = 1
		}
	}

	// Memory: read from /proc after run
	if cmd.ProcessState != nil {
		pidStr := fmt.Sprintf("/proc/%d/status", cmd.ProcessState.Pid())
		if data, err := os.ReadFile(pidStr); err == nil {
			for _, line := range strings.Split(string(data), "\n") {
				if strings.HasPrefix(line, "VmPeak:") {
					var kb int64
					fmt.Sscanf(strings.TrimSpace(strings.TrimPrefix(line, "VmPeak:")), "%d", &kb)
					resp.MemoryKB = kb
					break
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func main() {
	language := os.Getenv("LANGUAGE")
	if _, ok := langs[language]; !ok {
		log.Fatalf("LANGUAGE env must be one of: c, cpp, js, java — got: %q", language)
	}
	log.Printf("Runner [%s] ready on :8080", language)
	http.HandleFunc("/run", handle)
	log.Fatal(http.ListenAndServe(":8080", nil))
}