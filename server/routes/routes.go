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

	// Apply CORS middleware globally
	r.Use(middleware.CORSMiddleware(cfg))

	// Health check endpoint with lenient rate limit
	healthGroup := r.Group("/")
	healthGroup.Use(middleware.RateLimitMiddleware(middleware.HealthLimiter))
	{
		healthGroup.GET("/health", candidateH.HealthCheck)
	}

	// Auth endpoints
	authGroup := r.Group("/api/v1/auth")
	authGroup.Use(middleware.RateLimitMiddleware(middleware.AuthLimiter))
	{
		authGroup.POST("/login", authH.Login)
	}

	// Protected auth endpoints
	authProtected := r.Group("/api/v1/auth")
	authProtected.Use(middleware.AuthMiddleware(cfg))
	authProtected.Use(middleware.RateLimitMiddleware(middleware.APILimiter))
	{
		authProtected.POST("/logout", authH.Logout)
		authProtected.GET("/me", authH.GetMe)
	}

	// Admin login
	adminLoginGroup := r.Group("/api/v1/admin")
	adminLoginGroup.Use(middleware.RateLimitMiddleware(middleware.AuthLimiter))
	{
		adminLoginGroup.POST("/login", adminH.AdminLogin)
	}

	// Admin routes
	adminGroup := r.Group("/api/v1/admin")
	adminGroup.Use(middleware.AdminAuthMiddleware(cfg, db))
	adminGroup.Use(middleware.RateLimitMiddleware(middleware.AdminLimiter))
	registerAdminRoutes(adminGroup, adminH, judgeH)

	// Candidate API routes
	apiGroup := r.Group("/api/v1")
	apiGroup.Use(middleware.AuthMiddleware(cfg))
	apiGroup.Use(middleware.RateLimitMiddleware(middleware.APILimiter))
	registerCandidateRoutes(apiGroup, candidateH, judgeH)

	// SSE events
	sseGroup := r.Group("/api/v1")
	sseGroup.Use(middleware.RateLimitMiddleware(middleware.SSELimiter))
	{
		sseGroup.GET("/events", candidateH.SSEEvents)
	}
}

func registerAdminRoutes(g *gin.RouterGroup, h *admin.AdminHandlers, judgeH *judge.Handlers) {
	// Admin auth
	g.GET("/me", h.GetAdminMe)

	// Email endpoints
	emailGroup := g.Group("/")
	{
		emailGroup.POST("/email-config", h.SaveEmailConfig)
		emailGroup.GET("/email-config", h.GetEmailConfig)
		emailGroup.POST("/emails/send", h.SendCustomEmail)
	}

	// Candidate management
	candidateGroup := g.Group("/candidates")
	{
		candidateGroup.POST("", h.CreateCandidate)
		candidateGroup.GET("", h.ListCandidates)
		candidateGroup.GET("/:id", h.GetCandidate)
		candidateGroup.PUT("/:id", h.UpdateCandidate)
		candidateGroup.DELETE("/:id", h.DeleteCandidate)
		candidateGroup.POST("/:id/push", h.PushToCandidate)
		candidateGroup.GET("/:id/applications", h.GetCandidateApplications)
		candidateGroup.POST("/send-credentials", h.SendCandidateCredentialsEmail)
		candidateGroup.PATCH("/:id/password", h.UpdateCandidatePassword)
	}

	// CSV upload
	uploadGroup := g.Group("/")
	uploadGroup.Use(middleware.RateLimitMiddleware(middleware.UploadLimiter))
	{
		uploadGroup.POST("/csv-upload", h.ParseUserList)
	}

	// Position management
	positionGroup := g.Group("/positions")
	{
		positionGroup.POST("", h.CreatePosition)
		positionGroup.GET("", h.ListPositions)
		positionGroup.GET("/:id", h.GetPositionByID)
		positionGroup.PATCH("/:id", h.UpdatePosition)
		positionGroup.PATCH("/:id/toggle-active", h.UpdatePositionActiveStatus)
		positionGroup.DELETE("/:id", h.DeletePosition)
	}

	// Misc endpoints
	g.GET("/dashboard", h.GetDashboardStats)
	g.GET("/active-users", h.GetActiveUsers)
	g.POST("/access", h.VerifyToken)

	// SSE for admin with SSE-specific limit
	sseGroup := g.Group("/")
	sseGroup.Use(middleware.RateLimitMiddleware(middleware.SSELimiter))
	{
		sseGroup.GET("/events", h.SSEEvents)
	}

	// Google credentials
	g.POST("/google-creds", h.CreateGoogleCredential)
	g.POST("/credentials/google", h.CreateGoogleCredential)

	// Interview management
	interviewGroup := g.Group("/")
	{
		interviewGroup.POST("/interviews/send-invite", h.SendInterviewInvite)
		interviewGroup.GET("/interviews", h.ListInterviewSessionsIndividualCandiate)
		interviewGroup.POST("/create-interview", h.CreateInterviewSession)
		interviewGroup.GET("/interviewers", h.ListInterviewers)
	}

	// Judge endpoints
	g.GET("/judge/languages", judgeH.ListLanguages)

	// Application management
	applicationGroup := g.Group("/applications")
	{
		applicationGroup.GET("", h.ListJobApplications)
		applicationGroup.GET("/:id", h.GetJobApplication)
		applicationGroup.PATCH("/:id/status", h.UpdateJobApplicationStatus)
	}

	// Admin management
	adminMgmtGroup := g.Group("/admins")
	{
		adminMgmtGroup.POST("", h.CreateAdmin)
		adminMgmtGroup.GET("", h.ListAdmins)
		adminMgmtGroup.GET("/:id", h.GetAdmin)
		adminMgmtGroup.PATCH("/:id", h.UpdateAdmin)
		adminMgmtGroup.DELETE("/:id", h.DeleteAdmin)
		adminMgmtGroup.PATCH("/:id/toggle-active", h.ToggleAdminActive)
		adminMgmtGroup.POST("/:id/reset-password", h.ResetAdminPassword)
	}
}

func registerCandidateRoutes(g *gin.RouterGroup, h *candidate.Handlers, judgeH *judge.Handlers) {
	// Session management
	g.POST("/process", h.CreateProcessReport)
	g.POST("/onboarding", h.CompleteOnboarding)
	g.GET("/interview-session/:candidate_id", h.GetActiveInterview)
	g.GET("/process/:session_id", h.GetProcessReports)
	g.GET("/sessions", h.ListSessions)
	g.POST("/sessions/:session_id/end", h.EndSession)

	// Position management
	g.GET("/get-open-positions", h.GetPositionDetails)
	g.GET("/positions", h.ListPositions)
	g.POST("/positions/:position_id/apply", h.ApplyForPosition)

	// Judge endpoints with judge-specific rate limit
	judgeGroup := g.Group("/judge")
	judgeGroup.Use(middleware.RateLimitMiddleware(middleware.JudgeLimiter))
	{
		judgeGroup.GET("/languages", judgeH.ListLanguages)
		judgeGroup.POST("/execute", judgeH.ExecuteCode)
		judgeGroup.GET("/submissions", judgeH.ListSubmissions)
		judgeGroup.GET("/submissions/:id", judgeH.GetSubmission)
	}
}
