package httpapi

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"boke-video/backend/internal/access"
	"boke-video/backend/internal/comment"
	"boke-video/backend/internal/repository"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

const commentPageSize = 100

func (s *Server) handleListComments(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePrincipal(w, r); !ok {
		return
	}
	roomID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/rooms/"), "/comments")
	cursor, err := decodeCommentCursor(r.URL.Query().Get("cursor"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid cursor")
		return
	}

	storedComments, err := s.repository.ListComments(r.Context(), roomID, commentPageSize+1, cursor)
	if err != nil {
		s.writeServerError(w, err)
		return
	}
	hasMore := len(storedComments) > commentPageSize
	if hasMore {
		storedComments = storedComments[:commentPageSize]
	}

	messages := make([]comment.Message, 0, len(storedComments))
	for i := len(storedComments) - 1; i >= 0; i-- {
		messages = append(messages, storedToMessage(storedComments[i]))
	}
	nextCursor := ""
	if hasMore && len(storedComments) > 0 {
		nextCursor, err = encodeCommentCursor(storedComments[len(storedComments)-1])
		if err != nil {
			s.writeServerError(w, err)
			return
		}
	}
	writeJSON(w, http.StatusOK, commentPageResponse{
		Comments:   messages,
		NextCursor: nextCursor,
	})
}

func (s *Server) handleCreateComment(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requirePrincipal(w, r)
	if !ok {
		return
	}
	if !s.limiter.Allow(principal.Subject) {
		writeError(w, http.StatusTooManyRequests, "rate limited")
		return
	}

	roomID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/rooms/"), "/comments")
	msg, err := s.createComment(r.Context(), roomID, principal, r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	s.commentHub.Broadcast(msg)
	writeJSON(w, http.StatusCreated, msg)
}

func (s *Server) handleCommentWebSocket(w http.ResponseWriter, r *http.Request) {
	principal, ok := s.requirePrincipal(w, r)
	if !ok {
		return
	}
	roomID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/ws/rooms/"), "/comments")

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: s.allowedOrigins,
	})
	if err != nil {
		s.logger.Warn("accept websocket", "error", err)
		return
	}
	defer conn.Close(websocket.StatusNormalClosure, "")

	s.commentHub.Register(roomID, conn)
	defer s.commentHub.Unregister(roomID, conn)

	for {
		var req comment.CreateRequest
		if err := wsjson.Read(r.Context(), conn, &req); err != nil {
			return
		}
		if !s.limiter.Allow(principal.Subject) {
			_ = wsjson.Write(r.Context(), conn, map[string]string{"type": "error", "message": "rate limited"})
			continue
		}
		msg, err := s.createCommentFromRequest(r.Context(), roomID, principal, req)
		if err != nil {
			_ = wsjson.Write(r.Context(), conn, map[string]string{"type": "error", "message": err.Error()})
			continue
		}
		s.commentHub.Broadcast(msg)
	}
}

func (s *Server) createComment(ctx context.Context, roomID string, principal access.Principal, r *http.Request) (comment.Message, error) {
	var req comment.CreateRequest
	if err := decodeJSON(r, &req); err != nil {
		return comment.Message{}, err
	}
	return s.createCommentFromRequest(ctx, roomID, principal, req)
}

func (s *Server) createCommentFromRequest(ctx context.Context, roomID string, principal access.Principal, req comment.CreateRequest) (comment.Message, error) {
	validReq, err := comment.ValidateCreateRequest(req)
	if err != nil {
		return comment.Message{}, err
	}
	if _, err := s.repository.GetRoom(ctx, roomID); err != nil {
		return comment.Message{}, err
	}
	profile, err := s.repository.GetUserProfile(ctx, principal.Subject)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return comment.Message{}, errors.New("display name is required")
		}
		return comment.Message{}, err
	}
	if profile.DisplayName == "" {
		return comment.Message{}, errors.New("display name is required")
	}

	now := s.now().UTC()
	stored := comment.StoredComment{
		ID:                newID(),
		RoomID:            roomID,
		AuthorSub:         principal.Subject,
		AuthorDisplayName: profile.DisplayName,
		Body:              validReq.Body,
		Direction:         validReq.Direction,
		Color:             validReq.Color,
		FontSize:          validReq.FontSize,
		SentAt:            now,
	}
	if err := s.repository.CreateComment(ctx, stored); err != nil {
		return comment.Message{}, err
	}

	return storedToMessage(stored), nil
}

func storedToMessage(stored comment.StoredComment) comment.Message {
	return comment.Message{
		Type:      "comment",
		RoomID:    stored.RoomID,
		CommentID: stored.ID,
		Author: comment.Author{
			Subject:     stored.AuthorSub,
			DisplayName: stored.AuthorDisplayName,
		},
		Body:      stored.Body,
		Direction: stored.Direction,
		Color:     stored.Color,
		FontSize:  stored.FontSize,
		SentAt:    stored.SentAt,
	}
}

type commentCursorPayload struct {
	SentAt string `json:"sentAt"`
	ID     string `json:"id"`
}

type commentPageResponse struct {
	Comments   []comment.Message `json:"comments"`
	NextCursor string            `json:"nextCursor"`
}

func decodeCommentCursor(rawValue string) (*repository.CommentCursor, error) {
	if rawValue == "" {
		return nil, nil
	}
	rawJSON, err := base64.RawURLEncoding.DecodeString(rawValue)
	if err != nil {
		return nil, err
	}
	var payload commentCursorPayload
	if err := json.Unmarshal(rawJSON, &payload); err != nil {
		return nil, err
	}
	sentAt, err := time.Parse(time.RFC3339Nano, payload.SentAt)
	if err != nil {
		return nil, err
	}
	if payload.ID == "" {
		return nil, errors.New("cursor id is empty")
	}
	return &repository.CommentCursor{
		SentAt: sentAt,
		ID:     payload.ID,
	}, nil
}

func encodeCommentCursor(stored comment.StoredComment) (string, error) {
	rawJSON, err := json.Marshal(commentCursorPayload{
		SentAt: stored.SentAt.Format(time.RFC3339Nano),
		ID:     stored.ID,
	})
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(rawJSON), nil
}
