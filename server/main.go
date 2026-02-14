package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

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

	h := &handlers.Handlers{DB: database}
	adminH := &handlers.AdminHandlers{DB: database}
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
		admin.POST("/candidates", adminH.CreateCandidate)
		admin.GET("/candidates", adminH.ListCandidates)
		admin.GET("/candidates/:id", adminH.GetCandidate)
		admin.PUT("/candidates/:id", adminH.UpdateCandidate)
		admin.DELETE("/candidates/:id", adminH.DeleteCandidate)
		admin.GET("/dashboard", adminH.GetDashboardStats)
	}

	api := r.Group("/api/v1")
	api.Use(middleware.AuthMiddleware(cfg))
	{
		api.POST("/process", h.CreateProcessReport)
		api.GET("/process/:session_id", h.GetProcessReports)
		api.GET("/sessions", h.ListSessions)
		api.POST("/sessions/:session_id/end", h.EndSession)
	}

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
