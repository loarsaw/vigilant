package audit

import (
	"database/sql"
	"encoding/json"
	"log"

	"vigilant/middleware"
)

type Execer interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
}

// LogAdminAction records an audit_log entry for an admin-initiated action.
func LogAdminAction(db Execer, adminID, action, entityType, entityID, description string, metadata map[string]interface{}, ip, userAgent string) {
	var adminIDParam interface{} = adminID
	if adminID == middleware.SuperAdminUUID {
		adminIDParam = nil
		if metadata == nil {
			metadata = map[string]interface{}{}
		}
		metadata["actor"] = "super_admin"
	}

	metadataJSON := marshalMetadata(metadata)

	_, err := db.Exec(`
		INSERT INTO audit_log (admin_id, action, entity_type, entity_id, description, metadata, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, adminIDParam, action, entityType, entityID, description, metadataJSON, ip, userAgent)
	if err != nil {
		log.Printf("LogAdminAction: failed to insert audit log for action %q: %v", action, err)
	}
}

func LogSystemAction(db Execer, action, entityType, entityID, description string, metadata map[string]interface{}, source string) error {
	metadataJSON := marshalMetadata(metadata)

	_, err := db.Exec(`
		INSERT INTO audit_log (
			candidate_id, admin_id, action, entity_type, entity_id, description,
			metadata, ip_address, user_agent, created_at
		) VALUES (NULL, NULL, $1, $2, $3, $4, $5, NULL, $6, CURRENT_TIMESTAMP)
	`, action, entityType, entityID, description, metadataJSON, source)
	if err != nil {
		log.Printf("LogSystemAction: failed to insert audit log for action %q: %v", action, err)
	}
	return err
}

func LogCandidateAction(db Execer, candidateID, action, entityType, entityID, ip, userAgent string) {
	_, err := db.Exec(`
		INSERT INTO audit_log (candidate_id, action, entity_type, entity_id, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, candidateID, action, entityType, entityID, ip, userAgent)
	if err != nil {
		log.Printf("LogCandidateAction: failed to insert audit log for action %q: %v", action, err)
	}
}

func marshalMetadata(metadata map[string]interface{}) interface{} {
	if metadata == nil {
		return nil
	}
	b, err := json.Marshal(metadata)
	if err != nil {
		log.Printf("audit: failed to marshal metadata: %v", err)
		return "{}"
	}
	return string(b)
}
