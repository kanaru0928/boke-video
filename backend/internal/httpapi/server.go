package httpapi

import (
	"log/slog"
	"net/http"
	"strings"
	"time"

	"boke-video/backend/internal/access"
	"boke-video/backend/internal/comment"
	"boke-video/backend/internal/repository"
	"boke-video/backend/internal/streamaccess"
	"boke-video/backend/internal/whipproxy"
)

const defaultStreamEndGrace = 90 * time.Second

type ServerConfig struct {
	Logger         *slog.Logger
	Repository     *repository.SQLite
	Verifier       *access.Verifier
	CommentHub     *comment.Hub
	AllowedOrigins []string
	StreamAccess   *streamaccess.Signer
	StreamMonitor  streamMonitor
	StreamEndGrace time.Duration
	WhipProxy      *whipproxy.Proxy
	Now            func() time.Time
}

type Server struct {
	logger         *slog.Logger
	repository     *repository.SQLite
	verifier       *access.Verifier
	commentHub     *comment.Hub
	allowedOrigins []string
	streamAccess   *streamaccess.Signer
	streamMonitor  streamMonitor
	streamEndGrace time.Duration
	whipProxy      *whipproxy.Proxy
	limiter        *rateLimiter
	now            func() time.Time
}

func NewServer(cfg ServerConfig) *Server {
	now := cfg.Now
	if now == nil {
		now = time.Now
	}
	streamEndGrace := cfg.StreamEndGrace
	if streamEndGrace == 0 {
		streamEndGrace = defaultStreamEndGrace
	}
	return &Server{
		logger:         cfg.Logger,
		repository:     cfg.Repository,
		verifier:       cfg.Verifier,
		commentHub:     cfg.CommentHub,
		allowedOrigins: cfg.AllowedOrigins,
		streamAccess:   cfg.StreamAccess,
		streamMonitor:  cfg.StreamMonitor,
		streamEndGrace: streamEndGrace,
		whipProxy:      cfg.WhipProxy,
		limiter:        newRateLimiter(time.Second),
		now:            now,
	}
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.setCommonHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	switch {
	case r.Method == http.MethodGet && r.URL.Path == "/healthz":
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	case r.Method == http.MethodGet && r.URL.Path == "/api/rooms":
		s.handleListRooms(w, r)
	case r.Method == http.MethodGet && r.URL.Path == "/api/me":
		s.handleGetMe(w, r)
	case r.Method == http.MethodPatch && r.URL.Path == "/api/me":
		s.handleUpdateMe(w, r)
	case r.Method == http.MethodGet && r.URL.Path == "/api/admin/rooms":
		s.handleListOwnedRooms(w, r)
	case r.Method == http.MethodPost && r.URL.Path == "/api/admin/rooms":
		s.handleCreateRoom(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/rooms/") && strings.HasSuffix(r.URL.Path, "/comments"):
		s.handleListComments(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/rooms/") && strings.HasSuffix(r.URL.Path, "/stats"):
		s.handleGetRoomStats(w, r)
	case r.Method == http.MethodPost && strings.HasPrefix(r.URL.Path, "/api/rooms/") && strings.HasSuffix(r.URL.Path, "/visits"):
		s.handleCreateRoomVisit(w, r)
	case r.Method == http.MethodPost && strings.HasPrefix(r.URL.Path, "/api/rooms/") && strings.HasSuffix(r.URL.Path, "/stream-access"):
		s.handleCreateStreamAccess(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/rooms/") && strings.HasSuffix(r.URL.Path, "/thumbnail"):
		s.handleGetRoomThumbnail(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/rooms/"):
		s.handleGetRoom(w, r)
	case r.Method == http.MethodPost && strings.HasPrefix(r.URL.Path, "/api/rooms/") && strings.HasSuffix(r.URL.Path, "/comments"):
		s.handleCreateComment(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/ws/rooms/") && strings.HasSuffix(r.URL.Path, "/comments"):
		s.handleCommentWebSocket(w, r)
	case r.Method == http.MethodPatch && strings.HasPrefix(r.URL.Path, "/api/admin/rooms/"):
		s.handleUpdateRoom(w, r)
	case r.Method == http.MethodPost && strings.HasPrefix(r.URL.Path, "/api/admin/rooms/") && strings.HasSuffix(r.URL.Path, "/ingest-token"):
		s.handleRotateRoomIngestToken(w, r)
	case r.Method == http.MethodDelete && strings.HasPrefix(r.URL.Path, "/api/admin/rooms/"):
		s.handleDeleteRoom(w, r)
	case r.Method == http.MethodDelete && strings.HasPrefix(r.URL.Path, "/api/admin/comments/"):
		s.handleDeleteComment(w, r)
	case strings.HasPrefix(r.URL.Path, "/live/"):
		s.handleWhipProxy(w, r)
	default:
		writeError(w, http.StatusNotFound, "not found")
	}
}

func (s *Server) setCommonHeaders(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Vary", "Origin")
	w.Header().Set("Content-Security-Policy", "default-src 'self'; connect-src 'self' https: wss:; media-src 'self' blob:; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	origin := r.Header.Get("Origin")
	if s.isAllowedOrigin(origin) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Cf-Access-Jwt-Assertion")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
	}
}

func (s *Server) isAllowedOrigin(origin string) bool {
	if origin == "" {
		return false
	}
	for _, allowedOrigin := range s.allowedOrigins {
		if origin == allowedOrigin {
			return true
		}
	}
	return false
}

func (s *Server) requirePrincipal(w http.ResponseWriter, r *http.Request) (access.Principal, bool) {
	principal, err := s.verifier.VerifyRequest(r.Context(), r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return access.Principal{}, false
	}
	return principal, true
}

func (s *Server) writeServerError(w http.ResponseWriter, err error) {
	s.logger.Error("request failed", "error", err)
	writeError(w, http.StatusInternalServerError, "internal server error")
}
