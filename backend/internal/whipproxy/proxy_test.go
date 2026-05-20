package whipproxy

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestProxyRemovesAuthorizationAndRewritesLocation(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "" {
			t.Fatalf("authorization header reached upstream")
		}
		w.Header().Set("Location", "http://"+r.Host+"/live/room/session")
		w.WriteHeader(http.StatusCreated)
	}))
	defer upstream.Close()

	proxy, err := New(upstream.URL)
	if err != nil {
		t.Fatalf("New returned error: %v", err)
	}

	request := httptest.NewRequest(http.MethodPost, "/live/room?direction=whip", nil)
	request.Host = "ingest.example.com"
	request.Header.Set("Authorization", "Bearer token")
	request.Header.Set("X-Forwarded-Proto", "https")
	recorder := httptest.NewRecorder()

	proxy.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("status = %d", recorder.Code)
	}
	if location := recorder.Header().Get("Location"); location != "https://ingest.example.com/live/room/session" {
		t.Fatalf("location = %q", location)
	}
}
