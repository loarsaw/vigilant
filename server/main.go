package main

import (
	"context"
	"log"
	"time"
	"vigilant/config"
	"vigilant/db"
	"vigilant/email"
	"vigilant/middleware"
	"vigilant/routes"
	"vigilant/server"
	"vigilant/websocket"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

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

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// Apply global rate limiting for all remainder routes
	r.Use(middleware.RateLimitMiddleware(middleware.PublicLimiter))

	routes.Register(r, database, cfg)

	wsGroup := r.Group("/api/v1/ws")
	wsGroup.Use(middleware.RateLimitMiddleware(middleware.APILimiter))
	{
		websocket.Manager.Cfg = cfg
		wsGroup.GET("/presence", websocket.Manager.HandleConnection)
	}

	log.Printf("Server starting on %s:%s with tiered rate limiting enabled", cfg.ServerHost, cfg.ServerPort)
	server.Run(r, cfg.ServerHost+":"+cfg.ServerPort)
}
