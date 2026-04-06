package routes

import (
	"database/sql"
	"vigilant/config"
	"vigilant/handlers/admin"
	"vigilant/handlers/auth"
	"vigilant/handlers/candidate"
	"vigilant/handlers/judge"
	"vigilant/middleware"

	"github.com/gin-gonic/gin"
)

func Register(r *gin.Engine, db *sql.DB, cfg *config.Config) {
	authH := &auth.AuthHandlers{DB: db, Cfg: cfg}
	adminH := &admin.AdminHandlers{DB: db, Cfg: cfg}
	candidateH := &candidate.Handlers{DB: db, Cfg: cfg}
	judgeH := &judge.Handlers{DB: db, Cfg: cfg}

	r.Use(middleware.CORSMiddleware(cfg))
	r.GET("/health", candidateH.HealthCheck)

	authGroup := r.Group("/api/v1/auth")
	{
		authGroup.POST("/login", authH.Login)
		authProtected := r.Group("/api/v1/auth")

		authProtected.Use(middleware.AuthMiddleware(cfg))
		authProtected.POST("/logout", authH.Logout)
		authProtected.GET("/me", authH.GetMe)

	}

	adminGroup := r.Group("/api/v1/admin")
	adminGroup.Use(middleware.AdminAuthMiddleware(cfg, db))
	registerAdminRoutes(adminGroup, adminH, judgeH)

	apiGroup := r.Group("/api/v1")
	apiGroup.Use(middleware.AuthMiddleware(cfg))
	registerCandidateRoutes(apiGroup, candidateH, judgeH)

	r.GET("/api/v1/events", candidateH.SSEEvents)
}
func registerAdminRoutes(g *gin.RouterGroup, h *admin.AdminHandlers, judgeH *judge.Handlers) {
	// Email
	g.POST("/email-config", h.SaveEmailConfig)
	g.GET("/email-config", h.GetEmailConfig)
	g.POST("/emails/send", h.SendCustomEmail)

	// Candidates
	g.POST("/candidates", h.CreateCandidate)
	g.GET("/candidates", h.ListCandidates)
	g.GET("/candidates/:id", h.GetCandidate)
	g.PUT("/candidates/:id", h.UpdateCandidate)
	g.DELETE("/candidates/:id", h.DeleteCandidate)
	g.POST("/bulk-candidates", h.BulkCreateCandidates)
	g.POST("/csv-upload", h.ParseUserList)
	g.POST("/candidates/:id/push", h.PushToCandidate)
	g.GET("/candidates/:id/applications", h.GetCandidateApplications)
	g.POST("/candidates/send-credentials", h.SendCandidateCredentialsEmail)

	// Positions
	g.POST("/positions", h.CreatePosition)
	g.GET("/positions", h.ListPositions)
	g.GET("/positions/:id", h.GetPositionByID)
	g.PUT("/positions/:id", h.UpdatePosition)
	g.PATCH("/positions/:id/toggle-active", h.UpdatePositionActiveStatus)
	g.DELETE("/positions/:id", h.DeletePosition)

	// Misc
	g.GET("/dashboard", h.GetDashboardStats)
	g.GET("/active-users", h.GetActiveUsers)
	g.POST("/access", h.VerifyToken)
	g.GET("/events", h.SSEEvents)
	g.POST("/google-creds", h.CreateGoogleCredential)
	g.POST("/credentials/google", h.CreateGoogleCredential)
	g.POST("/interviews/send-invite", h.SendInterviewInvite)
	g.POST("/create-interview", h.CreateInterviewSession)

	// Judge
	g.GET("/judge/languages", judgeH.ListLanguages)

	// Applications
	g.GET("/applications", h.ListJobApplications)
	g.GET("/applications/:id", h.GetJobApplication)
	g.PUT("/applications/:id/toggle", h.UpdateJobApplicationStatus)

}
func registerCandidateRoutes(g *gin.RouterGroup, h *candidate.Handlers, judgeH *judge.Handlers) {
	g.POST("/process", h.CreateProcessReport)
	g.POST("/onboarding", h.CompleteOnboarding)
	g.GET("/interview-session/:candidate_id", h.GetActiveInterview)
	g.GET("/process/:session_id", h.GetProcessReports)
	g.GET("/sessions", h.ListSessions)
	g.GET("/get-open-positions", h.GetPositionDetails)
	g.POST("/sessions/:session_id/end", h.EndSession)
	g.GET("/positions", h.ListPositions)
	g.POST("/positions/:position_id/apply", h.ApplyForPosition)

	judgeGroup := g.Group("/judge")
	{
		judgeGroup.GET("/languages", judgeH.ListLanguages)
		judgeGroup.POST("/execute", judgeH.ExecuteCode)
		judgeGroup.GET("/submissions", judgeH.ListSubmissions)
		judgeGroup.GET("/submissions/:id", judgeH.GetSubmission)
	}
}
