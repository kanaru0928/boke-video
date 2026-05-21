package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	ListenAddr            string
	DatabasePath          string
	AllowedOrigins        []string
	AccessEnabled         bool
	AccessAudience        string
	AccessIssuer          string
	AccessCertsURL        string
	StreamPublicBaseURL   string
	StreamSigningBaseURL  string
	StreamSigningSecret   string
	WhipUpstreamBaseURL   string
	OMEAPIBaseURL         string
	OMEAPIAccessToken     string
	OMEVhostName          string
	OMEAppName            string
	OMEThumbnailBaseURL   string
	OMEThumbnailCodec     string
	StreamEndGraceSeconds int
}

func Load() (Config, error) {
	streamEndGraceSeconds, err := envInt("STREAM_END_GRACE_SECONDS", 90)
	if err != nil {
		return Config{}, err
	}
	cfg := Config{
		ListenAddr:            env("LISTEN_ADDR", ":8080"),
		DatabasePath:          env("DATABASE_PATH", "boke-video.sqlite3"),
		AllowedOrigins:        origins(env("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")),
		AccessEnabled:         env("ACCESS_ENABLED", "false") == "true",
		AccessAudience:        os.Getenv("ACCESS_AUDIENCE"),
		AccessIssuer:          os.Getenv("ACCESS_ISSUER"),
		AccessCertsURL:        os.Getenv("ACCESS_CERTS_URL"),
		StreamPublicBaseURL:   strings.TrimSpace(os.Getenv("STREAM_PUBLIC_BASE_URL")),
		StreamSigningBaseURL:  strings.TrimSpace(os.Getenv("STREAM_SIGNING_BASE_URL")),
		StreamSigningSecret:   os.Getenv("STREAM_SIGNING_SECRET"),
		WhipUpstreamBaseURL:   strings.TrimSpace(os.Getenv("WHIP_UPSTREAM_BASE_URL")),
		OMEAPIBaseURL:         strings.TrimSpace(os.Getenv("OME_API_BASE_URL")),
		OMEAPIAccessToken:     os.Getenv("OME_API_ACCESS_TOKEN"),
		OMEVhostName:          env("OME_VHOST_NAME", "default"),
		OMEAppName:            env("OME_APP_NAME", "live"),
		OMEThumbnailBaseURL:   strings.TrimSpace(os.Getenv("OME_THUMBNAIL_BASE_URL")),
		OMEThumbnailCodec:     env("OME_THUMBNAIL_CODEC", "jpg"),
		StreamEndGraceSeconds: streamEndGraceSeconds,
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
	if cfg.StreamSigningBaseURL == "" {
		return Config{}, errors.New("STREAM_SIGNING_BASE_URL is required")
	}
	if strings.TrimSpace(cfg.StreamSigningSecret) == "" {
		return Config{}, errors.New("STREAM_SIGNING_SECRET is required")
	}
	if cfg.WhipUpstreamBaseURL == "" {
		return Config{}, errors.New("WHIP_UPSTREAM_BASE_URL is required")
	}
	if cfg.OMEAPIBaseURL == "" {
		return Config{}, errors.New("OME_API_BASE_URL is required")
	}
	if strings.TrimSpace(cfg.OMEAPIAccessToken) == "" {
		return Config{}, errors.New("OME_API_ACCESS_TOKEN is required")
	}
	if cfg.OMEThumbnailBaseURL == "" {
		return Config{}, errors.New("OME_THUMBNAIL_BASE_URL is required")
	}
	if cfg.StreamEndGraceSeconds < 1 {
		return Config{}, errors.New("STREAM_END_GRACE_SECONDS must be greater than 0")
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

func envInt(key string, defaultValue int) (int, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return defaultValue, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, errors.New(key + " must be an integer")
	}
	return parsed, nil
}
