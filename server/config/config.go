package config

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

type Config struct {
	ServerPort           string
	ServerHost           string
	PostgresHost         string
	PostgresPort         string
	PostgresDB           string
	PostgresUser         string
	PostgresPassword     string
	AuthToken            string

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
}

func Load() (*Config, error) {
	configPath := os.Getenv("VIGILANT_CONFIG_PATH")
	if configPath == "" {
		configPath = "/etc/vigilant/vigilant.conf"
	}

	file, err := os.Open(configPath)
	if err != nil {
		file, err = os.Open("../vigilant.conf")
		if err != nil {
			return nil, fmt.Errorf("failed to open config file: %w", err)
		}
	}
	defer file.Close()

	config := &Config{
		// Defaults
		ServerPort:           "3333",
		ServerHost:           "0.0.0.0",
		PostgresHost:         "localhost",
		PostgresPort:         "5432",
		DataRetentionHours:   "72",
		RateLimitPerMinute:   "120",
		ClientUpdateInterval: "5",
		HighMemoryThreshold:  "500",
		EnableWebsockets:     "true",
		AllowOrigin:          "*",
		AdminSessionTimeout:  "24",
		BcryptCost:           "10",
	}

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		switch key {
		case "SERVER_PORT":
			config.ServerPort = value
		case "SERVER_HOST":
			config.ServerHost = value
		case "POSTGRES_HOST":
			config.PostgresHost = value
		case "POSTGRES_PORT":
			config.PostgresPort = value
		case "POSTGRES_DB":
			config.PostgresDB = value
		case "POSTGRES_USER":
			config.PostgresUser = value
		case "POSTGRES_PASSWORD":
			config.PostgresPassword = value
		case "AUTHN_TOKEN":
			config.AuthToken = value
		case "ADMIN_AUTH_TOKEN":
			config.AdminAuthToken = value
		case "ADMIN_EMAIL": // NEW
			config.AdminEmail = value
		case "ADMIN_PASSWORD": // NEW
			config.AdminPassword = value
		case "ADMIN_IP_ADDRESS":
			config.AdminIPAddress = value
		case "ADMIN_SESSION_TIMEOUT":
			config.AdminSessionTimeout = value
		case "JWT_SECRET":
			config.JWTSecret = value
		case "BCRYPT_COST":
			config.BcryptCost = value
		case "DATA_RETENTION_HOURS":
			config.DataRetentionHours = value
		case "RATE_LIMIT_PER_MINUTE":
			config.RateLimitPerMinute = value
		case "CLIENT_UPDATE_INTERVAL":
			config.ClientUpdateInterval = value
		case "HIGH_MEMORY_THRESHOLD":
			config.HighMemoryThreshold = value
		case "ENABLE_WEBSOCKETS":
			config.EnableWebsockets = value
		case "ALLOW_ORIGIN":
			config.AllowOrigin = value
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading config file: %w", err)
	}

	return config, nil
}

func (c *Config) GetDSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		c.PostgresHost,
		c.PostgresPort,
		c.PostgresUser,
		c.PostgresPassword,
		c.PostgresDB,
	)
}

// GetAdminIPs returns a slice of allowed admin IP addresses
func (c *Config) GetAdminIPs() []string {
	if c.AdminIPAddress == "" {
		return []string{}
	}

	ips := strings.Split(c.AdminIPAddress, ",")
	result := make([]string, 0, len(ips))

	for _, ip := range ips {
		trimmed := strings.TrimSpace(ip)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}

	return result
}