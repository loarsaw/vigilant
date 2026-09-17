// server/utils/admin.go
package admin

import (
	"fmt"

	"github.com/gin-gonic/gin"
)

func adminActor(c *gin.Context) string {
	adminID, _ := c.Get("admin_id")
	adminIDStr, _ := adminID.(string)
	if adminIDStr == "" {
		return "system:github_config"
	}
	return fmt.Sprintf("admin:%s", adminIDStr)
}
