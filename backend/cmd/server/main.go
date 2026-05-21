package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"boke-video/backend/internal/access"
	"boke-video/backend/internal/comment"
	"boke-video/backend/internal/config"
	"boke-video/backend/internal/httpapi"
	"boke-video/backend/internal/repository"
	"boke-video/backend/internal/streamaccess"
	"boke-video/backend/internal/streammonitor"
	"boke-video/backend/internal/whipproxy"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("load config", "error", err)
		os.Exit(1)
	}

	db, err := repository.OpenSQLite(cfg.DatabasePath)
	if err != nil {
		logger.Error("open database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	if err := db.Migrate(context.Background()); err != nil {
		logger.Error("migrate database", "error", err)
		os.Exit(1)
	}

	verifier := access.NewVerifier(access.VerifierConfig{
		Enabled:  cfg.AccessEnabled,
		Audience: cfg.AccessAudience,
		Issuer:   cfg.AccessIssuer,
		CertsURL: cfg.AccessCertsURL,
	})

	commentHub := comment.NewHub()
	go commentHub.Run(context.Background())

	streamAccess, err := streamaccess.NewSigner(streamaccess.Config{
		BaseURL: cfg.StreamPublicBaseURL,
		Secret:  cfg.StreamSigningSecret,
		TTL:     time.Minute,
	})
	if err != nil {
		logger.Error("configure stream access", "error", err)
		os.Exit(1)
	}

	whipProxy, err := whipproxy.New(cfg.WhipUpstreamBaseURL)
	if err != nil {
		logger.Error("configure whip proxy", "error", err)
		os.Exit(1)
	}

	streamMonitor, err := streammonitor.NewOvenMediaEngineClient(streammonitor.OvenMediaEngineConfig{
		APIBaseURL:       cfg.OMEAPIBaseURL,
		ThumbnailBaseURL: cfg.OMEThumbnailBaseURL,
		AccessToken:      cfg.OMEAPIAccessToken,
		VhostName:        cfg.OMEVhostName,
		AppName:          cfg.OMEAppName,
		ThumbnailCodec:   cfg.OMEThumbnailCodec,
	})
	if err != nil {
		logger.Error("configure stream monitor", "error", err)
		os.Exit(1)
	}

	handler := httpapi.NewServer(httpapi.ServerConfig{
		Logger:         logger,
		Repository:     db,
		Verifier:       verifier,
		CommentHub:     commentHub,
		AllowedOrigins: cfg.AllowedOrigins,
		StreamAccess:   streamAccess,
		StreamMonitor:  streamMonitor,
		StreamEndGrace: time.Duration(cfg.StreamEndGraceSeconds) * time.Second,
		WhipProxy:      whipProxy,
	})

	server := &http.Server{
		Addr:              cfg.ListenAddr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Info("server listening", "addr", cfg.ListenAddr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server stopped", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("shutdown server", "error", err)
		os.Exit(1)
	}
}
