package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"boke-video/backend/internal/access"
	"boke-video/backend/internal/comment"
	"boke-video/backend/internal/repository"
)

func TestServerStoresCommentAppearance(t *testing.T) {
	server := newTestServer(t)

	roomID := createTestRoom(t, server, "配信")
	createCommentRequest := `{
		"body": "こんにちは",
		"direction": "topToBottom",
		"color": "#40c4ff",
		"fontSize": "large"
	}`
	commentResponse := performRequest(server, http.MethodPost, "/api/rooms/"+roomID+"/comments", createCommentRequest)
	if commentResponse.Code != http.StatusCreated {
		t.Fatalf("create comment status = %d, body = %s", commentResponse.Code, commentResponse.Body.String())
	}

	listResponse := performRequest(server, http.MethodGet, "/api/rooms/"+roomID+"/comments", "")
	if listResponse.Code != http.StatusOK {
		t.Fatalf("list comments status = %d, body = %s", listResponse.Code, listResponse.Body.String())
	}

	var messages []comment.Message
	if err := json.NewDecoder(listResponse.Body).Decode(&messages); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if len(messages) != 1 {
		t.Fatalf("len(messages) = %d", len(messages))
	}
	if messages[0].Color != "#40c4ff" {
		t.Fatalf("message color = %q", messages[0].Color)
	}
	if messages[0].FontSize != comment.FontSizeLarge {
		t.Fatalf("message font size = %q", messages[0].FontSize)
	}
}

func TestServerReturnsMissingStreamStatus(t *testing.T) {
	server := newTestServer(t)

	roomID := createTestRoom(t, server, "配信")
	response := performRequest(server, http.MethodGet, "/api/rooms/"+roomID+"/status", "")
	if response.Code != http.StatusOK {
		t.Fatalf("room status code = %d, body = %s", response.Code, response.Body.String())
	}

	var body struct {
		Stream string `json:"stream"`
	}
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if body.Stream != "missing" {
		t.Fatalf("stream = %q", body.Stream)
	}
}

func newTestServer(t *testing.T) *Server {
	t.Helper()

	db, err := repository.OpenSQLite(filepath.Join(t.TempDir(), "test.sqlite3"))
	if err != nil {
		t.Fatalf("OpenSQLite returned error: %v", err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Fatalf("Close returned error: %v", err)
		}
	})

	if err := db.Migrate(context.Background()); err != nil {
		t.Fatalf("Migrate returned error: %v", err)
	}

	return NewServer(ServerConfig{
		Logger:         slog.Default(),
		Repository:     db,
		Verifier:       access.NewVerifier(access.VerifierConfig{}),
		CommentHub:     comment.NewHub(),
		AllowedOrigins: []string{"http://localhost:5173"},
		StreamDataDir:  t.TempDir(),
	})
}

func createTestRoom(t *testing.T, server *Server, title string) string {
	t.Helper()

	response := performRequest(server, http.MethodPost, "/api/admin/rooms", `{"title":"`+title+`"}`)
	if response.Code != http.StatusCreated {
		t.Fatalf("create room status = %d, body = %s", response.Code, response.Body.String())
	}

	var room repository.Room
	if err := json.NewDecoder(response.Body).Decode(&room); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	return room.ID
}

func performRequest(server *Server, method string, path string, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	server.ServeHTTP(recorder, request)
	return recorder
}
