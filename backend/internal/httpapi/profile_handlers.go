package httpapi

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"boke-video/backend/internal/repository"
)

type updateUserProfileRequest struct {
	DisplayName string `json:"displayName"`
}

func (s *Server) handleGetMe(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requirePrincipal(w, r)
	if !ok {
		return
	}
	profile, err := s.repository.GetUserProfile(r.Context(), principal.Subject)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			s.writeServerError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, repository.UserProfile{
			Subject:     principal.Subject,
			DisplayName: "",
			UpdatedAt:   s.now().UTC(),
		})
		return
	}
	writeJSON(w, http.StatusOK, profile)
}

func (s *Server) handleUpdateMe(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requirePrincipal(w, r)
	if !ok {
		return
	}
	var req updateUserProfileRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	displayName := strings.TrimSpace(req.DisplayName)
	if displayName == "" || len([]rune(displayName)) > 40 {
		writeError(w, http.StatusBadRequest, "display name must be 1 to 40 characters")
		return
	}
	profile := repository.UserProfile{
		Subject:     principal.Subject,
		DisplayName: displayName,
		UpdatedAt:   s.now().UTC(),
	}
	if err := s.repository.UpsertUserProfile(r.Context(), profile); err != nil {
		s.writeServerError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, profile)
}
