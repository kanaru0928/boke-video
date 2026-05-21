package httpapi

import (
	"context"
	"database/sql"
	"net/url"
	"time"

	"boke-video/backend/internal/repository"
	"boke-video/backend/internal/streammonitor"
)

type streamMonitor interface {
	ListStreams(ctx context.Context) (map[string]streammonitor.StreamSnapshot, error)
	PlaybackPlaylists(ctx context.Context, streamName string) ([]streammonitor.PlaybackPlaylist, error)
	FetchThumbnail(ctx context.Context, streamName string) (streammonitor.Thumbnail, error)
}

func (s *Server) reconcileRooms(ctx context.Context, rooms []repository.Room) ([]repository.Room, error) {
	if s.streamMonitor == nil {
		return rooms, nil
	}
	snapshots, err := s.streamMonitor.ListStreams(ctx)
	if err != nil {
		s.logger.Warn("list streams", "error", err)
		return rooms, nil
	}
	reconciled := make([]repository.Room, 0, len(rooms))
	for _, room := range rooms {
		updatedRoom, exists, err := s.reconcileRoomWithSnapshot(ctx, room, snapshots[room.ID])
		if err != nil {
			return nil, err
		}
		if !exists {
			continue
		}
		reconciled = append(reconciled, updatedRoom)
	}
	return reconciled, nil
}

func (s *Server) reconcileRoom(ctx context.Context, room repository.Room) (repository.Room, error) {
	if s.streamMonitor == nil {
		return room, nil
	}
	snapshots, err := s.streamMonitor.ListStreams(ctx)
	if err != nil {
		s.logger.Warn("list streams", "error", err)
		return room, nil
	}
	updatedRoom, exists, err := s.reconcileRoomWithSnapshot(ctx, room, snapshots[room.ID])
	if err != nil {
		return repository.Room{}, err
	}
	if !exists {
		return repository.Room{}, sql.ErrNoRows
	}
	return updatedRoom, nil
}

func (s *Server) reconcileRoomWithSnapshot(ctx context.Context, room repository.Room, snapshot streammonitor.StreamSnapshot) (repository.Room, bool, error) {
	now := s.now().UTC()
	nextState := repository.RoomStreamState{
		StreamStatus:            room.StreamStatus,
		StreamStartedAt:         room.StreamStartedAt,
		StreamLastSeenAt:        room.StreamLastSeenAt,
		StreamEndedAt:           room.StreamEndedAt,
		ThumbnailURL:            room.ThumbnailURL,
		ThumbnailUpdatedAt:      room.ThumbnailUpdatedAt,
		ThumbnailRefreshSeconds: room.ThumbnailRefreshSeconds,
	}

	if snapshot.Active {
		startedAt := now
		if room.StreamStartedAt != nil {
			startedAt = room.StreamStartedAt.UTC()
		} else if snapshot.StartedAt != nil {
			startedAt = snapshot.StartedAt.UTC()
		}
		nextState.StreamStatus = "live"
		nextState.StreamStartedAt = &startedAt
		nextState.StreamLastSeenAt = &now
		nextState.StreamEndedAt = nil
		nextState.ThumbnailURL = thumbnailEndpoint(room.ID)
		if shouldRefreshThumbnailTimestamp(room, now) {
			nextState.ThumbnailUpdatedAt = now
		}
		nextState.ThumbnailRefreshSeconds = roomThumbnailRefreshSeconds
	} else if room.StreamStatus == "live" {
		lastSeenAt := now
		if room.StreamLastSeenAt != nil {
			lastSeenAt = room.StreamLastSeenAt.UTC()
		}
		if now.Sub(lastSeenAt) > s.streamEndGrace {
			if err := s.repository.DeleteRoomByID(ctx, room.ID); err != nil {
				return repository.Room{}, false, err
			}
			return repository.Room{}, false, nil
		}
	}

	if !roomStreamStateChanged(room, nextState) {
		return room, true, nil
	}
	if err := s.repository.UpdateRoomStreamState(ctx, room.ID, nextState); err != nil {
		return repository.Room{}, false, err
	}
	updated, err := s.repository.GetRoom(ctx, room.ID)
	if err != nil {
		return repository.Room{}, false, err
	}
	return updated, true, nil
}

func thumbnailEndpoint(roomID string) string {
	return "/api/rooms/" + url.PathEscape(roomID) + "/thumbnail"
}

func roomStreamStateChanged(room repository.Room, state repository.RoomStreamState) bool {
	return room.StreamStatus != state.StreamStatus ||
		!timePointersEqual(room.StreamStartedAt, state.StreamStartedAt) ||
		!timePointersEqual(room.StreamLastSeenAt, state.StreamLastSeenAt) ||
		!timePointersEqual(room.StreamEndedAt, state.StreamEndedAt) ||
		room.ThumbnailURL != state.ThumbnailURL ||
		!room.ThumbnailUpdatedAt.Equal(state.ThumbnailUpdatedAt) ||
		room.ThumbnailRefreshSeconds != state.ThumbnailRefreshSeconds
}

func timePointersEqual(left *time.Time, right *time.Time) bool {
	if left == nil || right == nil {
		return left == nil && right == nil
	}
	return left.Equal(*right)
}
