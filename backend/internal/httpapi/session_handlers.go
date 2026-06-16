package httpapi

import (
	"net/http"

	"boke-video/backend/internal/sessionauth"

	"github.com/google/uuid"
)

func (s *Server) handleCreateSession(w http.ResponseWriter, r *http.Request) {
	if len(s.sessionSecret) == 0 {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	if cookie, err := r.Cookie(sessionauth.CookieName); err == nil {
		if subject, err := sessionauth.Verify(cookie.Value, s.sessionSecret); err == nil {
			writeJSON(w, http.StatusOK, map[string]string{"subject": subject})
			return
		}
	}

	subject := "anon:" + uuid.NewString()
	http.SetCookie(w, &http.Cookie{
		Name:     sessionauth.CookieName,
		Value:    sessionauth.Sign(subject, s.sessionSecret),
		Path:     "/",
		MaxAge:   365 * 24 * 3600,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	writeJSON(w, http.StatusCreated, map[string]string{"subject": subject})
}
