package admin

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
	"vigilant/models"

	"github.com/gin-gonic/gin"
)

func (h *AdminHandlers) GetAuditLog(c *gin.Context) {
	role := c.GetString("admin_role")
	if role != "hr" && role != "superadmin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: insufficient permissions to view audit log"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "25"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 25
	}
	offset := (page - 1) * pageSize

	var conditions []string
	var args []interface{}
	argN := 1

	addFilter := func(clause string, val interface{}) {
		conditions = append(conditions, fmt.Sprintf(clause, argN))
		args = append(args, val)
		argN++
	}

	if entityType := c.Query("entity_type"); entityType != "" {
		addFilter("entity_type = $%d", entityType)
	}
	if entityID := c.Query("entity_id"); entityID != "" {
		addFilter("entity_id = $%d", entityID)
	}
	if adminID := c.Query("admin_id"); adminID != "" {
		addFilter("admin_id = $%d::uuid", adminID)
	}
	if candidateID := c.Query("candidate_id"); candidateID != "" {
		addFilter("candidate_id = $%d::uuid", candidateID)
	}
	if action := c.Query("action"); action != "" {
		addFilter("action = $%d", action)
	}
	if actorType := c.Query("actor_type"); actorType != "" {
		switch actorType {
		case "system":
			conditions = append(conditions, "admin_id IS NULL AND candidate_id IS NULL")
		case "candidate":
			conditions = append(conditions, "candidate_id IS NOT NULL")
		case "admin":
			conditions = append(conditions, "admin_id IS NOT NULL")
		}
	}
	if from := c.Query("from"); from != "" {
		if t, err := time.Parse(time.RFC3339, from); err == nil {
			addFilter("created_at >= $%d", t)
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := time.Parse(time.RFC3339, to); err == nil {
			addFilter("created_at <= $%d", t)
		}
	}

	if q := c.Query("q"); q != "" {
		like := "%" + q + "%"
		conditions = append(conditions, fmt.Sprintf("(description ILIKE $%d OR action ILIKE $%d)", argN, argN+1))
		args = append(args, like, like)
		argN += 2
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	var total int
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM audit_log %s`, whereClause)
	if err := h.DB.QueryRow(countQuery, args...).Scan(&total); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count audit log entries"})
		return
	}

	query := fmt.Sprintf(`
		SELECT
			al.id, al.candidate_id, al.admin_id, al.action, al.entity_type,
			al.entity_id, al.description, al.metadata, al.ip_address::text,
			al.user_agent, al.created_at,
			a.full_name AS admin_name, a.email AS admin_email,
			c.full_name AS candidate_name, c.email AS candidate_email
		FROM audit_log al
		LEFT JOIN administrators a ON a.id = al.admin_id
		LEFT JOIN candidates c ON c.id = al.candidate_id
		%s
		ORDER BY al.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argN, argN+1)

	args = append(args, pageSize, offset)

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch audit log"})
		return
	}
	defer rows.Close()

	entries := make([]models.AuditLogEntry, 0, pageSize)
	for rows.Next() {
		var e models.AuditLogEntry
		var metadataRaw sql.NullString
		var adminName, adminEmail, candidateName, candidateEmail sql.NullString

		if err := rows.Scan(
			&e.ID, &e.CandidateID, &e.AdminID, &e.Action, &e.EntityType,
			&e.EntityID, &e.Description, &metadataRaw, &e.IPAddress,
			&e.UserAgent, &e.CreatedAt,
			&adminName, &adminEmail, &candidateName, &candidateEmail,
		); err != nil {
			continue
		}

		if metadataRaw.Valid {
			e.Metadata = json.RawMessage(metadataRaw.String)
		}

		switch {
		case e.AdminID == nil && e.CandidateID == nil:
			e.ActorType = "system"
			e.ActorLabel = systemActorLabel(e.UserAgent)
		case e.AdminID != nil && adminName.Valid:
			e.ActorType = "admin"
			e.ActorLabel = fmt.Sprintf("%s (%s)", adminName.String, adminEmail.String)
		case e.AdminID == nil && e.CandidateID != nil:
			e.ActorType = "candidate"
			if candidateName.Valid {
				e.ActorLabel = fmt.Sprintf("%s (%s)", candidateName.String, candidateEmail.String)
			} else {
				e.ActorLabel = "Unknown candidate"
			}
		default:

			e.ActorType = "admin"
			e.ActorLabel = "Deleted admin"
		}

		entries = append(entries, e)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": entries,
		"pagination": gin.H{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": (total + pageSize - 1) / pageSize,
		},
	})
}

func systemActorLabel(userAgent *string) string {
	if userAgent != nil && *userAgent != "" {
		return *userAgent
	}
	return "system"
}
