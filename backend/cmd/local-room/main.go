package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"
	"time"

	"boke-video/backend/internal/ingestauth"
	"boke-video/backend/internal/repository"
)

var roomIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{1,80}$`)

func main() {
	if len(os.Args) != 4 {
		log.Fatal("usage: local-room <database-path> <room-id> <room-title>")
	}

	databasePath := os.Args[1]
	roomID := strings.TrimSpace(os.Args[2])
	roomTitle := strings.TrimSpace(os.Args[3])
	if !roomIDPattern.MatchString(roomID) {
		log.Fatal("room id must be 1 to 80 URL-safe characters")
	}
	if roomTitle == "" || len([]rune(roomTitle)) > 80 {
		log.Fatal("title must be 1 to 80 characters")
	}

	ctx := context.Background()
	db, err := repository.OpenSQLite(databasePath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err := db.Migrate(ctx); err != nil {
		log.Fatal(err)
	}

	if _, err := db.GetRoom(ctx, roomID); err == nil {
		fmt.Print(roomID)
		return
	} else if err != sql.ErrNoRows {
		log.Fatal(err)
	}

	ingestToken, err := ingestauth.NewToken()
	if err != nil {
		log.Fatal(err)
	}
	now := time.Now().UTC()
	err = db.CreateRoom(ctx, repository.Room{
		ID:                      roomID,
		Title:                   roomTitle,
		ThumbnailURL:            "n/a",
		ThumbnailUpdatedAt:      now,
		ThumbnailRefreshSeconds: 30,
		OwnerSub:                "local-dev",
		IngestTokenHash:         ingestauth.HashToken(ingestToken),
		CreatedAt:               now,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%s %s", roomID, ingestToken)
}
