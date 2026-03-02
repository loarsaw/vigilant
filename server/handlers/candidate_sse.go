package handlers

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"vigilant/sse"
)

func (h *Handlers) SSEEvents(c *gin.Context) {
	tokenStr := c.Query("token")
	if tokenStr == "" {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(h.Cfg.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	candidateID, ok := claims["candidate_id"].(string)
	if !ok || candidateID == "" {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	if candidateID == "" {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	clientChan := make(chan any, 10)
	sse.Global.AddCandidate(candidateID, clientChan)
	defer sse.Global.RemoveCandidate(candidateID, clientChan)

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