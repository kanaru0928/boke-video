package httpapi

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"boke-video/backend/internal/access"
	"boke-video/backend/internal/comment"
	"boke-video/backend/internal/repository"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

type ServerConfig struct {
	Logger         *slog.Logger
	Repository     *repository.SQLite
	Verifier       *access.Verifier
	CommentHub     *comment.Hub
	AllowedOrigins []string
}

type Server struct {
	logger         *slog.Logger
	repository     *repository.SQLite
	verifier       *access.Verifier
	commentHub     *comment.Hub
	allowedOrigins []string
	limiter        *rateLimiter
}

func NewServer(cfg ServerConfig) *Server {
	return &Server{
		logger:         cfg.Logger,
		repository:     cfg.Repository,
		verifier:       cfg.Verifier,
		commentHub:     cfg.CommentHub,
		allowedOrigins: cfg.AllowedOrigins,
		limiter:        newRateLimiter(time.Second),
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
	case r.Method == http.MethodPost && r.URL.Path == "/api/admin/rooms":
		s.handleCreateRoom(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/rooms/") && strings.HasSuffix(r.URL.Path, "/comments"):
		s.handleListComments(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/api/rooms/"):
		s.handleGetRoom(w, r)
	case r.Method == http.MethodPost && strings.HasPrefix(r.URL.Path, "/api/rooms/") && strings.HasSuffix(r.URL.Path, "/comments"):
		s.handleCreateComment(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/ws/rooms/") && strings.HasSuffix(r.URL.Path, "/comments"):
		s.handleCommentWebSocket(w, r)
	case r.Method == http.MethodPatch && strings.HasPrefix(r.URL.Path, "/api/admin/rooms/"):
		s.handleUpdateRoom(w, r)
	case r.Method == http.MethodDelete && strings.HasPrefix(r.URL.Path, "/api/admin/comments/"):
		s.handleDeleteComment(w, r)
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

func (s *Server) handleListRooms(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePrincipal(w, r); !ok {
		return
	}
	rooms, err := s.repository.ListRooms(r.Context())
	if err != nil {
		s.writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, rooms)
}

func (s *Server) handleGetRoom(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePrincipal(w, r); !ok {
		return
	}
	roomID := pathValue(r.URL.Path, "/api/rooms/")
	room, err := s.repository.GetRoom(r.Context(), roomID)
	if err != nil {
		writeRepositoryError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, room)
}

func (s *Server) handleCreateRoom(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePrincipal(w, r); !ok {
		return
	}
	var req struct {
		ID    string `json:"id"`
		Title string `json:"title"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	req.ID = strings.TrimSpace(req.ID)
	if req.ID != "" && !validRoomID(req.ID) {
		writeError(w, http.StatusBadRequest, "room id must be 1 to 80 URL-safe characters")
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" || len([]rune(req.Title)) > 80 {
		writeError(w, http.StatusBadRequest, "title must be 1 to 80 characters")
		return
	}
	roomID := req.ID
	if roomID == "" {
		roomID = newID()
	}

	room := repository.Room{
		ID:        roomID,
		Title:     req.Title,
		CreatedAt: time.Now().UTC(),
	}
	if err := s.repository.CreateRoom(r.Context(), room); err != nil {
		writeRepositoryError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, room)
}

var roomIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{1,80}$`)

func validRoomID(roomID string) bool {
	return roomIDPattern.MatchString(roomID)
}

func (s *Server) handleUpdateRoom(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePrincipal(w, r); !ok {
		return
	}
	roomID := strings.TrimPrefix(r.URL.Path, "/api/admin/rooms/")
	var req struct {
		Title string `json:"title"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" || len([]rune(req.Title)) > 80 {
		writeError(w, http.StatusBadRequest, "title must be 1 to 80 characters")
		return
	}
	if err := s.repository.UpdateRoomTitle(r.Context(), roomID, req.Title); err != nil {
		writeRepositoryError(w, err)
		return
	}
	room, err := s.repository.GetRoom(r.Context(), roomID)
	if err != nil {
		writeRepositoryError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, room)
}

func (s *Server) handleDeleteComment(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePrincipal(w, r); !ok {
		return
	}
	commentID := strings.TrimPrefix(r.URL.Path, "/api/admin/comments/")
	if err := s.repository.DeleteComment(r.Context(), commentID); err != nil {
		writeRepositoryError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleListComments(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePrincipal(w, r); !ok {
		return
	}
	roomID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/rooms/"), "/comments")
	limit := 100
	if rawLimit := r.URL.Query().Get("limit"); rawLimit != "" {
		parsedLimit, err := strconv.Atoi(rawLimit)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid limit")
			return
		}
		limit = min(max(parsedLimit, 1), 300)
	}

	storedComments, err := s.repository.ListComments(r.Context(), roomID, limit)
	if err != nil {
		s.writeServerError(w, err)
		return
	}

	messages := make([]comment.Message, 0, len(storedComments))
	for i := len(storedComments) - 1; i >= 0; i-- {
		messages = append(messages, storedToMessage(storedComments[i]))
	}
	writeJSON(w, http.StatusOK, messages)
}

func (s *Server) handleCreateComment(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requirePrincipal(w, r)
	if !ok {
		return
	}
	if !s.limiter.Allow(principal.Subject) {
		writeError(w, http.StatusTooManyRequests, "rate limited")
		return
	}

	roomID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/rooms/"), "/comments")
	msg, err := s.createComment(r.Context(), roomID, principal.Subject, r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	s.commentHub.Broadcast(msg)
	writeJSON(w, http.StatusCreated, msg)
}

func (s *Server) handleCommentWebSocket(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requirePrincipal(w, r)
	if !ok {
		return
	}
	roomID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/ws/rooms/"), "/comments")

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: s.allowedOrigins,
	})
	if err != nil {
		s.logger.Warn("accept websocket", "error", err)
		return
	}
	defer conn.Close(websocket.StatusNormalClosure, "")

	s.commentHub.Register(roomID, conn)
	defer s.commentHub.Unregister(roomID, conn)

	for {
		var req comment.CreateRequest
		if err := wsjson.Read(r.Context(), conn, &req); err != nil {
			return
		}
		if !s.limiter.Allow(principal.Subject) {
			_ = wsjson.Write(r.Context(), conn, map[string]string{"type": "error", "message": "rate limited"})
			continue
		}
		msg, err := s.createCommentFromRequest(r.Context(), roomID, principal.Subject, req)
		if err != nil {
			_ = wsjson.Write(r.Context(), conn, map[string]string{"type": "error", "message": err.Error()})
			continue
		}
		s.commentHub.Broadcast(msg)
	}
}

func (s *Server) createComment(ctx context.Context, roomID string, authorSub string, r *http.Request) (comment.Message, error) {
	var req comment.CreateRequest
	if err := decodeJSON(r, &req); err != nil {
		return comment.Message{}, err
	}
	return s.createCommentFromRequest(ctx, roomID, authorSub, req)
}

func (s *Server) createCommentFromRequest(ctx context.Context, roomID string, authorSub string, req comment.CreateRequest) (comment.Message, error) {
	validReq, err := comment.ValidateCreateRequest(req)
	if err != nil {
		return comment.Message{}, err
	}
	if _, err := s.repository.GetRoom(ctx, roomID); err != nil {
		return comment.Message{}, err
	}

	now := time.Now().UTC()
	stored := comment.StoredComment{
		ID:        newID(),
		RoomID:    roomID,
		AuthorSub: authorSub,
		Body:      validReq.Body,
		Direction: validReq.Direction,
		Color:     validReq.Color,
		FontSize:  validReq.FontSize,
		SentAt:    now,
	}
	if err := s.repository.CreateComment(ctx, stored); err != nil {
		return comment.Message{}, err
	}

	return storedToMessage(stored), nil
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

func storedToMessage(stored comment.StoredComment) comment.Message {
	return comment.Message{
		Type:      "comment",
		RoomID:    stored.RoomID,
		CommentID: stored.ID,
		Body:      stored.Body,
		Direction: stored.Direction,
		Color:     stored.Color,
		FontSize:  stored.FontSize,
		SentAt:    stored.SentAt,
	}
}

func decodeJSON(r *http.Request, dest any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(dest)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func writeRepositoryError(w http.ResponseWriter, err error) {
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	if errors.Is(err, repository.ErrAlreadyExists) {
		writeError(w, http.StatusConflict, "already exists")
		return
	}
	writeError(w, http.StatusInternalServerError, "internal server error")
}

func pathValue(urlPath string, prefix string) string {
	return strings.Trim(strings.TrimPrefix(urlPath, prefix), "/")
}

func newID() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		panic(err)
	}
	return hex.EncodeToString(bytes)
}

type rateLimiter struct {
	mu       sync.Mutex
	interval time.Duration
	lastSeen map[string]time.Time
}

func newRateLimiter(interval time.Duration) *rateLimiter {
	return &rateLimiter{
		interval: interval,
		lastSeen: map[string]time.Time{},
	}
}

func (r *rateLimiter) Allow(key string) bool {
	now := time.Now()
	r.mu.Lock()
	defer r.mu.Unlock()

	lastSeen, ok := r.lastSeen[key]
	if ok && now.Sub(lastSeen) < r.interval {
		return false
	}
	r.lastSeen[key] = now
	return true
}
