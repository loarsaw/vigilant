package livekit

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"vigilant/models"

	"github.com/livekit/protocol/auth"
	"github.com/livekit/protocol/livekit"
	lksdk "github.com/livekit/server-sdk-go/v2"
)

type Service struct {
	db *sql.DB
}

func boolPtr(b bool) *bool {
	return &b
}

// NewService initializes a service with a database connection handle
func NewService(db *sql.DB) *Service {
	return &Service{
		db: db,
	}
}

// GetActiveConfig fetches the active LiveKit credentials from the livekit_configs table
func (s *Service) GetActiveConfig() (*models.LiveKitConfig, error) {
	var cfg models.LiveKitConfig
	query := `
		SELECT id, host, api_key, api_secret, is_active
		FROM livekit_configs
		WHERE is_active = true
		ORDER BY id DESC LIMIT 1
	`
	err := s.db.QueryRow(query).Scan(&cfg.ID, &cfg.Host, &cfg.APIKey, &cfg.APISecret, &cfg.IsActive)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("livekit configuration not found in database")
		}
		return nil, fmt.Errorf("failed to fetch livekit config: %w", err)
	}
	return &cfg, nil
}

// GenerateToken creates a JWT for joining a room using DB credentials.
// validFor should cover the scheduled interview window with a buffer —
// callers should NOT rely on the old hardcoded 24h.
func (s *Service) GenerateToken(roomName, participantIdentity string, isGrantAdmin bool, validFor time.Duration) (string, string, error) {
	cfg, err := s.GetActiveConfig()
	if err != nil {
		return "", "", err
	}

	at := auth.NewAccessToken(cfg.APIKey, cfg.APISecret)
	grant := &auth.VideoGrant{
		RoomJoin:     true,
		Room:         roomName,
		RoomAdmin:    isGrantAdmin,
		CanPublish:   boolPtr(true),
		CanSubscribe: boolPtr(true),
	}

	at.SetVideoGrant(grant).
		SetIdentity(participantIdentity).
		SetValidFor(validFor)

	token, err := at.ToJWT()
	if err != nil {
		return "", "", err
	}

	return token, cfg.Host, nil
}

// CreateRoom initializes a room on the LiveKit server using DB credentials
func (s *Service) CreateRoom(ctx context.Context, roomName string) (*livekit.Room, error) {
	cfg, err := s.GetActiveConfig()
	if err != nil {
		return nil, err
	}

	roomClient := lksdk.NewRoomServiceClient(cfg.Host, cfg.APIKey, cfg.APISecret)

	return roomClient.CreateRoom(ctx, &livekit.CreateRoomRequest{
		Name:            roomName,
		EmptyTimeout:    10 * 60, // 10 minutes
		MaxParticipants: 10,
	})
}

func (s *Service) DeleteRoom(ctx context.Context, roomName string) error {
	cfg, err := s.GetActiveConfig()
	if err != nil {
		return err
	}
	roomClient := lksdk.NewRoomServiceClient(cfg.Host, cfg.APIKey, cfg.APISecret)
	_, err = roomClient.DeleteRoom(ctx, &livekit.DeleteRoomRequest{Room: roomName})
	return err
}
