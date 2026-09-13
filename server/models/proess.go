// server/models/process.go
package models

import "time"

// ========================================
// PROCESS MONITORING MODELS
// ========================================

type ProcessReport struct {
	ID        int64     `json:"id,omitempty"`
	SessionID string    `json:"session_id"`
	Timestamp time.Time `json:"timestamp,omitempty"`
	Processes []Process `json:"processes"`
}

type Process struct {
	PID        int     `json:"pid"`
	Name       string  `json:"name"`
	Memory     float64 `json:"memory"`
	IsUnknown  bool    `json:"is_unknown"`
	IsElectron bool    `json:"is_electron"`
	Command    string  `json:"cmd"`
}
