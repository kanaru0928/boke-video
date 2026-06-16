package httpapi

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
	"time"

	"boke-video/backend/internal/access"
	"boke-video/backend/internal/comment"
	"boke-video/backend/internal/ingestauth"
	"boke-video/backend/internal/repository"
	"boke-video/backend/internal/streamaccess"
	"boke-video/backend/internal/streammonitor"
	"boke-video/backend/internal/whipproxy"
)

var uuidV4Pattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

func TestServerStoresCommentAppearance(t *testing.T) {
	server := newTestServer(t)

	setTestDisplayName(t, server, "local-dev", "配信者")
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

	var page commentPageResponse
	if err := json.NewDecoder(listResponse.Body).Decode(&page); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	messages := page.Comments
	if len(messages) != 1 {
		t.Fatalf("len(messages) = %d", len(messages))
	}
	if messages[0].Color != "#40c4ff" {
		t.Fatalf("message color = %q", messages[0].Color)
	}
	if messages[0].FontSize != comment.FontSizeLarge {
		t.Fatalf("message font size = %q", messages[0].FontSize)
	}
	if messages[0].Author.Subject != "local-dev" {
		t.Fatalf("message author subject = %q", messages[0].Author.Subject)
	}
	if messages[0].Author.DisplayName != "配信者" {
		t.Fatalf("message author display name = %q", messages[0].Author.DisplayName)
	}
}

func TestServerCreatesInitialDisplayNameForComment(t *testing.T) {
	server := newTestServer(t)

	roomID := createTestRoom(t, server, "配信")
	response := performRequest(server, http.MethodPost, "/api/rooms/"+roomID+"/comments", `{
		"body": "こんにちは",
		"direction": "rightToLeft",
		"color": "#ffffff",
		"fontSize": "medium"
	}`)
	if response.Code != http.StatusCreated {
		t.Fatalf("create comment status = %d, body = %s", response.Code, response.Body.String())
	}
	var message comment.Message
	if err := json.NewDecoder(response.Body).Decode(&message); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if !uuidV4Pattern.MatchString(message.Author.DisplayName) {
		t.Fatalf("message author display name = %q", message.Author.DisplayName)
	}
	profile, err := server.repository.GetUserProfile(context.Background(), "local-dev")
	if err != nil {
		t.Fatalf("GetUserProfile returned error: %v", err)
	}
	if profile.DisplayName != message.Author.DisplayName {
		t.Fatalf("profile.DisplayName = %q", profile.DisplayName)
	}
}

func TestServerCreatesInitialUserProfile(t *testing.T) {
	server := newTestServer(t)

	response := performRequest(server, http.MethodGet, "/api/me", "")
	if response.Code != http.StatusOK {
		t.Fatalf("get profile status = %d, body = %s", response.Code, response.Body.String())
	}
	var profile repository.UserProfile
	if err := json.NewDecoder(response.Body).Decode(&profile); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if profile.Subject != "local-dev" {
		t.Fatalf("profile.Subject = %q", profile.Subject)
	}
	if !uuidV4Pattern.MatchString(profile.DisplayName) {
		t.Fatalf("profile.DisplayName = %q", profile.DisplayName)
	}

	secondResponse := performRequest(server, http.MethodGet, "/api/me", "")
	if secondResponse.Code != http.StatusOK {
		t.Fatalf("second get profile status = %d, body = %s", secondResponse.Code, secondResponse.Body.String())
	}
	var secondProfile repository.UserProfile
	if err := json.NewDecoder(secondResponse.Body).Decode(&secondProfile); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if secondProfile.DisplayName != profile.DisplayName {
		t.Fatalf("secondProfile.DisplayName = %q", secondProfile.DisplayName)
	}
}

func TestServerUpdatesUserProfile(t *testing.T) {
	server := newTestServer(t)

	updateResponse := performRequest(server, http.MethodPatch, "/api/me", `{"displayName":" 表示名 "}`)
	if updateResponse.Code != http.StatusOK {
		t.Fatalf("update profile status = %d, body = %s", updateResponse.Code, updateResponse.Body.String())
	}

	getResponse := performRequest(server, http.MethodGet, "/api/me", "")
	if getResponse.Code != http.StatusOK {
		t.Fatalf("get profile status = %d, body = %s", getResponse.Code, getResponse.Body.String())
	}
	var profile repository.UserProfile
	if err := json.NewDecoder(getResponse.Body).Decode(&profile); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if profile.Subject != "local-dev" {
		t.Fatalf("profile.Subject = %q", profile.Subject)
	}
	if profile.DisplayName != "表示名" {
		t.Fatalf("profile.DisplayName = %q", profile.DisplayName)
	}
}

func TestServerReturnsRoomStatsFromStoredData(t *testing.T) {
	server := newTestServer(t)

	setTestDisplayName(t, server, "local-dev", "local-dev")
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
		RoomID                   string `json:"roomId"`
		VisitorCount             int    `json:"visitorCount"`
		CommentCount             int    `json:"commentCount"`
		CurrentViewerCount       int    `json:"currentViewerCount"`
		MaxConcurrentViewerCount int    `json:"maxConcurrentViewerCount"`
		ElapsedSeconds           int    `json:"elapsedSeconds"`
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
	if stats.CurrentViewerCount != 0 {
		t.Fatalf("stats.CurrentViewerCount = %d", stats.CurrentViewerCount)
	}
	if stats.MaxConcurrentViewerCount != 0 {
		t.Fatalf("stats.MaxConcurrentViewerCount = %d", stats.MaxConcurrentViewerCount)
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
	if room.ThumbnailURL != "" {
		t.Fatalf("room.ThumbnailURL = %q", room.ThumbnailURL)
	}
	if room.ThumbnailRefreshSeconds != 15 {
		t.Fatalf("room.ThumbnailRefreshSeconds = %d", room.ThumbnailRefreshSeconds)
	}
	if room.StreamStatus != "waiting" {
		t.Fatalf("room.StreamStatus = %q", room.StreamStatus)
	}
}

func TestServerReturnsWhipBearerTokenWhenCreatingRoom(t *testing.T) {
	server := newTestServer(t)

	response := performRequest(server, http.MethodPost, "/api/admin/rooms", `{"title":"OBS"}`)
	if response.Code != http.StatusCreated {
		t.Fatalf("create room status = %d, body = %s", response.Code, response.Body.String())
	}

	var parsed struct {
		ID              string `json:"id"`
		WhipBearerToken string `json:"whipBearerToken"`
	}
	if err := json.NewDecoder(response.Body).Decode(&parsed); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if parsed.ID == "" {
		t.Fatal("id is empty")
	}
	if parsed.WhipBearerToken == "" {
		t.Fatal("whipBearerToken is empty")
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

func TestServerRejectsSecondRoomForSameOwner(t *testing.T) {
	server := newTestServer(t)

	firstResponse := performRequest(server, http.MethodPost, "/api/admin/rooms", `{"id":"first-room","title":"OBS"}`)
	if firstResponse.Code != http.StatusCreated {
		t.Fatalf("create room status = %d, body = %s", firstResponse.Code, firstResponse.Body.String())
	}

	secondResponse := performRequest(server, http.MethodPost, "/api/admin/rooms", `{"id":"second-room","title":"OBS 2"}`)
	if secondResponse.Code != http.StatusConflict {
		t.Fatalf("second room status = %d, body = %s", secondResponse.Code, secondResponse.Body.String())
	}
}

func TestServerAllowsRoomAfterOwnerDeletesCurrentRoom(t *testing.T) {
	server := newTestServer(t)

	firstResponse := performRequest(server, http.MethodPost, "/api/admin/rooms", `{"id":"first-room","title":"OBS"}`)
	if firstResponse.Code != http.StatusCreated {
		t.Fatalf("create room status = %d, body = %s", firstResponse.Code, firstResponse.Body.String())
	}
	deleteResponse := performRequest(server, http.MethodDelete, "/api/admin/rooms/first-room", "")
	if deleteResponse.Code != http.StatusNoContent {
		t.Fatalf("delete room status = %d, body = %s", deleteResponse.Code, deleteResponse.Body.String())
	}

	secondResponse := performRequest(server, http.MethodPost, "/api/admin/rooms", `{"id":"second-room","title":"OBS 2"}`)
	if secondResponse.Code != http.StatusCreated {
		t.Fatalf("second room status = %d, body = %s", secondResponse.Code, secondResponse.Body.String())
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
	server.streamMonitor = &fakeStreamMonitor{
		playlists: []streammonitor.PlaybackPlaylist{
			{
				Name:       "master",
				FileName:   "master",
				Renditions: []string{"360p", "720p"},
			},
			{
				Name:       "layer 1",
				FileName:   "layer-1",
				Renditions: []string{"360p"},
			},
		},
	}

	response := performRequest(server, http.MethodPost, "/api/rooms/"+roomID+"/stream-access", "")
	if response.Code != http.StatusCreated {
		t.Fatalf("stream access status = %d, body = %s", response.Code, response.Body.String())
	}

	var parsed struct {
		PlaybackURL      string `json:"playbackUrl"`
		PlaybackVariants []struct {
			ID          string `json:"id"`
			Label       string `json:"label"`
			PlaybackURL string `json:"playbackUrl"`
		} `json:"playbackVariants"`
	}
	if err := json.NewDecoder(response.Body).Decode(&parsed); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if parsed.PlaybackURL == "" {
		t.Fatal("playbackUrl is empty")
	}
	if !strings.HasPrefix(parsed.PlaybackURL, "wss://rtc.example.com/live/"+roomID+"/master?") {
		t.Fatalf("playbackUrl = %q", parsed.PlaybackURL)
	}
	if !strings.Contains(parsed.PlaybackURL, "policy=") {
		t.Fatalf("playbackUrl missing policy: %q", parsed.PlaybackURL)
	}
	if !strings.Contains(parsed.PlaybackURL, "signature=") {
		t.Fatalf("playbackUrl missing signature: %q", parsed.PlaybackURL)
	}
	if len(parsed.PlaybackVariants) != 1 {
		t.Fatalf("playbackVariants length = %d", len(parsed.PlaybackVariants))
	}
	variant := parsed.PlaybackVariants[0]
	if variant.ID != "layer-1" || variant.Label != "360p" {
		t.Fatalf("playback variant = %#v", variant)
	}
	if !strings.HasPrefix(variant.PlaybackURL, "wss://rtc.example.com/live/"+roomID+"/layer-1?") {
		t.Fatalf("variant playbackUrl = %q", variant.PlaybackURL)
	}
	if !strings.Contains(variant.PlaybackURL, "policy=") {
		t.Fatalf("variant playbackUrl missing policy: %q", variant.PlaybackURL)
	}
	if !strings.Contains(variant.PlaybackURL, "signature=") {
		t.Fatalf("variant playbackUrl missing signature: %q", variant.PlaybackURL)
	}
}

func TestServerRejectsStreamAccessForMissingRoom(t *testing.T) {
	server := newTestServer(t)

	response := performRequest(server, http.MethodPost, "/api/rooms/missing/stream-access", "")
	if response.Code != http.StatusNotFound {
		t.Fatalf("stream access status = %d, body = %s", response.Code, response.Body.String())
	}
}

func TestServerRejectsAdminMutationForAnotherOwner(t *testing.T) {
	server := newTestServer(t)
	roomID := "other-room"
	err := server.repository.CreateRoom(context.Background(), repository.Room{
		ID:                      roomID,
		Title:                   "他人の配信",
		ThumbnailURL:            "",
		ThumbnailUpdatedAt:      time.Now().UTC(),
		ThumbnailRefreshSeconds: 15,
		StreamStatus:            "waiting",
		OwnerSub:                "other-owner",
		IngestTokenHash:         ingestauth.HashToken("token"),
		CreatedAt:               time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("CreateRoom returned error: %v", err)
	}
	err = server.repository.CreateComment(context.Background(), comment.StoredComment{
		ID:                "other-comment",
		RoomID:            roomID,
		AuthorSub:         "viewer",
		AuthorDisplayName: "viewer",
		Body:              "こんにちは",
		Direction:         comment.DirectionRightToLeft,
		Color:             "#ffffff",
		FontSize:          comment.FontSizeMedium,
		SentAt:            time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("CreateComment returned error: %v", err)
	}

	updateResponse := performRequest(server, http.MethodPatch, "/api/admin/rooms/"+roomID, `{"title":"変更"}`)
	if updateResponse.Code != http.StatusNotFound {
		t.Fatalf("update status = %d, body = %s", updateResponse.Code, updateResponse.Body.String())
	}

	deleteCommentResponse := performRequest(server, http.MethodDelete, "/api/admin/comments/other-comment", "")
	if deleteCommentResponse.Code != http.StatusNotFound {
		t.Fatalf("delete comment status = %d, body = %s", deleteCommentResponse.Code, deleteCommentResponse.Body.String())
	}

	rotateTokenResponse := performRequest(server, http.MethodPost, "/api/admin/rooms/"+roomID+"/ingest-token", "")
	if rotateTokenResponse.Code != http.StatusNotFound {
		t.Fatalf("rotate token status = %d, body = %s", rotateTokenResponse.Code, rotateTokenResponse.Body.String())
	}
}

func TestServerListsOnlyLiveRoomsAndEndsMissingStreamsAfterGrace(t *testing.T) {
	server := newTestServer(t)
	now := time.Unix(2000, 0).UTC()
	server.now = func() time.Time {
		return now
	}
	startedAt := now.Add(-2 * time.Minute)
	fakeMonitor := &fakeStreamMonitor{
		snapshot: streammonitor.StreamSnapshot{
			Active:    true,
			StartedAt: &startedAt,
		},
	}
	server.streamMonitor = fakeMonitor
	server.streamEndGrace = 90 * time.Second
	roomID := createTestRoom(t, server, "配信")
	fakeMonitor.snapshots = map[string]streammonitor.StreamSnapshot{
		roomID: fakeMonitor.snapshot,
	}

	listResponse := performRequest(server, http.MethodGet, "/api/rooms", "")
	if listResponse.Code != http.StatusOK {
		t.Fatalf("list rooms status = %d, body = %s", listResponse.Code, listResponse.Body.String())
	}
	var liveRooms []repository.Room
	if err := json.NewDecoder(listResponse.Body).Decode(&liveRooms); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if len(liveRooms) != 1 {
		t.Fatalf("len(liveRooms) = %d", len(liveRooms))
	}
	if liveRooms[0].ID != roomID {
		t.Fatalf("liveRooms[0].ID = %q", liveRooms[0].ID)
	}
	if liveRooms[0].ThumbnailURL != "/api/rooms/"+roomID+"/thumbnail" {
		t.Fatalf("liveRooms[0].ThumbnailURL = %q", liveRooms[0].ThumbnailURL)
	}

	fakeMonitor.snapshot = streammonitor.StreamSnapshot{Active: false}
	fakeMonitor.snapshots = map[string]streammonitor.StreamSnapshot{}
	now = now.Add(89 * time.Second)
	graceResponse := performRequest(server, http.MethodGet, "/api/rooms", "")
	if graceResponse.Code != http.StatusOK {
		t.Fatalf("grace list status = %d, body = %s", graceResponse.Code, graceResponse.Body.String())
	}
	var graceRooms []repository.Room
	if err := json.NewDecoder(graceResponse.Body).Decode(&graceRooms); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if len(graceRooms) != 1 {
		t.Fatalf("len(graceRooms) = %d", len(graceRooms))
	}

	now = now.Add(2 * time.Second)
	endedResponse := performRequest(server, http.MethodGet, "/api/rooms", "")
	if endedResponse.Code != http.StatusOK {
		t.Fatalf("ended list status = %d, body = %s", endedResponse.Code, endedResponse.Body.String())
	}
	var endedRooms []repository.Room
	if err := json.NewDecoder(endedResponse.Body).Decode(&endedRooms); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if len(endedRooms) != 0 {
		t.Fatalf("len(endedRooms) = %d", len(endedRooms))
	}
	endedRoomResponse := performRequest(server, http.MethodGet, "/api/rooms/"+roomID, "")
	if endedRoomResponse.Code != http.StatusNotFound {
		t.Fatalf("ended room status = %d, body = %s", endedRoomResponse.Code, endedRoomResponse.Body.String())
	}
	endedStatsResponse := performRequest(server, http.MethodGet, "/api/rooms/"+roomID+"/stats", "")
	if endedStatsResponse.Code != http.StatusNotFound {
		t.Fatalf("ended stats status = %d, body = %s", endedStatsResponse.Code, endedStatsResponse.Body.String())
	}
	if _, err := server.repository.GetRoom(context.Background(), roomID); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("GetRoom after stream ended error = %v", err)
	}
	nextRoomResponse := performRequest(server, http.MethodPost, "/api/admin/rooms", `{"id":"next-room","title":"次の配信"}`)
	if nextRoomResponse.Code != http.StatusCreated {
		t.Fatalf("next room status = %d, body = %s", nextRoomResponse.Code, nextRoomResponse.Body.String())
	}
}

func TestServerListsPublicRoomsWithOwnerAndActivity(t *testing.T) {
	server := newTestServer(t)
	now := time.Unix(2000, 0).UTC()
	server.now = func() time.Time {
		return now
	}
	setTestDisplayName(t, server, "local-dev", "配信者")
	startedAt := now.Add(-125 * time.Second)
	server.streamMonitor = &fakeStreamMonitor{
		snapshots: map[string]streammonitor.StreamSnapshot{},
		snapshot: streammonitor.StreamSnapshot{
			Active:    true,
			StartedAt: &startedAt,
		},
	}
	roomID := createTestRoom(t, server, "配信")
	server.streamMonitor.(*fakeStreamMonitor).snapshots = map[string]streammonitor.StreamSnapshot{
		roomID: {
			Active:    true,
			StartedAt: &startedAt,
		},
	}

	listResponse := performRequest(server, http.MethodGet, "/api/rooms", "")
	if listResponse.Code != http.StatusOK {
		t.Fatalf("list rooms status = %d, body = %s", listResponse.Code, listResponse.Body.String())
	}

	var rooms []struct {
		ID                       string `json:"id"`
		OwnerDisplayName         string `json:"ownerDisplayName"`
		CurrentViewerCount       int    `json:"currentViewerCount"`
		MaxConcurrentViewerCount int    `json:"maxConcurrentViewerCount"`
		ElapsedSeconds           int    `json:"elapsedSeconds"`
	}
	if err := json.NewDecoder(listResponse.Body).Decode(&rooms); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if len(rooms) != 1 {
		t.Fatalf("len(rooms) = %d", len(rooms))
	}
	if rooms[0].ID != roomID {
		t.Fatalf("rooms[0].ID = %q", rooms[0].ID)
	}
	if rooms[0].OwnerDisplayName != "配信者" {
		t.Fatalf("rooms[0].OwnerDisplayName = %q", rooms[0].OwnerDisplayName)
	}
	if rooms[0].CurrentViewerCount != 0 {
		t.Fatalf("rooms[0].CurrentViewerCount = %d", rooms[0].CurrentViewerCount)
	}
	if rooms[0].MaxConcurrentViewerCount != 0 {
		t.Fatalf("rooms[0].MaxConcurrentViewerCount = %d", rooms[0].MaxConcurrentViewerCount)
	}
	if rooms[0].ElapsedSeconds != 125 {
		t.Fatalf("rooms[0].ElapsedSeconds = %d", rooms[0].ElapsedSeconds)
	}
}

func TestServerDeletesOwnedRoomAfterStreamEndGrace(t *testing.T) {
	server := newTestServer(t)
	now := time.Unix(2000, 0).UTC()
	server.now = func() time.Time {
		return now
	}
	server.streamEndGrace = 90 * time.Second
	roomID := createTestRoom(t, server, "配信")
	server.streamMonitor = &fakeStreamMonitor{
		snapshots: map[string]streammonitor.StreamSnapshot{
			roomID: {
				Active: true,
			},
		},
	}
	firstResponse := performRequest(server, http.MethodGet, "/api/admin/rooms", "")
	if firstResponse.Code != http.StatusOK {
		t.Fatalf("first owned rooms status = %d, body = %s", firstResponse.Code, firstResponse.Body.String())
	}

	now = now.Add(91 * time.Second)
	server.streamMonitor = &fakeStreamMonitor{snapshots: map[string]streammonitor.StreamSnapshot{}}
	endedResponse := performRequest(server, http.MethodGet, "/api/admin/rooms", "")
	if endedResponse.Code != http.StatusOK {
		t.Fatalf("ended owned rooms status = %d, body = %s", endedResponse.Code, endedResponse.Body.String())
	}
	var rooms []repository.Room
	if err := json.NewDecoder(endedResponse.Body).Decode(&rooms); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if len(rooms) != 0 {
		t.Fatalf("len(rooms) = %d", len(rooms))
	}
}

func TestServerReturnsStreamElapsedSecondsFromStreamStartedAt(t *testing.T) {
	server := newTestServer(t)
	now := time.Unix(2000, 0).UTC()
	server.now = func() time.Time {
		return now
	}
	startedAt := now.Add(-75 * time.Second)
	server.streamMonitor = &fakeStreamMonitor{
		snapshot: streammonitor.StreamSnapshot{
			Active:    true,
			StartedAt: &startedAt,
		},
	}
	roomID := createTestRoom(t, server, "配信")
	server.streamMonitor = &fakeStreamMonitor{
		snapshots: map[string]streammonitor.StreamSnapshot{
			roomID: {
				Active:    true,
				StartedAt: &startedAt,
			},
		},
	}

	statsResponse := performRequest(server, http.MethodGet, "/api/rooms/"+roomID+"/stats", "")
	if statsResponse.Code != http.StatusOK {
		t.Fatalf("room stats status = %d, body = %s", statsResponse.Code, statsResponse.Body.String())
	}
	var stats struct {
		StreamStatus   string `json:"streamStatus"`
		ElapsedSeconds int    `json:"elapsedSeconds"`
	}
	if err := json.NewDecoder(statsResponse.Body).Decode(&stats); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if stats.StreamStatus != "live" {
		t.Fatalf("stats.StreamStatus = %q", stats.StreamStatus)
	}
	if stats.ElapsedSeconds != 75 {
		t.Fatalf("stats.ElapsedSeconds = %d", stats.ElapsedSeconds)
	}
}

func TestServerKeepsStreamStartedAtWhileStreamRemainsLive(t *testing.T) {
	server := newTestServer(t)
	now := time.Unix(2000, 0).UTC()
	server.now = func() time.Time {
		return now
	}
	roomID := createTestRoom(t, server, "配信")
	server.streamMonitor = &fakeStreamMonitor{
		snapshots: map[string]streammonitor.StreamSnapshot{
			roomID: {
				Active: true,
			},
		},
	}

	firstResponse := performRequest(server, http.MethodGet, "/api/rooms/"+roomID+"/stats", "")
	if firstResponse.Code != http.StatusOK {
		t.Fatalf("first stats status = %d, body = %s", firstResponse.Code, firstResponse.Body.String())
	}

	now = now.Add(75 * time.Second)
	secondResponse := performRequest(server, http.MethodGet, "/api/rooms/"+roomID+"/stats", "")
	if secondResponse.Code != http.StatusOK {
		t.Fatalf("second stats status = %d, body = %s", secondResponse.Code, secondResponse.Body.String())
	}
	var stats struct {
		ElapsedSeconds int `json:"elapsedSeconds"`
	}
	if err := json.NewDecoder(secondResponse.Body).Decode(&stats); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if stats.ElapsedSeconds != 75 {
		t.Fatalf("stats.ElapsedSeconds = %d", stats.ElapsedSeconds)
	}
}

func TestServerProxiesRealThumbnailFromStreamMonitor(t *testing.T) {
	server := newTestServer(t)
	now := time.Unix(2000, 0).UTC()
	server.now = func() time.Time {
		return now
	}
	startedAt := now.Add(-time.Minute)
	server.streamMonitor = &fakeStreamMonitor{
		thumbnailContentType: "image/jpeg",
		thumbnailBody:        "jpeg",
	}
	roomID := createTestRoom(t, server, "配信")
	server.streamMonitor = &fakeStreamMonitor{
		snapshots: map[string]streammonitor.StreamSnapshot{
			roomID: {
				Active:    true,
				StartedAt: &startedAt,
			},
		},
		thumbnailContentType: "image/jpeg",
		thumbnailBody:        "jpeg",
	}

	response := performRequest(server, http.MethodGet, "/api/rooms/"+roomID+"/thumbnail", "")
	if response.Code != http.StatusOK {
		t.Fatalf("thumbnail status = %d, body = %s", response.Code, response.Body.String())
	}
	if response.Header().Get("Content-Type") != "image/jpeg" {
		t.Fatalf("Content-Type = %q", response.Header().Get("Content-Type"))
	}
	if response.Body.String() != "jpeg" {
		t.Fatalf("body = %q", response.Body.String())
	}
}

func TestServerProxiesWhipOnlyWithRoomBearerToken(t *testing.T) {
	upstreamRequests := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upstreamRequests++
		if r.Header.Get("Authorization") != "" {
			t.Fatalf("authorization header reached upstream")
		}
		if r.Method == http.MethodDelete {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		w.WriteHeader(http.StatusCreated)
	}))
	defer upstream.Close()

	server := newTestServer(t)
	proxy, err := whipproxy.New(upstream.URL)
	if err != nil {
		t.Fatalf("New returned error: %v", err)
	}
	server.whipProxy = proxy

	createResponse := performRequest(server, http.MethodPost, "/api/admin/rooms", `{"id":"obs-room","title":"OBS"}`)
	if createResponse.Code != http.StatusCreated {
		t.Fatalf("create room status = %d, body = %s", createResponse.Code, createResponse.Body.String())
	}
	var created struct {
		WhipBearerToken string `json:"whipBearerToken"`
	}
	if err := json.NewDecoder(createResponse.Body).Decode(&created); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}

	unauthorized := performRequest(server, http.MethodPost, "/live/obs-room?direction=whip", "")
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("unauthorized status = %d, body = %s", unauthorized.Code, unauthorized.Body.String())
	}

	request := httptest.NewRequest(http.MethodPost, "/live/obs-room?direction=whip", nil)
	request.Header.Set("Authorization", "Bearer "+created.WhipBearerToken)
	recorder := httptest.NewRecorder()
	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("proxy status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	if upstreamRequests != 1 {
		t.Fatalf("upstream requests = %d", upstreamRequests)
	}

	unauthorizedDelete := httptest.NewRequest(http.MethodDelete, "/live/obs-room/whip-session", nil)
	unauthorizedDeleteRecorder := httptest.NewRecorder()
	server.ServeHTTP(unauthorizedDeleteRecorder, unauthorizedDelete)
	if unauthorizedDeleteRecorder.Code != http.StatusUnauthorized {
		t.Fatalf("unauthorized delete status = %d, body = %s", unauthorizedDeleteRecorder.Code, unauthorizedDeleteRecorder.Body.String())
	}
	if _, err := server.repository.GetRoom(context.Background(), "obs-room"); err != nil {
		t.Fatalf("GetRoom after unauthorized delete returned error: %v", err)
	}
	if upstreamRequests != 1 {
		t.Fatalf("upstream requests after unauthorized delete = %d", upstreamRequests)
	}

	deleteRequest := httptest.NewRequest(http.MethodDelete, "/live/obs-room/whip-session", nil)
	deleteRequest.Header.Set("Authorization", "Bearer "+created.WhipBearerToken)
	deleteRecorder := httptest.NewRecorder()
	server.ServeHTTP(deleteRecorder, deleteRequest)
	if deleteRecorder.Code != http.StatusNoContent {
		t.Fatalf("delete status = %d, body = %s", deleteRecorder.Code, deleteRecorder.Body.String())
	}
	if upstreamRequests != 2 {
		t.Fatalf("upstream requests after delete = %d", upstreamRequests)
	}
	if _, err := server.repository.GetRoom(context.Background(), "obs-room"); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("GetRoom after delete error = %v", err)
	}
}

func TestServerRotatesWhipBearerTokenForOwner(t *testing.T) {
	server := newTestServer(t)
	roomID := createTestRoom(t, server, "配信")

	response := performRequest(server, http.MethodPost, "/api/admin/rooms/"+roomID+"/ingest-token", "")
	if response.Code != http.StatusCreated {
		t.Fatalf("rotate token status = %d, body = %s", response.Code, response.Body.String())
	}
	var parsed struct {
		WhipBearerToken string `json:"whipBearerToken"`
	}
	if err := json.NewDecoder(response.Body).Decode(&parsed); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if parsed.WhipBearerToken == "" {
		t.Fatal("whipBearerToken is empty")
	}
	room, err := server.repository.GetRoom(context.Background(), roomID)
	if err != nil {
		t.Fatalf("GetRoom returned error: %v", err)
	}
	if !ingestauth.VerifyAuthorizationHeader("Bearer "+parsed.WhipBearerToken, room.IngestTokenHash) {
		t.Fatal("rotated token does not match stored hash")
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
		PublicBaseURL:  "https://rtc.example.com",
		SigningBaseURL: "http://rtc.example.com:3333",
		Secret:         "secret",
		TTL:            time.Minute,
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

func setTestDisplayName(t *testing.T, server *Server, subject string, displayName string) {
	t.Helper()

	if err := server.repository.UpsertUserProfile(context.Background(), repository.UserProfile{
		Subject:     subject,
		DisplayName: displayName,
		UpdatedAt:   time.Unix(2000, 0).UTC(),
	}); err != nil {
		t.Fatalf("UpsertUserProfile returned error: %v", err)
	}
}

func TestServerCreateSessionReturns404WhenSessionSecretNotSet(t *testing.T) {
	server := newTestServer(t)

	response := performRequest(server, http.MethodPost, "/api/sessions", "")
	if response.Code != http.StatusNotFound {
		t.Fatalf("create session status = %d, body = %s", response.Code, response.Body.String())
	}
}

func TestServerCreateSessionIssuesNewCookie(t *testing.T) {
	server := newTestServer(t)
	server.sessionSecret = []byte("test-secret")

	response := performRequest(server, http.MethodPost, "/api/sessions", "")
	if response.Code != http.StatusCreated {
		t.Fatalf("create session status = %d, body = %s", response.Code, response.Body.String())
	}

	var parsed map[string]string
	if err := json.NewDecoder(response.Body).Decode(&parsed); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if !strings.HasPrefix(parsed["subject"], "anon:") {
		t.Fatalf("subject = %q", parsed["subject"])
	}

	cookies := response.Result().Cookies()
	if len(cookies) != 1 || cookies[0].Name != "boke_session" {
		t.Fatalf("cookies = %v", cookies)
	}
}

func TestServerCreateSessionIsIdempotentWithValidCookie(t *testing.T) {
	server := newTestServer(t)
	server.sessionSecret = []byte("test-secret")

	first := performRequest(server, http.MethodPost, "/api/sessions", "")
	if first.Code != http.StatusCreated {
		t.Fatalf("first session status = %d", first.Code)
	}
	var firstParsed map[string]string
	if err := json.NewDecoder(first.Body).Decode(&firstParsed); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}

	sessionCookie := first.Result().Cookies()[0]
	request := httptest.NewRequest(http.MethodPost, "/api/sessions", nil)
	request.AddCookie(sessionCookie)
	recorder := httptest.NewRecorder()
	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("second session status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	var secondParsed map[string]string
	if err := json.NewDecoder(recorder.Body).Decode(&secondParsed); err != nil {
		t.Fatalf("Decode returned error: %v", err)
	}
	if secondParsed["subject"] != firstParsed["subject"] {
		t.Fatalf("subject mismatch: first=%q second=%q", firstParsed["subject"], secondParsed["subject"])
	}
}

func performRequest(server *Server, method string, path string, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	server.ServeHTTP(recorder, request)
	return recorder
}

type fakeStreamMonitor struct {
	snapshot             streammonitor.StreamSnapshot
	snapshots            map[string]streammonitor.StreamSnapshot
	playlists            []streammonitor.PlaybackPlaylist
	inspectErr           error
	thumbnailContentType string
	thumbnailBody        string
	thumbnailErr         error
}

func (f *fakeStreamMonitor) ListStreams(ctx context.Context) (map[string]streammonitor.StreamSnapshot, error) {
	if f.inspectErr != nil {
		return nil, f.inspectErr
	}
	if f.snapshots != nil {
		return f.snapshots, nil
	}
	return map[string]streammonitor.StreamSnapshot{}, nil
}

func (f *fakeStreamMonitor) PlaybackPlaylists(ctx context.Context, streamName string) ([]streammonitor.PlaybackPlaylist, error) {
	return f.playlists, nil
}

func (f *fakeStreamMonitor) FetchThumbnail(ctx context.Context, streamName string) (streammonitor.Thumbnail, error) {
	if f.thumbnailErr != nil {
		return streammonitor.Thumbnail{}, f.thumbnailErr
	}
	if f.thumbnailBody == "" {
		return streammonitor.Thumbnail{}, errors.New("thumbnail body is empty")
	}
	return streammonitor.Thumbnail{
		ContentType: f.thumbnailContentType,
		Body:        io.NopCloser(strings.NewReader(f.thumbnailBody)),
	}, nil
}
