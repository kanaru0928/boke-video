package repository

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"boke-video/backend/internal/comment"
)

func TestSQLiteStoresRoomAndComment(t *testing.T) {
	ctx := context.Background()
	db, err := OpenSQLite(filepath.Join(t.TempDir(), "test.sqlite3"))
	if err != nil {
		t.Fatalf("OpenSQLite returned error: %v", err)
	}
	defer db.Close()

	if err := db.Migrate(ctx); err != nil {
		t.Fatalf("Migrate returned error: %v", err)
	}

	room := Room{
		ID:                      "room-1",
		Title:                   "テスト配信",
		ThumbnailURL:            "",
		ThumbnailUpdatedAt:      time.Date(2026, 5, 9, 0, 0, 0, 0, time.UTC),
		ThumbnailRefreshSeconds: 15,
		StreamStatus:            "waiting",
		OwnerSub:                "owner-1",
		IngestTokenHash:         "token-hash",
		CreatedAt:               time.Date(2026, 5, 9, 0, 0, 0, 0, time.UTC),
	}
	if err := db.CreateRoom(ctx, room); err != nil {
		t.Fatalf("CreateRoom returned error: %v", err)
	}

	stored := comment.StoredComment{
		ID:                "comment-1",
		RoomID:            room.ID,
		AuthorSub:         "user-1",
		AuthorEmail:       "user-1@example.test",
		AuthorDisplayName: "user-1",
		Body:              "こんにちは",
		Direction:         comment.DirectionRightToLeft,
		Color:             "#40c4ff",
		FontSize:          comment.FontSizeLarge,
		SentAt:            time.Date(2026, 5, 9, 0, 1, 0, 0, time.UTC),
	}
	if err := db.CreateComment(ctx, stored); err != nil {
		t.Fatalf("CreateComment returned error: %v", err)
	}

	comments, err := db.ListComments(ctx, room.ID, 10)
	if err != nil {
		t.Fatalf("ListComments returned error: %v", err)
	}
	if len(comments) != 1 {
		t.Fatalf("len(comments) = %d", len(comments))
	}
	if comments[0].Body != stored.Body {
		t.Fatalf("comment body = %q", comments[0].Body)
	}
	if comments[0].AuthorSub != stored.AuthorSub {
		t.Fatalf("comment author sub = %q", comments[0].AuthorSub)
	}
	if comments[0].AuthorEmail != stored.AuthorEmail {
		t.Fatalf("comment author email = %q", comments[0].AuthorEmail)
	}
	if comments[0].AuthorDisplayName != stored.AuthorDisplayName {
		t.Fatalf("comment author display name = %q", comments[0].AuthorDisplayName)
	}
	if comments[0].Color != stored.Color {
		t.Fatalf("comment color = %q", comments[0].Color)
	}
	if comments[0].FontSize != stored.FontSize {
		t.Fatalf("comment font size = %q", comments[0].FontSize)
	}

	if err := db.UpdateRoomTitle(ctx, room.ID, "owner-2", "別タイトル"); err == nil {
		t.Fatal("UpdateRoomTitle accepted another owner")
	}
	if err := db.DeleteComment(ctx, stored.ID, "owner-2"); err == nil {
		t.Fatal("DeleteComment accepted another owner")
	}

	visitedAt := time.Date(2026, 5, 9, 0, 2, 0, 0, time.UTC)
	if err := db.RecordRoomVisit(ctx, room.ID, "user-1", visitedAt); err != nil {
		t.Fatalf("RecordRoomVisit returned error: %v", err)
	}
	if err := db.RecordRoomVisit(ctx, room.ID, "user-1", visitedAt.Add(time.Minute)); err != nil {
		t.Fatalf("RecordRoomVisit returned error: %v", err)
	}
	if err := db.RecordRoomVisit(ctx, room.ID, "user-2", visitedAt.Add(2*time.Minute)); err != nil {
		t.Fatalf("RecordRoomVisit returned error: %v", err)
	}

	stats, err := db.GetRoomStats(ctx, room.ID)
	if err != nil {
		t.Fatalf("GetRoomStats returned error: %v", err)
	}
	if stats.RoomID != room.ID {
		t.Fatalf("stats.RoomID = %q", stats.RoomID)
	}
	if stats.VisitorCount != 2 {
		t.Fatalf("stats.VisitorCount = %d", stats.VisitorCount)
	}
	if stats.CommentCount != 1 {
		t.Fatalf("stats.CommentCount = %d", stats.CommentCount)
	}
	if stats.StartedAt != nil {
		t.Fatalf("stats.StartedAt = %v", stats.StartedAt)
	}

	streamStartedAt := time.Date(2026, 5, 9, 0, 3, 0, 0, time.UTC)
	streamLastSeenAt := time.Date(2026, 5, 9, 0, 4, 0, 0, time.UTC)
	if err := db.UpdateRoomStreamState(ctx, room.ID, RoomStreamState{
		StreamStatus:            "live",
		StreamStartedAt:         &streamStartedAt,
		StreamLastSeenAt:        &streamLastSeenAt,
		StreamEndedAt:           nil,
		ThumbnailURL:            "/api/rooms/room-1/thumbnail",
		ThumbnailUpdatedAt:      streamLastSeenAt,
		ThumbnailRefreshSeconds: 15,
	}); err != nil {
		t.Fatalf("UpdateRoomStreamState returned error: %v", err)
	}
	liveRooms, err := db.ListPublicRooms(ctx)
	if err != nil {
		t.Fatalf("ListPublicRooms returned error: %v", err)
	}
	if len(liveRooms) != 1 {
		t.Fatalf("len(liveRooms) = %d", len(liveRooms))
	}
	liveStats, err := db.GetRoomStats(ctx, room.ID)
	if err != nil {
		t.Fatalf("GetRoomStats returned error: %v", err)
	}
	if liveStats.StreamStatus != "live" {
		t.Fatalf("liveStats.StreamStatus = %q", liveStats.StreamStatus)
	}
	if liveStats.StartedAt == nil || !liveStats.StartedAt.Equal(streamStartedAt) {
		t.Fatalf("liveStats.StartedAt = %v", liveStats.StartedAt)
	}

	if err := db.DeleteComment(ctx, stored.ID, room.OwnerSub); err != nil {
		t.Fatalf("DeleteComment returned error: %v", err)
	}
}

func TestSQLiteAllowsOneRoomPerOwner(t *testing.T) {
	ctx := context.Background()
	db, err := OpenSQLite(filepath.Join(t.TempDir(), "test.sqlite3"))
	if err != nil {
		t.Fatalf("OpenSQLite returned error: %v", err)
	}
	defer db.Close()

	if err := db.Migrate(ctx); err != nil {
		t.Fatalf("Migrate returned error: %v", err)
	}

	firstRoom := testRoom("room-1", "owner-1")
	if err := db.CreateRoom(ctx, firstRoom); err != nil {
		t.Fatalf("CreateRoom returned error: %v", err)
	}
	secondRoom := testRoom("room-2", "owner-1")
	if err := db.CreateRoom(ctx, secondRoom); err != ErrOwnerRoomLimitExceeded {
		t.Fatalf("CreateRoom error = %v", err)
	}
	otherOwnerRoom := testRoom("room-3", "owner-2")
	if err := db.CreateRoom(ctx, otherOwnerRoom); err != nil {
		t.Fatalf("CreateRoom for another owner returned error: %v", err)
	}

	if err := db.DeleteRoom(ctx, firstRoom.ID, firstRoom.OwnerSub); err != nil {
		t.Fatalf("DeleteRoom returned error: %v", err)
	}
	if err := db.CreateRoom(ctx, secondRoom); err != nil {
		t.Fatalf("CreateRoom after delete returned error: %v", err)
	}
}

func testRoom(roomID string, ownerSub string) Room {
	return Room{
		ID:                      roomID,
		Title:                   "テスト配信",
		ThumbnailURL:            "",
		ThumbnailUpdatedAt:      time.Date(2026, 5, 9, 0, 0, 0, 0, time.UTC),
		ThumbnailRefreshSeconds: 15,
		StreamStatus:            "waiting",
		OwnerSub:                ownerSub,
		IngestTokenHash:         "token-hash",
		CreatedAt:               time.Date(2026, 5, 9, 0, 0, 0, 0, time.UTC),
	}
}
