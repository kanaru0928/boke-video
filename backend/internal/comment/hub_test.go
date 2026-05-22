package comment

import (
	"testing"

	"github.com/coder/websocket"
)

func TestHubCountsUniqueViewerSubjects(t *testing.T) {
	hub := NewHub()
	var firstConn websocket.Conn
	var secondConn websocket.Conn
	var thirdConn websocket.Conn

	count := hub.registerSubscription(subscription{
		roomID:  "room-1",
		subject: "user-1",
		conn:    &firstConn,
	})
	if count != 1 {
		t.Fatalf("first register count = %d", count)
	}

	count = hub.registerSubscription(subscription{
		roomID:  "room-1",
		subject: "user-1",
		conn:    &secondConn,
	})
	if count != 1 {
		t.Fatalf("same subject register count = %d", count)
	}

	count = hub.registerSubscription(subscription{
		roomID:  "room-1",
		subject: "user-2",
		conn:    &thirdConn,
	})
	if count != 2 {
		t.Fatalf("other subject register count = %d", count)
	}

	count = hub.unregisterSubscription(subscription{
		roomID: "room-1",
		conn:   &firstConn,
	})
	if count != 2 {
		t.Fatalf("same subject partial unregister count = %d", count)
	}

	count = hub.unregisterSubscription(subscription{
		roomID: "room-1",
		conn:   &secondConn,
	})
	if count != 1 {
		t.Fatalf("same subject final unregister count = %d", count)
	}
}
