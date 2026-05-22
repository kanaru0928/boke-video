package httpapi

import (
	"net/http"
	"strings"
	"time"

	"boke-video/backend/internal/repository"
)

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
		writeRepositoryError(w, err)
		return
	}
	stats, err := s.repository.GetRoomStats(r.Context(), roomID)
	if err != nil {
		writeRepositoryError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, s.roomStatsResponseFromStats(stats))
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

type roomStatsResponse struct {
	RoomID                   string     `json:"roomId"`
	VisitorCount             int        `json:"visitorCount"`
	CommentCount             int        `json:"commentCount"`
	CurrentViewerCount       int        `json:"currentViewerCount"`
	MaxConcurrentViewerCount int        `json:"maxConcurrentViewerCount"`
	StreamStatus             string     `json:"streamStatus"`
	StartedAt                *time.Time `json:"startedAt"`
	ElapsedSeconds           int        `json:"elapsedSeconds"`
}

func (s *Server) roomStatsResponseFromStats(stats repository.RoomStats) roomStatsResponse {
	elapsedSeconds := s.elapsedSeconds(stats)
	return roomStatsResponse{
		RoomID:                   stats.RoomID,
		VisitorCount:             stats.VisitorCount,
		CommentCount:             stats.CommentCount,
		CurrentViewerCount:       s.commentHub.CurrentViewerCount(stats.RoomID),
		MaxConcurrentViewerCount: s.commentHub.MaxConcurrentViewerCount(stats.RoomID),
		StreamStatus:             stats.StreamStatus,
		StartedAt:                stats.StartedAt,
		ElapsedSeconds:           elapsedSeconds,
	}
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
