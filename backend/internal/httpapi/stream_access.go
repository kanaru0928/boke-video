package httpapi

import (
	"net/http"
	"strings"
)

type streamAccessResponse struct {
	PlaybackURL string `json:"playbackUrl"`
}

func (s *Server) handleCreateStreamAccess(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePrincipal(w, r); !ok {
		return
	}
	roomID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/rooms/"), "/stream-access")
	if _, err := s.repository.GetRoom(r.Context(), roomID); err != nil {
		writeRepositoryError(w, err)
		return
	}
	playbackURL, err := s.streamAccess.SignedPlaybackURL(roomID)
	if err != nil {
		s.writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, streamAccessResponse{PlaybackURL: playbackURL})
}
