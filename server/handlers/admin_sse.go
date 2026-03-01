package handlers

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"vigilant/sse"
)

func (h *AdminHandlers) SSEEvents(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	

	if token != h.Cfg.AdminAuthToken {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	clientChan := make(chan any, 10)
	sse.Global.AddAdmin(clientChan)
	defer sse.Global.RemoveAdmin(clientChan)

	c.Stream(func(w io.Writer) bool {
		select {
		case msg, ok := <-clientChan:
			if !ok {
				return false
			}
			data, _ := json.Marshal(msg)
			c.SSEvent("message", string(data))
			return true
		case <-c.Request.Context().Done():
			return false
		}
	})
}

func (h *AdminHandlers) PushToCandidate(c *gin.Context) {
	candidateID := c.Param("id")

	var body struct {
		Type    string `json:"type"`
		Payload any    `json:"payload"`
	}

	if err := c.ShouldBindJSON(&body); err != nil || body.Type == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	sse.Global.BroadcastCandidate(candidateID, gin.H{
		"type":    body.Type,
		"payload": body.Payload,
	})

	c.JSON(http.StatusOK, gin.H{"ok": true})
}