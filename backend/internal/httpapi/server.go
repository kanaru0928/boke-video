package httpapi

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"boke-video/backend/internal/access"
	"boke-video/backend/internal/comment"
	"boke-video/backend/internal/ingestauth"
	"boke-video/backend/internal/repository"
	"boke-video/backend/internal/streamaccess"
	"boke-video/backend/internal/streammonitor"
	"boke-video/backend/internal/whipproxy"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

const roomThumbnailRefreshSeconds = 15
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

func (s *Server) handleListRooms(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePrincipal(w, r); !ok {
		return
	}
	rooms, err := s.repository.ListRooms(r.Context())
	if err != nil {
		s.writeServerError(w, err)
		return
	}
	if _, err := s.reconcileRooms(r.Context(), rooms); err != nil {
		s.writeServerError(w, err)
		return
	}
	rooms, err = s.repository.ListPublicRooms(r.Context())
	if err != nil {
		s.writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, rooms)
}

func (s *Server) handleListOwnedRooms(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requirePrincipal(w, r)
	if !ok {
		return
	}
	rooms, err := s.repository.ListRoomsByOwner(r.Context(), principal.Subject)
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
	room, err = s.reconcileRoom(r.Context(), room)
	if err != nil {
		s.writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, room)
}

func (s *Server) handleCreateRoom(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requirePrincipal(w, r)
	if !ok {
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

	ingestToken, err := ingestauth.NewToken()
	if err != nil {
		s.writeServerError(w, err)
		return
	}
	now := s.now().UTC()
	room := repository.Room{
		ID:                      roomID,
		Title:                   req.Title,
		ThumbnailURL:            "",
		ThumbnailUpdatedAt:      now,
		ThumbnailRefreshSeconds: roomThumbnailRefreshSeconds,
		StreamStatus:            "waiting",
		OwnerSub:                principal.Subject,
		IngestTokenHash:         ingestauth.HashToken(ingestToken),
		CreatedAt:               now,
	}
	if err := s.repository.CreateRoom(r.Context(), room); err != nil {
		writeRepositoryError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, createRoomResponse{
		Room:            room,
		WhipBearerToken: ingestToken,
	})
}

type createRoomResponse struct {
	repository.Room
	WhipBearerToken string `json:"whipBearerToken"`
}

var roomIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{1,80}$`)

func validRoomID(roomID string) bool {
	return roomIDPattern.MatchString(roomID)
}

func (s *Server) handleUpdateRoom(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requirePrincipal(w, r)
	if !ok {
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
	if err := s.repository.UpdateRoomTitle(r.Context(), roomID, principal.Subject, req.Title); err != nil {
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

func (s *Server) handleDeleteRoom(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requirePrincipal(w, r)
	if !ok {
		return
	}
	roomID := strings.TrimPrefix(r.URL.Path, "/api/admin/rooms/")
	if err := s.repository.DeleteRoom(r.Context(), roomID, principal.Subject); err != nil {
		writeRepositoryError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleRotateRoomIngestToken(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requirePrincipal(w, r)
	if !ok {
		return
	}
	roomID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/admin/rooms/"), "/ingest-token")
	ingestToken, err := ingestauth.NewToken()
	if err != nil {
		s.writeServerError(w, err)
		return
	}
	if err := s.repository.UpdateRoomIngestTokenHash(r.Context(), roomID, principal.Subject, ingestauth.HashToken(ingestToken)); err != nil {
		writeRepositoryError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, ingestTokenResponse{WhipBearerToken: ingestToken})
}

type ingestTokenResponse struct {
	WhipBearerToken string `json:"whipBearerToken"`
}

func (s *Server) handleDeleteComment(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requirePrincipal(w, r)
	if !ok {
		return
	}
	commentID := strings.TrimPrefix(r.URL.Path, "/api/admin/comments/")
	if err := s.repository.DeleteComment(r.Context(), commentID, principal.Subject); err != nil {
		writeRepositoryError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleWhipProxy(w http.ResponseWriter, r *http.Request) {
	if s.whipProxy == nil {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	roomID := strings.Trim(strings.TrimPrefix(r.URL.Path, "/live/"), "/")
	if index := strings.Index(roomID, "/"); index >= 0 {
		roomID = roomID[:index]
	}
	room, err := s.repository.GetRoom(r.Context(), roomID)
	if err != nil {
		writeRepositoryError(w, err)
		return
	}
	if !ingestauth.VerifyAuthorizationHeader(r.Header.Get("Authorization"), room.IngestTokenHash) {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	s.whipProxy.ServeHTTP(w, r)
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

func (s *Server) handleGetRoomStats(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePrincipal(w, r); !ok {
		return
	}
	roomID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/rooms/"), "/stats")
	room, err := s.repository.GetRoom(r.Context(), roomID)
	if err != nil {
		writeRepositoryError(w, err)
		return
	}
	if _, err := s.reconcileRoom(r.Context(), room); err != nil {
		s.writeServerError(w, err)
		return
	}
	stats, err := s.repository.GetRoomStats(r.Context(), roomID)
	if err != nil {
		writeRepositoryError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, s.roomStatsResponseFromStats(stats))
}

func (s *Server) handleGetRoomThumbnail(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePrincipal(w, r); !ok {
		return
	}
	if s.streamMonitor == nil {
		writeError(w, http.StatusServiceUnavailable, "stream monitor is not configured")
		return
	}
	roomID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/rooms/"), "/thumbnail")
	room, err := s.repository.GetRoom(r.Context(), roomID)
	if err != nil {
		writeRepositoryError(w, err)
		return
	}
	room, err = s.reconcileRoom(r.Context(), room)
	if err != nil {
		s.writeServerError(w, err)
		return
	}
	if room.StreamStatus != "live" {
		writeError(w, http.StatusNotFound, "thumbnail is not available")
		return
	}
	thumbnail, err := s.streamMonitor.FetchThumbnail(r.Context(), roomID)
	if err != nil {
		if errors.Is(err, streammonitor.ErrStreamNotFound) {
			writeError(w, http.StatusNotFound, "thumbnail is not available")
			return
		}
		s.logger.Warn("fetch thumbnail", "room_id", roomID, "error", err)
		writeError(w, http.StatusBadGateway, "thumbnail upstream failed")
		return
	}
	defer thumbnail.Body.Close()

	w.Header().Set("Content-Type", thumbnail.ContentType)
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, thumbnail.Body)
}

func (s *Server) handleCreateRoomVisit(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requirePrincipal(w, r)
	if !ok {
		return
	}
	roomID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/rooms/"), "/visits")
	if err := s.repository.RecordRoomVisit(r.Context(), roomID, principal.Subject, s.now().UTC()); err != nil {
		writeRepositoryError(w, err)
		return
	}
	stats, err := s.repository.GetRoomStats(r.Context(), roomID)
	if err != nil {
		writeRepositoryError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, s.roomStatsResponseFromStats(stats))
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
	msg, err := s.createComment(r.Context(), roomID, principal, r)
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
		msg, err := s.createCommentFromRequest(r.Context(), roomID, principal, req)
		if err != nil {
			_ = wsjson.Write(r.Context(), conn, map[string]string{"type": "error", "message": err.Error()})
			continue
		}
		s.commentHub.Broadcast(msg)
	}
}

func (s *Server) createComment(ctx context.Context, roomID string, principal access.Principal, r *http.Request) (comment.Message, error) {
	var req comment.CreateRequest
	if err := decodeJSON(r, &req); err != nil {
		return comment.Message{}, err
	}
	return s.createCommentFromRequest(ctx, roomID, principal, req)
}

func (s *Server) createCommentFromRequest(ctx context.Context, roomID string, principal access.Principal, req comment.CreateRequest) (comment.Message, error) {
	validReq, err := comment.ValidateCreateRequest(req)
	if err != nil {
		return comment.Message{}, err
	}
	if _, err := s.repository.GetRoom(ctx, roomID); err != nil {
		return comment.Message{}, err
	}

	now := s.now().UTC()
	stored := comment.StoredComment{
		ID:                newID(),
		RoomID:            roomID,
		AuthorSub:         principal.Subject,
		AuthorEmail:       principal.Email,
		AuthorDisplayName: principal.DisplayName(),
		Body:              validReq.Body,
		Direction:         validReq.Direction,
		Color:             validReq.Color,
		FontSize:          validReq.FontSize,
		SentAt:            now,
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
		Author: comment.Author{
			Subject:     stored.AuthorSub,
			Email:       stored.AuthorEmail,
			DisplayName: stored.AuthorDisplayName,
		},
		Body:      stored.Body,
		Direction: stored.Direction,
		Color:     stored.Color,
		FontSize:  stored.FontSize,
		SentAt:    stored.SentAt,
	}
}

type roomStatsResponse struct {
	RoomID         string     `json:"roomId"`
	VisitorCount   int        `json:"visitorCount"`
	CommentCount   int        `json:"commentCount"`
	StreamStatus   string     `json:"streamStatus"`
	StartedAt      *time.Time `json:"startedAt"`
	ElapsedSeconds int        `json:"elapsedSeconds"`
}

func (s *Server) roomStatsResponseFromStats(stats repository.RoomStats) roomStatsResponse {
	elapsedSeconds := s.elapsedSeconds(stats)
	return roomStatsResponse{
		RoomID:         stats.RoomID,
		VisitorCount:   stats.VisitorCount,
		CommentCount:   stats.CommentCount,
		StreamStatus:   stats.StreamStatus,
		StartedAt:      stats.StartedAt,
		ElapsedSeconds: elapsedSeconds,
	}
}

type streamMonitor interface {
	ListStreams(ctx context.Context) (map[string]streammonitor.StreamSnapshot, error)
	FetchThumbnail(ctx context.Context, streamName string) (streammonitor.Thumbnail, error)
}

func (s *Server) reconcileRooms(ctx context.Context, rooms []repository.Room) ([]repository.Room, error) {
	if s.streamMonitor == nil {
		return rooms, nil
	}
	snapshots, err := s.streamMonitor.ListStreams(ctx)
	if err != nil {
		s.logger.Warn("list streams", "error", err)
		return rooms, nil
	}
	reconciled := make([]repository.Room, 0, len(rooms))
	for _, room := range rooms {
		updatedRoom, err := s.reconcileRoomWithSnapshot(ctx, room, snapshots[room.ID])
		if err != nil {
			return nil, err
		}
		reconciled = append(reconciled, updatedRoom)
	}
	return reconciled, nil
}

func (s *Server) reconcileRoom(ctx context.Context, room repository.Room) (repository.Room, error) {
	if s.streamMonitor == nil {
		return room, nil
	}
	snapshots, err := s.streamMonitor.ListStreams(ctx)
	if err != nil {
		s.logger.Warn("list streams", "error", err)
		return room, nil
	}
	return s.reconcileRoomWithSnapshot(ctx, room, snapshots[room.ID])
}

func (s *Server) reconcileRoomWithSnapshot(ctx context.Context, room repository.Room, snapshot streammonitor.StreamSnapshot) (repository.Room, error) {
	now := s.now().UTC()
	nextState := repository.RoomStreamState{
		StreamStatus:            room.StreamStatus,
		StreamStartedAt:         room.StreamStartedAt,
		StreamLastSeenAt:        room.StreamLastSeenAt,
		StreamEndedAt:           room.StreamEndedAt,
		ThumbnailURL:            room.ThumbnailURL,
		ThumbnailUpdatedAt:      room.ThumbnailUpdatedAt,
		ThumbnailRefreshSeconds: room.ThumbnailRefreshSeconds,
	}

	if snapshot.Active {
		startedAt := now
		if room.StreamStartedAt != nil {
			startedAt = room.StreamStartedAt.UTC()
		} else if snapshot.StartedAt != nil {
			startedAt = snapshot.StartedAt.UTC()
		}
		nextState.StreamStatus = "live"
		nextState.StreamStartedAt = &startedAt
		nextState.StreamLastSeenAt = &now
		nextState.StreamEndedAt = nil
		nextState.ThumbnailURL = thumbnailEndpoint(room.ID)
		if shouldRefreshThumbnailTimestamp(room, now) {
			nextState.ThumbnailUpdatedAt = now
		}
		nextState.ThumbnailRefreshSeconds = roomThumbnailRefreshSeconds
	} else if room.StreamStatus == "live" {
		lastSeenAt := now
		if room.StreamLastSeenAt != nil {
			lastSeenAt = room.StreamLastSeenAt.UTC()
		}
		if now.Sub(lastSeenAt) > s.streamEndGrace {
			endedAt := lastSeenAt.Add(s.streamEndGrace)
			nextState.StreamStatus = "ended"
			nextState.StreamLastSeenAt = &lastSeenAt
			nextState.StreamEndedAt = &endedAt
			nextState.ThumbnailURL = ""
			nextState.ThumbnailUpdatedAt = now
		}
	}

	if !roomStreamStateChanged(room, nextState) {
		return room, nil
	}
	if err := s.repository.UpdateRoomStreamState(ctx, room.ID, nextState); err != nil {
		return repository.Room{}, err
	}
	updated, err := s.repository.GetRoom(ctx, room.ID)
	if err != nil {
		return repository.Room{}, err
	}
	return updated, nil
}

func (s *Server) elapsedSeconds(stats repository.RoomStats) int {
	if stats.StartedAt == nil {
		return 0
	}
	endAt := s.now().UTC()
	if stats.StreamStatus == "ended" && stats.EndedAt != nil {
		endAt = stats.EndedAt.UTC()
	}
	return max(int(endAt.Sub(stats.StartedAt.UTC()).Seconds()), 0)
}

func shouldRefreshThumbnailTimestamp(room repository.Room, now time.Time) bool {
	if room.ThumbnailURL == "" {
		return true
	}
	refreshInterval := time.Duration(max(room.ThumbnailRefreshSeconds, 1)) * time.Second
	return now.Sub(room.ThumbnailUpdatedAt) >= refreshInterval
}

func thumbnailEndpoint(roomID string) string {
	return "/api/rooms/" + url.PathEscape(roomID) + "/thumbnail"
}

func roomStreamStateChanged(room repository.Room, state repository.RoomStreamState) bool {
	return room.StreamStatus != state.StreamStatus ||
		!timePointersEqual(room.StreamStartedAt, state.StreamStartedAt) ||
		!timePointersEqual(room.StreamLastSeenAt, state.StreamLastSeenAt) ||
		!timePointersEqual(room.StreamEndedAt, state.StreamEndedAt) ||
		room.ThumbnailURL != state.ThumbnailURL ||
		!room.ThumbnailUpdatedAt.Equal(state.ThumbnailUpdatedAt) ||
		room.ThumbnailRefreshSeconds != state.ThumbnailRefreshSeconds
}

func timePointersEqual(left *time.Time, right *time.Time) bool {
	if left == nil || right == nil {
		return left == nil && right == nil
	}
	return left.Equal(*right)
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
	if errors.Is(err, repository.ErrOwnerRoomLimitExceeded) {
		writeError(w, http.StatusConflict, "owner room limit exceeded")
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
