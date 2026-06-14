package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"boke-video/backend/internal/roomauth"
	"boke-video/backend/internal/streamaccess"
	"boke-video/backend/internal/streammonitor"
)

func (s *Server) handleCreateStreamAccess(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePrincipal(w, r); !ok {
		return
	}
	roomID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/rooms/"), "/stream-access")
	room, err := s.repository.GetRoom(r.Context(), roomID)
	if err != nil {
		writeRepositoryError(w, err)
		return
	}
	if room.HasPassword {
		var req struct {
			Password    string `json:"password"`
			BypassToken string `json:"bypassToken"`
		}
		_ = decodeJSON(r, &req)
		granted := false
		if req.BypassToken != "" {
			granted = roomauth.VerifyBypassToken(req.BypassToken, room.BypassTokenHash)
		} else if req.Password != "" {
			granted = roomauth.VerifyPassword(req.Password, room.PasswordSaltAndHash)
		}
		if !granted {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
	}
	playlists, err := s.playbackPlaylists(r, roomID)
	if err != nil {
		s.writeServerError(w, err)
		return
	}
	streamAccess, err := s.streamAccess.SignedPlaybackAccess(roomID, playlists)
	if err != nil {
		s.writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, streamAccess)
}

func (s *Server) playbackPlaylists(r *http.Request, roomID string) ([]streamaccess.PlaybackPlaylist, error) {
	if s.streamMonitor == nil {
		return nil, nil
	}
	playlists, err := s.streamMonitor.PlaybackPlaylists(r.Context(), roomID)
	if err != nil {
		if errors.Is(err, streammonitor.ErrStreamNotFound) {
			return nil, nil
		}
		return nil, err
	}
	result := make([]streamaccess.PlaybackPlaylist, 0, len(playlists))
	for _, playlist := range playlists {
		result = append(result, streamaccess.PlaybackPlaylist{
			Name:       playlist.Name,
			FileName:   playlist.FileName,
			Renditions: playlist.Renditions,
		})
	}
	return result, nil
}
