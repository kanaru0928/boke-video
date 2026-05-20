package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"boke-video/backend/internal/access"
	"boke-video/backend/internal/comment"
	"boke-video/backend/internal/repository"
	"boke-video/backend/internal/streamaccess"
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

func TestServerReturnsRoomStatsFromStoredData(t *testing.T) {
	server := newTestServer(t)

	roomID := createTestRoom(t, server, "配信")
	visitResponse := performRequest(server, http.MethodPost, "/api/rooms/"+roomID+"/visits", "")
	if visitResponse.Code != http.StatusCreated {
		t.Fatalf("create room visit status = %d, body = %s", visitResponse.Code, visitResponse.Body.String())
	}
	secondVisitResponse := performRequest(server, http.MethodPost, "/api/rooms/"+roomID+"/visits", "")
	if secondVisitResponse.Code != http.StatusCreated {
		t.Fatalf("create second room visit status = %d, body = %s", secondVisitResponse.Code, secondVisitResponse.Body.String())
	}

	createCommentRequest := `{
		"body": "こんにちは",
		"direction": "rightToLeft",
		"color": "#ffffff",
		"fontSize": "medium"
	}`
	commentResponse := performRequest(server, http.MethodPost, "/api/rooms/"+roomID+"/comments", createCommentRequest)
	if commentResponse.Code != http.StatusCreated {
		t.Fatalf("create comment status = %d, body = %s", commentResponse.Code, commentResponse.Body.String())
	}

	statsResponse := performRequest(server, http.MethodGet, "/api/rooms/"+roomID+"/stats", "")
	if statsResponse.Code != http.StatusOK {
		t.Fatalf("room stats status = %d, body = %s", statsResponse.Code, statsResponse.Body.String())
	}

	var stats struct {
		RoomID         string `json:"roomId"`
		VisitorCount   int    `json:"visitorCount"`
		CommentCount   int    `json:"commentCount"`
		ElapsedSeconds int    `json:"elapsedSeconds"`
	}
	if err := json.NewDecoder(statsResponse.Body).Decode(&stats); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if stats.RoomID != roomID {
		t.Fatalf("stats.RoomID = %q", stats.RoomID)
	}
	if stats.VisitorCount != 1 {
		t.Fatalf("stats.VisitorCount = %d", stats.VisitorCount)
	}
	if stats.CommentCount != 1 {
		t.Fatalf("stats.CommentCount = %d", stats.CommentCount)
	}
	if stats.ElapsedSeconds < 0 {
		t.Fatalf("stats.ElapsedSeconds = %d", stats.ElapsedSeconds)
	}
}

func TestServerCreatesRoomWithRequestedID(t *testing.T) {
	server := newTestServer(t)

	response := performRequest(server, http.MethodPost, "/api/admin/rooms", `{"id":"obs-local","title":"OBS"}`)
	if response.Code != http.StatusCreated {
		t.Fatalf("create room status = %d, body = %s", response.Code, response.Body.String())
	}

	var room repository.Room
	if err := json.NewDecoder(response.Body).Decode(&room); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if room.ID != "obs-local" {
		t.Fatalf("room.ID = %q", room.ID)
	}
	if room.ThumbnailURL != "n/a" {
		t.Fatalf("room.ThumbnailURL = %q", room.ThumbnailURL)
	}
	if room.ThumbnailRefreshSeconds != 30 {
		t.Fatalf("room.ThumbnailRefreshSeconds = %d", room.ThumbnailRefreshSeconds)
	}
}

func TestServerReturnsConflictForDuplicateRoomID(t *testing.T) {
	server := newTestServer(t)

	firstResponse := performRequest(server, http.MethodPost, "/api/admin/rooms", `{"id":"obs-local","title":"OBS"}`)
	if firstResponse.Code != http.StatusCreated {
		t.Fatalf("create room status = %d, body = %s", firstResponse.Code, firstResponse.Body.String())
	}

	secondResponse := performRequest(server, http.MethodPost, "/api/admin/rooms", `{"id":"obs-local","title":"OBS"}`)
	if secondResponse.Code != http.StatusConflict {
		t.Fatalf("duplicate room status = %d, body = %s", secondResponse.Code, secondResponse.Body.String())
	}
}

func TestServerRejectsUnsafeRoomID(t *testing.T) {
	server := newTestServer(t)

	response := performRequest(server, http.MethodPost, "/api/admin/rooms", `{"id":"../main","title":"OBS"}`)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("create room status = %d, body = %s", response.Code, response.Body.String())
	}
}

func TestServerCreatesSignedStreamAccess(t *testing.T) {
	server := newTestServer(t)
	roomID := createTestRoom(t, server, "配信")

	response := performRequest(server, http.MethodPost, "/api/rooms/"+roomID+"/stream-access", "")
	if response.Code != http.StatusCreated {
		t.Fatalf("stream access status = %d, body = %s", response.Code, response.Body.String())
	}

	var parsed struct {
		PlaybackURL string `json:"playbackUrl"`
	}
	if err := json.NewDecoder(response.Body).Decode(&parsed); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if parsed.PlaybackURL == "" {
		t.Fatal("playbackUrl is empty")
	}
	if !strings.HasPrefix(parsed.PlaybackURL, "wss://rtc.example.com:443/live/"+roomID+"/master?") {
		t.Fatalf("playbackUrl = %q", parsed.PlaybackURL)
	}
	if !strings.Contains(parsed.PlaybackURL, "policy=") {
		t.Fatalf("playbackUrl missing policy: %q", parsed.PlaybackURL)
	}
	if !strings.Contains(parsed.PlaybackURL, "signature=") {
		t.Fatalf("playbackUrl missing signature: %q", parsed.PlaybackURL)
	}
}

func TestServerRejectsStreamAccessForMissingRoom(t *testing.T) {
	server := newTestServer(t)

	response := performRequest(server, http.MethodPost, "/api/rooms/missing/stream-access", "")
	if response.Code != http.StatusNotFound {
		t.Fatalf("stream access status = %d, body = %s", response.Code, response.Body.String())
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

	streamAccess, err := streamaccess.NewSigner(streamaccess.Config{
		BaseURL: "https://rtc.example.com",
		Secret:  "secret",
		TTL:     time.Minute,
		Now: func() time.Time {
			return time.Unix(1000, 0).UTC()
		},
	})
	if err != nil {
		t.Fatalf("NewSigner returned error: %v", err)
	}

	return NewServer(ServerConfig{
		Logger:         slog.Default(),
		Repository:     db,
		Verifier:       access.NewVerifier(access.VerifierConfig{}),
		CommentHub:     comment.NewHub(),
		AllowedOrigins: []string{"http://localhost:5173"},
		StreamAccess:   streamAccess,
		Now: func() time.Time {
			return time.Unix(2000, 0).UTC()
		},
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
