package streammonitor

import (
	"context"
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestOvenMediaEngineClientListsStreams(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/vhosts/default/apps/live/streams" {
			t.Fatalf("path = %q", r.URL.Path)
		}
		expectedAuth := "Basic " + base64.StdEncoding.EncodeToString([]byte("user:pass"))
		if r.Header.Get("Authorization") != expectedAuth {
			t.Fatalf("authorization = %q", r.Header.Get("Authorization"))
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{
			"statusCode": 200,
			"message": "OK",
			"response": ["room-1"]
		}`))
	}))
	defer server.Close()

	client := newTestClient(t, server.URL)
	streams, err := client.ListStreams(context.Background())
	if err != nil {
		t.Fatalf("ListStreams returned error: %v", err)
	}
	if !streams["room-1"].Active {
		t.Fatal("streams[room-1].Active = false")
	}
}

func TestOvenMediaEngineClientInspectsActiveStream(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/vhosts/default/apps/live/streams" {
			t.Fatalf("path = %q", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{
			"statusCode": 200,
			"message": "OK",
			"response": ["room-1"]
		}`))
	}))
	defer server.Close()

	client := newTestClient(t, server.URL)
	snapshot, err := client.InspectStream(context.Background(), "room-1")
	if err != nil {
		t.Fatalf("InspectStream returned error: %v", err)
	}
	if !snapshot.Active {
		t.Fatal("snapshot.Active = false")
	}
	if snapshot.StartedAt != nil {
		t.Fatalf("snapshot.StartedAt = %v", snapshot.StartedAt)
	}
}

func TestOvenMediaEngineClientTreatsMissingStreamAsInactive(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/vhosts/default/apps/live/streams" {
			t.Fatalf("path = %q", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{
			"statusCode": 200,
			"message": "OK",
			"response": []
		}`))
	}))
	defer server.Close()

	client := newTestClient(t, server.URL)
	snapshot, err := client.InspectStream(context.Background(), "missing")
	if err != nil {
		t.Fatalf("InspectStream returned error: %v", err)
	}
	if snapshot.Active {
		t.Fatal("snapshot.Active = true")
	}
}

func TestOvenMediaEngineClientFetchesThumbnail(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/live/room-1/thumb.jpg" {
			t.Fatalf("path = %q", r.URL.Path)
		}
		w.Header().Set("Content-Type", "image/jpeg")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("jpeg"))
	}))
	defer server.Close()

	client := newTestClient(t, server.URL)
	thumbnail, err := client.FetchThumbnail(context.Background(), "room-1")
	if err != nil {
		t.Fatalf("FetchThumbnail returned error: %v", err)
	}
	defer thumbnail.Body.Close()
	if thumbnail.ContentType != "image/jpeg" {
		t.Fatalf("thumbnail.ContentType = %q", thumbnail.ContentType)
	}
}

func newTestClient(t *testing.T, baseURL string) *OvenMediaEngineClient {
	t.Helper()
	client, err := NewOvenMediaEngineClient(OvenMediaEngineConfig{
		APIBaseURL:       baseURL,
		ThumbnailBaseURL: baseURL,
		AccessToken:      "user:pass",
	})
	if err != nil {
		t.Fatalf("NewOvenMediaEngineClient returned error: %v", err)
	}
	return client
}
