package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
    "vigilant/websocket"
	"github.com/gin-gonic/gin"
	"vigilant/config"
	"vigilant/db"
	"vigilant/handlers"
	"vigilant/middleware"
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
        admin.POST("/candidates/:id/push", adminH.PushToCandidate)
		admin.GET("/events", adminH.SSEEvents)
        admin.POST("/access" , adminH.VerifyToken)
        admin.POST("/csv-upload" , adminH.ParseUserList)
        admin.POST("/candidates", adminH.CreateCandidate)
		admin.GET("/candidates", adminH.ListCandidates)
		admin.POST("/bulk-candidates", adminH.BulkCreateCandidates)
        admin.GET("/active-users", adminH.GetActiveUsers)

		admin.GET("/candidates/:id", adminH.GetCandidate)
		admin.PUT("/candidates/:id", adminH.UpdateCandidate)
		admin.DELETE("/candidates/:id", adminH.DeleteCandidate)
		admin.GET("/dashboard", adminH.GetDashboardStats)
	}

	api := r.Group("/api/v1")
	api.Use(middleware.AuthMiddleware(cfg))
	{


		api.POST("/process", h.CreateProcessReport)
		api.GET("/interview-session/:candidate_id" , h.GetActiveInterview)
		api.POST("/create-interview" , h.CreateInterviewSession)

		api.GET("/process/:session_id", h.GetProcessReports)
		api.GET("/sessions", h.ListSessions)
		api.POST("/sessions/:session_id/end", h.EndSession)
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
