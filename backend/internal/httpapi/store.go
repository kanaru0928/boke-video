package httpapi

import (
	"context"
	"time"

	"boke-video/backend/internal/comment"
	"boke-video/backend/internal/repository"
	"boke-video/backend/internal/streammonitor"
)

type repositoryStore interface {
	CreateComment(ctx context.Context, stored comment.StoredComment) error
	CreateRoom(ctx context.Context, room repository.Room) error
	DeleteComment(ctx context.Context, commentID string, ownerSub string) error
	DeleteRoom(ctx context.Context, roomID string, ownerSub string) error
	DeleteRoomByID(ctx context.Context, roomID string) error
	GetRoom(ctx context.Context, roomID string) (repository.Room, error)
	GetRoomStats(ctx context.Context, roomID string) (repository.RoomStats, error)
	GetUserProfile(ctx context.Context, subject string) (repository.UserProfile, error)
	ListComments(ctx context.Context, roomID string, limit int, before *repository.CommentCursor) ([]comment.StoredComment, error)
	ListPublicRooms(ctx context.Context) ([]repository.Room, error)
	ListRooms(ctx context.Context) ([]repository.Room, error)
	ListRoomsByOwner(ctx context.Context, ownerSub string) ([]repository.Room, error)
	RecordRoomVisit(ctx context.Context, roomID string, visitorSub string, visitedAt time.Time) error
	UpdateRoomBypassToken(ctx context.Context, roomID string, ownerSub string, tokenHash string) error
	UpdateRoomIngestTokenHash(ctx context.Context, roomID string, ownerSub string, tokenHash string) error
	UpdateRoomPassword(ctx context.Context, roomID string, ownerSub string, saltAndHash string) error
	UpdateRoomStreamState(ctx context.Context, roomID string, state repository.RoomStreamState) error
	UpdateRoomTitle(ctx context.Context, roomID string, ownerSub string, title string) error
	UpsertUserProfile(ctx context.Context, profile repository.UserProfile) error
}

type streamMonitor interface {
	ListStreams(ctx context.Context) (map[string]streammonitor.StreamSnapshot, error)
	PlaybackPlaylists(ctx context.Context, streamName string) ([]streammonitor.PlaybackPlaylist, error)
	FetchThumbnail(ctx context.Context, streamName string) (streammonitor.Thumbnail, error)
}
