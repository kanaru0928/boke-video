package httpapi

import (
	"errors"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"boke-video/backend/internal/ingestauth"
	"boke-video/backend/internal/repository"
	"boke-video/backend/internal/roomauth"
	"boke-video/backend/internal/streammonitor"
)

const roomThumbnailRefreshSeconds = 15

var roomIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{1,80}$`)

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
	responses, err := s.publicRoomResponses(r.Context(), rooms)
	if err != nil {
		s.writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, responses)
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
	rooms, err = s.reconcileRooms(r.Context(), rooms)
	if err != nil {
		s.writeServerError(w, err)
		return
	}
	rooms, err = s.repository.ListRoomsByOwner(r.Context(), principal.Subject)
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
		writeRepositoryError(w, err)
		return
	}
	if room.StreamStatus == "ended" {
		writeError(w, http.StatusNotFound, "not found")
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

func (s *Server) handleSetRoomPassword(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requirePrincipal(w, r)
	if !ok {
		return
	}
	roomID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/admin/rooms/"), "/password")
	var req struct {
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	req.Password = strings.TrimSpace(req.Password)
	if req.Password == "" {
		writeError(w, http.StatusBadRequest, "password must not be empty")
		return
	}
	saltAndHash, err := roomauth.HashPassword(req.Password)
	if err != nil {
		s.writeServerError(w, err)
		return
	}
	if err := s.repository.UpdateRoomPassword(r.Context(), roomID, principal.Subject, saltAndHash); err != nil {
		writeRepositoryError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleDeleteRoomPassword(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requirePrincipal(w, r)
	if !ok {
		return
	}
	roomID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/admin/rooms/"), "/password")
	if err := s.repository.UpdateRoomPassword(r.Context(), roomID, principal.Subject, ""); err != nil {
		writeRepositoryError(w, err)
		return
	}
	if err := s.repository.UpdateRoomBypassToken(r.Context(), roomID, principal.Subject, ""); err != nil {
		writeRepositoryError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleRotateRoomBypassToken(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requirePrincipal(w, r)
	if !ok {
		return
	}
	roomID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/admin/rooms/"), "/bypass-token")
	token, err := roomauth.NewBypassToken()
	if err != nil {
		s.writeServerError(w, err)
		return
	}
	if err := s.repository.UpdateRoomBypassToken(r.Context(), roomID, principal.Subject, roomauth.HashBypassToken(token)); err != nil {
		writeRepositoryError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, bypassTokenResponse{BypassToken: token})
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
	if r.Method == http.MethodDelete {
		recorder := newStatusRecorder(w)
		s.whipProxy.ServeHTTP(recorder, r)
		if isSuccessfulStatus(recorder.Status()) {
			if err := s.repository.DeleteRoomByID(r.Context(), roomID); err != nil {
				s.logger.Warn("delete room after whip termination", "room_id", roomID, "error", err)
			}
		}
		return
	}
	s.whipProxy.ServeHTTP(w, r)
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

type createRoomResponse struct {
	repository.Room
	WhipBearerToken string `json:"whipBearerToken"`
}

type ingestTokenResponse struct {
	WhipBearerToken string `json:"whipBearerToken"`
}

type bypassTokenResponse struct {
	BypassToken string `json:"bypassToken"`
}

func validRoomID(roomID string) bool {
	return roomIDPattern.MatchString(roomID)
}

func shouldRefreshThumbnailTimestamp(room repository.Room, now time.Time) bool {
	if room.ThumbnailURL == "" {
		return true
	}
	refreshInterval := time.Duration(max(room.ThumbnailRefreshSeconds, 1)) * time.Second
	return now.Sub(room.ThumbnailUpdatedAt) >= refreshInterval
}
