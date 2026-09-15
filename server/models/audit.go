package models

import (
	"encoding/json"
	"time"
)

type AuditLogEntry struct {
	ID          int64           `json:"id"`
	CandidateID *string         `json:"candidate_id"`
	AdminID     *string         `json:"admin_id"`
	ActorLabel  string          `json:"actor_label"`
	ActorType   string          `json:"actor_type"`
	Action      string          `json:"action"`
	EntityType  *string         `json:"entity_type"`
	EntityID    *string         `json:"entity_id"`
	Description *string         `json:"description"`
	Metadata    json.RawMessage `json:"metadata"`
	IPAddress   *string         `json:"ip_address"`
	UserAgent   *string         `json:"user_agent"`
	CreatedAt   time.Time       `json:"created_at"`
}
