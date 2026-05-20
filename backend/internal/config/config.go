package config

import (
	"errors"
	"os"
	"strings"
)

type Config struct {
	ListenAddr          string
	DatabasePath        string
	AllowedOrigins      []string
	AccessEnabled       bool
	AccessAudience      string
	AccessIssuer        string
	AccessCertsURL      string
	StreamPublicBaseURL string
	StreamSigningSecret string
}

func Load() (Config, error) {
	cfg := Config{
		ListenAddr:          env("LISTEN_ADDR", ":8080"),
		DatabasePath:        env("DATABASE_PATH", "boke-video.sqlite3"),
		AllowedOrigins:      origins(env("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")),
		AccessEnabled:       env("ACCESS_ENABLED", "false") == "true",
		AccessAudience:      os.Getenv("ACCESS_AUDIENCE"),
		AccessIssuer:        os.Getenv("ACCESS_ISSUER"),
		AccessCertsURL:      os.Getenv("ACCESS_CERTS_URL"),
		StreamPublicBaseURL: strings.TrimSpace(os.Getenv("STREAM_PUBLIC_BASE_URL")),
		StreamSigningSecret: os.Getenv("STREAM_SIGNING_SECRET"),
	}

	if cfg.AccessEnabled {
		if cfg.AccessAudience == "" {
			return Config{}, errors.New("ACCESS_AUDIENCE is required")
		}
		if cfg.AccessIssuer == "" {
			return Config{}, errors.New("ACCESS_ISSUER is required")
		}
		if cfg.AccessCertsURL == "" {
			return Config{}, errors.New("ACCESS_CERTS_URL is required")
		}
	}
	if cfg.StreamPublicBaseURL == "" {
		return Config{}, errors.New("STREAM_PUBLIC_BASE_URL is required")
	}
	if strings.TrimSpace(cfg.StreamSigningSecret) == "" {
		return Config{}, errors.New("STREAM_SIGNING_SECRET is required")
	}

	return cfg, nil
}

func origins(rawValue string) []string {
	values := strings.Split(rawValue, ",")
	origins := make([]string, 0, len(values))
	for _, value := range values {
		origin := strings.TrimSpace(value)
		if origin != "" {
			origins = append(origins, origin)
		}
	}
	return origins
}

func env(key string, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
