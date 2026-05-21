package httpapi

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"boke-video/backend/internal/repository"
)

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
