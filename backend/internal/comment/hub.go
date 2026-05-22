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
	profile    chan OwnerProfileMessage

	mu      sync.RWMutex
	rooms   map[string]map[*websocket.Conn]string
	viewers map[string]map[string]int
	peaks   map[string]int
}

type PresenceMessage struct {
	Type                     string `json:"type"`
	RoomID                   string `json:"roomId"`
	CurrentViewerCount       int    `json:"currentViewerCount"`
	MaxConcurrentViewerCount int    `json:"maxConcurrentViewerCount"`
}

type subscription struct {
	roomID  string
	subject string
	conn    *websocket.Conn
}

func NewHub() *Hub {
	return &Hub{
		register:   make(chan subscription),
		unregister: make(chan subscription),
		broadcast:  make(chan Message, 256),
		profile:    make(chan OwnerProfileMessage, 32),
		rooms:      map[string]map[*websocket.Conn]string{},
		viewers:    map[string]map[string]int{},
		peaks:      map[string]int{},
	}
}

func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case sub := <-h.register:
			h.mu.Lock()
			count := h.registerSubscription(sub)
			peak := h.updatePeak(sub.roomID, count)
			h.mu.Unlock()
			h.writePresenceToRoom(ctx, sub.roomID, count, peak)
		case sub := <-h.unregister:
			h.mu.Lock()
			count := h.unregisterSubscription(sub)
			peak := h.peaks[sub.roomID]
			h.mu.Unlock()
			h.writePresenceToRoom(ctx, sub.roomID, count, peak)
		case msg := <-h.broadcast:
			h.writeToRoom(ctx, msg)
		case msg := <-h.profile:
			h.writeOwnerProfileToRoom(ctx, msg)
		}
	}
}

func (h *Hub) Register(roomID string, subject string, conn *websocket.Conn) {
	h.register <- subscription{roomID: roomID, subject: subject, conn: conn}
}

func (h *Hub) Unregister(roomID string, conn *websocket.Conn) {
	h.unregister <- subscription{roomID: roomID, conn: conn}
}

func (h *Hub) Broadcast(msg Message) {
	h.broadcast <- msg
}

func (h *Hub) BroadcastOwnerProfile(msg OwnerProfileMessage) {
	h.profile <- msg
}

func (h *Hub) CurrentViewerCount(roomID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.viewers[roomID])
}

func (h *Hub) MaxConcurrentViewerCount(roomID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.peaks[roomID]
}

func (h *Hub) updatePeak(roomID string, currentViewerCount int) int {
	if currentViewerCount > h.peaks[roomID] {
		h.peaks[roomID] = currentViewerCount
	}
	return h.peaks[roomID]
}

func (h *Hub) registerSubscription(sub subscription) int {
	if h.rooms[sub.roomID] == nil {
		h.rooms[sub.roomID] = map[*websocket.Conn]string{}
	}
	if h.viewers[sub.roomID] == nil {
		h.viewers[sub.roomID] = map[string]int{}
	}
	if oldSubject, ok := h.rooms[sub.roomID][sub.conn]; ok {
		h.decrementViewer(sub.roomID, oldSubject)
	}
	h.rooms[sub.roomID][sub.conn] = sub.subject
	h.viewers[sub.roomID][sub.subject]++
	return len(h.viewers[sub.roomID])
}

func (h *Hub) unregisterSubscription(sub subscription) int {
	subject, ok := h.rooms[sub.roomID][sub.conn]
	if !ok {
		return len(h.viewers[sub.roomID])
	}
	delete(h.rooms[sub.roomID], sub.conn)
	if len(h.rooms[sub.roomID]) == 0 {
		delete(h.rooms, sub.roomID)
	}
	h.decrementViewer(sub.roomID, subject)
	return len(h.viewers[sub.roomID])
}

func (h *Hub) decrementViewer(roomID string, subject string) {
	h.viewers[roomID][subject]--
	if h.viewers[roomID][subject] > 0 {
		return
	}
	delete(h.viewers[roomID], subject)
	if len(h.viewers[roomID]) == 0 {
		delete(h.viewers, roomID)
	}
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

func (h *Hub) writePresenceToRoom(ctx context.Context, roomID string, currentViewerCount int, maxConcurrentViewerCount int) {
	h.mu.RLock()
	conns := make([]*websocket.Conn, 0, len(h.rooms[roomID]))
	for conn := range h.rooms[roomID] {
		conns = append(conns, conn)
	}
	h.mu.RUnlock()

	msg := PresenceMessage{
		Type:                     "presence",
		RoomID:                   roomID,
		CurrentViewerCount:       currentViewerCount,
		MaxConcurrentViewerCount: maxConcurrentViewerCount,
	}
	for _, conn := range conns {
		_ = wsjsonWrite(ctx, conn, msg)
	}
}

func (h *Hub) writeOwnerProfileToRoom(ctx context.Context, msg OwnerProfileMessage) {
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
