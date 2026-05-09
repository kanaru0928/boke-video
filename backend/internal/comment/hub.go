package comment

import (
	"context"
	"sync"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

type Hub struct {
	register   chan subscription
	unregister chan subscription
	broadcast  chan Message

	mu    sync.RWMutex
	rooms map[string]map[*websocket.Conn]struct{}
}

type subscription struct {
	roomID string
	conn   *websocket.Conn
}

func NewHub() *Hub {
	return &Hub{
		register:   make(chan subscription),
		unregister: make(chan subscription),
		broadcast:  make(chan Message, 256),
		rooms:      map[string]map[*websocket.Conn]struct{}{},
	}
}

func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case sub := <-h.register:
			h.mu.Lock()
			if h.rooms[sub.roomID] == nil {
				h.rooms[sub.roomID] = map[*websocket.Conn]struct{}{}
			}
			h.rooms[sub.roomID][sub.conn] = struct{}{}
			h.mu.Unlock()
		case sub := <-h.unregister:
			h.mu.Lock()
			delete(h.rooms[sub.roomID], sub.conn)
			if len(h.rooms[sub.roomID]) == 0 {
				delete(h.rooms, sub.roomID)
			}
			h.mu.Unlock()
		case msg := <-h.broadcast:
			h.writeToRoom(ctx, msg)
		}
	}
}

func (h *Hub) Register(roomID string, conn *websocket.Conn) {
	h.register <- subscription{roomID: roomID, conn: conn}
}

func (h *Hub) Unregister(roomID string, conn *websocket.Conn) {
	h.unregister <- subscription{roomID: roomID, conn: conn}
}

func (h *Hub) Broadcast(msg Message) {
	h.broadcast <- msg
}

func (h *Hub) writeToRoom(ctx context.Context, msg Message) {
	h.mu.RLock()
	conns := make([]*websocket.Conn, 0, len(h.rooms[msg.RoomID]))
	for conn := range h.rooms[msg.RoomID] {
		conns = append(conns, conn)
	}
	h.mu.RUnlock()

	for _, conn := range conns {
		_ = wsjsonWrite(ctx, conn, msg)
	}
}

func wsjsonWrite(ctx context.Context, conn *websocket.Conn, value any) error {
	return wsjson.Write(ctx, conn, value)
}
