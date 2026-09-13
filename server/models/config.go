// server/models/config.go
package models

type Config struct {
	ServerPort       string
	ServerHost       string
	PostgresHost     string
	PostgresPort     string
	PostgresDB       string
	PostgresUser     string
	PostgresPassword string
	AuthToken        string

	// Admin settings
	AdminAuthToken      string
	AdminEmail          string
	AdminPassword       string
	AdminIPAddress      string
	AdminSessionTimeout string

	// Security
	JWTSecret  string
	BcryptCost string

	// Domain Name
	DomainName string

	DataRetentionHours   string
	RateLimitPerMinute   string
	ClientUpdateInterval string
	HighMemoryThreshold  string
	EnableWebsockets     string
	AllowOrigin          string

	// Encryption
	EncryptionKey string
}
