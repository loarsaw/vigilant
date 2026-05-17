package admin

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"time"
	"vigilant/call"
	"vigilant/email"

	"github.com/gin-gonic/gin"
	"github.com/twilio/twilio-go/client/jwt"
)

func (h *AdminHandlers) SaveTwilioConfig(c *gin.Context) {
	var req struct {
		AccountSID   string `json:"account_sid" binding:"required"`
		APIKeySID    string `json:"api_key_sid" binding:"required"`
		APIKeySecret string `json:"api_key_secret" binding:"required"`
		TwiMLAppSID  string `json:"twiml_app_sid" binding:"required"`
		FromNumber   string `json:"from_number" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	key, err := email.DecodeKey(h.Cfg.EncryptionKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid encryption key"})
		return
	}

	cfg := &call.TwilioConfig{
		AccountSID:   req.AccountSID,
		APIKeySID:    req.APIKeySID,
		APIKeySecret: req.APIKeySecret,
		TwiMLAppSID:  req.TwiMLAppSID,
		FromNumber:   req.FromNumber,
	}

	if err := call.SaveTwilioConfig(c.Request.Context(), h.DB, key, cfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "twilio config saved"})
}

func (h *AdminHandlers) GetTwilioConfig(c *gin.Context) {
	key, err := email.DecodeKey(h.Cfg.EncryptionKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid encryption key"})
		return
	}

	cfg, err := call.LoadTwilioConfig(c.Request.Context(), h.DB, key)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"account_sid":   cfg.AccountSID,
		"api_key_sid":   cfg.APIKeySID,
		"twiml_app_sid": cfg.TwiMLAppSID,
		"from_number":   cfg.FromNumber,
	})
}

func (h *AdminHandlers) GetCallToken(c *gin.Context) {
	key, err := email.DecodeKey(h.Cfg.EncryptionKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid encryption key"})
		return
	}

	cfg, err := call.LoadTwilioConfig(c.Request.Context(), h.DB, key)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "twilio not configured"})
		return
	}

	params := jwt.AccessTokenParams{
		AccountSid:    cfg.AccountSID,
		SigningKeySid: cfg.APIKeySID,
		Secret:        cfg.APIKeySecret,
		Identity:      "admin",
	}

	jwtToken := jwt.CreateAccessToken(params)
	jwtToken.AddGrant(&jwt.VoiceGrant{
		Outgoing: jwt.Outgoing{ApplicationSid: cfg.TwiMLAppSID},
		Incoming: jwt.Incoming{Allow: true},
	})

	token, err := jwtToken.ToJwt()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}

func (h *AdminHandlers) OutboundCallTwiML(c *gin.Context) {
	to := c.PostForm("To")
	callSid := c.PostForm("CallSid")

	if to == "" {
		c.Header("Content-Type", "text/xml")
		c.String(http.StatusOK, `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Missing destination</Say></Response>`)
		return
	}

	_, err := h.DB.Exec(`
        INSERT INTO call_logs (to_number, call_sid, status)
        VALUES ($1, $2, 'initiated')
    `, to, callSid)
	if err != nil {
		log.Printf("failed to save call log: %v", err)
	}

	twiml := `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial action="/api/v1/twilio/outbound/status" method="POST">` + to + `</Dial>
</Response>`

	c.Header("Content-Type", "text/xml")
	c.String(http.StatusOK, twiml)
}

func (h *AdminHandlers) CallStatusTwiML(c *gin.Context) {
	callSid := c.PostForm("CallSid")
	callStatus := c.PostForm("DialCallStatus")
	durationStr := c.PostForm("DialCallDuration")

	duration := 0
	if durationStr != "" {
		fmt.Sscanf(durationStr, "%d", &duration)
	}

	_, err := h.DB.Exec(`
        UPDATE call_logs SET status = $1, duration = $2, ended_at = NOW()
        WHERE call_sid = $3
    `, callStatus, duration, callSid)
	if err != nil {
		log.Printf("failed to update call log: %v", err)
	}

	c.Header("Content-Type", "text/xml")
	c.String(http.StatusOK, `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`)
}

func (h *AdminHandlers) ListCallLogs(c *gin.Context) {
	rows, err := h.DB.Query(`
		SELECT cl.id, cl.to_number, cl.call_sid, cl.status,
		       cl.duration, cl.created_at, cl.ended_at,
		       a.full_name as admin_name,
		       cand.full_name as candidate_name
		FROM call_logs cl
		LEFT JOIN administrators a ON cl.admin_id = a.id
		LEFT JOIN candidates cand ON cl.candidate_id = cand.id
		ORDER BY cl.created_at DESC
		LIMIT 100
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch call logs"})
		return
	}
	defer rows.Close()

	var logs []gin.H
	for rows.Next() {
		var id int64
		var toNumber, callSid, status string
		var duration int
		var createdAt time.Time
		var endedAt sql.NullTime
		var adminName, candidateName sql.NullString

		if err := rows.Scan(&id, &toNumber, &callSid, &status,
			&duration, &createdAt, &endedAt,
			&adminName, &candidateName); err != nil {
			continue
		}

		logs = append(logs, gin.H{
			"id":             id,
			"to_number":      toNumber,
			"call_sid":       callSid,
			"status":         status,
			"duration":       duration,
			"created_at":     createdAt,
			"ended_at":       endedAt.Time,
			"admin_name":     adminName.String,
			"candidate_name": candidateName.String,
		})
	}

	if logs == nil {
		logs = []gin.H{}
	}

	c.JSON(http.StatusOK, gin.H{"call_logs": logs})
}
