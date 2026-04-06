package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"
	"vigilant/config"
	"vigilant/db"
	"vigilant/email"
	"vigilant/handlers"
	"vigilant/middleware"

	"vigilant/websocket"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}
	log.Printf("Configuration loaded (Port: %s)", cfg.ServerPort)

	database, err := db.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	if err := db.RunMigrations(database); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	emailWorker := email.NewWorker(database, cfg.EncryptionKey, 5*time.Second)
	go emailWorker.Start(context.Background())
	defer emailWorker.Stop()

	h := &handlers.Handlers{DB: database, Cfg: cfg}
	adminH := &handlers.AdminHandlers{DB: database, Cfg: cfg}
	authH := &handlers.AuthHandlers{DB: database, Cfg: cfg}

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	r.Use(middleware.CORSMiddleware(cfg))

	r.GET("/health", h.HealthCheck)

	auth := r.Group("/api/v1/auth")
	{
		auth.POST("/login", authH.Login)
		auth.POST("/logout", authH.Logout)
		auth.GET("/me", authH.GetMe)
	}

	admin := r.Group("/api/v1/admin")
	admin.Use(middleware.AdminAuthMiddleware(cfg))
	{
		admin.POST("/email-config", adminH.SaveEmailConfig)
		admin.GET("/email-config", adminH.GetEmailConfig)
		admin.POST("/candidates/:id/push", adminH.PushToCandidate)
		admin.GET("/events", adminH.SSEEvents)
		admin.POST("/access", adminH.VerifyToken)
		admin.POST("/csv-upload", adminH.ParseUserList)
		admin.POST("/candidates", adminH.CreateCandidate)
		admin.GET("/candidates", adminH.ListCandidates)
		admin.POST("/bulk-candidates", adminH.BulkCreateCandidates)
		admin.GET("/active-users", adminH.GetActiveUsers)
		admin.GET("/candidates/:id", adminH.GetCandidate)
		admin.PUT("/candidates/:id", adminH.UpdateCandidate)
		admin.DELETE("/candidates/:id", adminH.DeleteCandidate)
		admin.GET("/dashboard", adminH.GetDashboardStats)
		admin.POST("/google-creds", adminH.CreateGoogleCredential)
		admin.POST("/interviews/send-invite", adminH.SendInterviewInvite)
		admin.POST("/candidates/send-credentials", adminH.SendCandidateCredentialsEmail)
		admin.POST("/emails/send", adminH.SendCustomEmail)

		// Positions
		admin.POST("/positions", adminH.CreatePosition)
		admin.GET("/positions", adminH.ListPositions)
		admin.GET("/positions/:id", adminH.GetPositionByID)
		admin.PUT("/positions/:id", adminH.UpdatePosition)
		admin.PATCH("/positions/:id/toggle-active", adminH.UpdatePositionActiveStatus)
		admin.DELETE("/positions/:id", adminH.DeletePosition)
		admin.POST("/create-interview", adminH.CreateInterviewSession)
		admin.GET("/candidates/:id/applications", adminH.GetCandidateApplications)

		// Google Credentials
		admin.POST("/credentials/google", adminH.CreateGoogleCredential)
	}

	judgeApi := admin.Group("/judge")
	{
		judgeApi.GET("/languages", adminH.ListLanguages)
	}

	api := r.Group("/api/v1")
	api.Use(middleware.AuthMiddleware(cfg))
	{
		api.POST("/process", h.CreateProcessReport)
		api.POST("/onboarding", h.CompleteOnboarding)
		api.GET("/interview-session/:candidate_id", h.GetActiveInterview)
		api.GET("/process/:session_id", h.GetProcessReports)
		api.GET("/sessions", h.ListSessions)
		api.GET("/get-open-positions", h.GetPositionDetails)
		api.POST("/sessions/:session_id/end", h.EndSession)
		api.GET("/positions", h.ListPositions)
		api.POST("/positions/:position_id/apply", h.ApplyForPosition)
	}

	judge := api.Group("/judge")
	{
		judge.GET("/languages", h.ListLanguages)
		judge.POST("/execute", h.ExecuteCode)
		judge.GET("/submissions", h.ListSubmissions)
		judge.GET("/submissions/:id", h.GetSubmission)
	}

	r.GET("/api/v1/events", h.SSEEvents)
	websocket.Manager.Cfg = cfg
	r.GET("/api/v1/ws/presence", websocket.Manager.HandleConnection)

	addr := cfg.ServerHost + ":" + cfg.ServerPort
	log.Printf("Server listening on %s", addr)
	go func() {
		if err := r.Run(addr); err != nil {
			log.Fatalf("Server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
}
