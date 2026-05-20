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
		ID:              "room-1",
		Title:           "テスト配信",
		OwnerSub:        "owner-1",
		IngestTokenHash: "token-hash",
		CreatedAt:       time.Date(2026, 5, 9, 0, 0, 0, 0, time.UTC),
	}
	if err := db.CreateRoom(ctx, room); err != nil {
		t.Fatalf("CreateRoom returned error: %v", err)
	}

	stored := comment.StoredComment{
		ID:        "comment-1",
		RoomID:    room.ID,
		AuthorSub: "user-1",
		Body:      "こんにちは",
		Direction: comment.DirectionRightToLeft,
		Color:     "#40c4ff",
		FontSize:  comment.FontSizeLarge,
		SentAt:    time.Date(2026, 5, 9, 0, 1, 0, 0, time.UTC),
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
	if err := db.DeleteComment(ctx, stored.ID, room.OwnerSub); err != nil {
		t.Fatalf("DeleteComment returned error: %v", err)
	}
}
