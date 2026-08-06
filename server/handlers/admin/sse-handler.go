package admin

import (
	"encoding/json"
	"io"
	"net/http"

	"vigilant/models"
	"vigilant/sse"

	"github.com/gin-gonic/gin"
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

	var req models.CandidatePushRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid payload. 'type' and 'payload' are required.",
			"details": err.Error(),
		})
		return
	}

	sse.Global.BroadcastCandidate(candidateID, gin.H{
		"type":    req.Type,
		"payload": req.Payload,
	})

	c.JSON(http.StatusOK, gin.H{"ok": true})
}
