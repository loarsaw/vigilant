package main

import (
	"context"
	"log"
	"time"
	"vigilant/config"
	"vigilant/db"
	"vigilant/email"
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

	routes.Register(r, database, cfg)

	websocket.Manager.Cfg = cfg
	r.GET("/api/v1/ws/presence", websocket.Manager.HandleConnection)

	server.Run(r, cfg.ServerHost+":"+cfg.ServerPort)
}
