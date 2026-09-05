// server/handlers/admin/notification-handler.go
package admin

import (
	"net/http"
	"strconv"
	"vigilant/models"

	"github.com/gin-gonic/gin"
)

// ListNotifications returns notifications for the currently authenticated
// admin (their own targeted notifications plus all broadcasts). Pass
// ?unread=true to filter to unread only, ?limit=N to cap the result
// (defaults to 50).
func (h *AdminHandlers) ListNotifications(c *gin.Context) {
	if h.Notifications == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "notifications not configured"})
		return
	}

	adminID, ok := c.Get("admin_id")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	unreadOnly := c.Query("unread") == "true"
	limit := 50
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	notifs, total, unreadCount, err := h.Notifications.ListForAdmin(c.Request.Context(), adminID.(string), unreadOnly, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list notifications"})
		return
	}

	response := make([]models.NotificationResponse, len(notifs))
	for i, n := range notifs {
		resp := models.NotificationResponse{
			ID:        n.ID,
			Type:      n.Type,
			Title:     n.Title,
			Severity:  string(n.Severity),
			IsRead:    n.IsRead,
			CreatedAt: n.CreatedAt,
		}
		if n.Message.Valid {
			resp.Message = n.Message.String
		}
		if n.EntityType.Valid {
			resp.EntityType = n.EntityType.String
		}
		if n.EntityID.Valid {
			resp.EntityID = n.EntityID.String
		}
		if n.ReadAt.Valid {
			resp.ReadAt = &n.ReadAt.String
		}
		response[i] = resp
	}

	c.JSON(http.StatusOK, gin.H{
		"notifications": response,
		"total":         total,
		"unread_count":  unreadCount,
	})
}

// MarkNotificationRead marks a single notification as read.
func (h *AdminHandlers) MarkNotificationRead(c *gin.Context) {
	if h.Notifications == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "notifications not configured"})
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid notification id"})
		return
	}

	if err := h.Notifications.MarkRead(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark notification read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "marked read"})
}

// MarkAllNotificationsRead marks every unread notification visible to the
// current admin (their own + broadcasts) as read.
func (h *AdminHandlers) MarkAllNotificationsRead(c *gin.Context) {
	if h.Notifications == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "notifications not configured"})
		return
	}

	adminID, ok := c.Get("admin_id") // adjust key to match your auth middleware
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
		return
	}

	if err := h.Notifications.MarkAllRead(c.Request.Context(), adminID.(string)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to mark all notifications read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "all marked read"})
}
