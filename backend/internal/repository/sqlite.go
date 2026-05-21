package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"boke-video/backend/internal/comment"

	modernsqlite "modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

type SQLite struct {
	db *sql.DB
}

type Room struct {
	ID                      string     `json:"id"`
	Title                   string     `json:"title"`
	ThumbnailURL            string     `json:"thumbnailUrl"`
	ThumbnailUpdatedAt      time.Time  `json:"thumbnailUpdatedAt"`
	ThumbnailRefreshSeconds int        `json:"thumbnailRefreshSeconds"`
	StreamStatus            string     `json:"streamStatus"`
	StreamStartedAt         *time.Time `json:"streamStartedAt"`
	StreamLastSeenAt        *time.Time `json:"streamLastSeenAt"`
	StreamEndedAt           *time.Time `json:"streamEndedAt"`
	CreatedAt               time.Time  `json:"createdAt"`
	OwnerSub                string     `json:"-"`
	IngestTokenHash         string     `json:"-"`
}

type RoomStats struct {
	RoomID       string     `json:"roomId"`
	VisitorCount int        `json:"visitorCount"`
	CommentCount int        `json:"commentCount"`
	StreamStatus string     `json:"streamStatus"`
	StartedAt    *time.Time `json:"startedAt"`
	EndedAt      *time.Time `json:"endedAt"`
}

type RoomStreamState struct {
	StreamStatus            string
	StreamStartedAt         *time.Time
	StreamLastSeenAt        *time.Time
	StreamEndedAt           *time.Time
	ThumbnailURL            string
	ThumbnailUpdatedAt      time.Time
	ThumbnailRefreshSeconds int
}

type CommentCursor struct {
	SentAt time.Time
	ID     string
}

var ErrAlreadyExists = errors.New("already exists")
var ErrOwnerRoomLimitExceeded = errors.New("owner room limit exceeded")

func OpenSQLite(path string) (*SQLite, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	return &SQLite{db: db}, nil
}

func (s *SQLite) Close() error {
	return s.db.Close()
}

func (s *SQLite) Migrate(ctx context.Context) error {
	statements := []string{
		`PRAGMA journal_mode = WAL`,
		`PRAGMA foreign_keys = ON`,
		`CREATE TABLE IF NOT EXISTS rooms (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			thumbnail_url TEXT NOT NULL,
			thumbnail_updated_at TEXT NOT NULL,
			thumbnail_refresh_seconds INTEGER NOT NULL,
			stream_status TEXT NOT NULL,
			stream_started_at TEXT,
			stream_last_seen_at TEXT,
			stream_ended_at TEXT,
			owner_sub TEXT NOT NULL DEFAULT '',
			ingest_token_hash TEXT NOT NULL DEFAULT '',
			created_at TEXT NOT NULL
		)`,
		`ALTER TABLE rooms ADD COLUMN thumbnail_url TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE rooms ADD COLUMN thumbnail_updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00Z'`,
		`ALTER TABLE rooms ADD COLUMN thumbnail_refresh_seconds INTEGER NOT NULL DEFAULT 30`,
		`ALTER TABLE rooms ADD COLUMN stream_status TEXT NOT NULL DEFAULT 'waiting'`,
		`ALTER TABLE rooms ADD COLUMN stream_started_at TEXT`,
		`ALTER TABLE rooms ADD COLUMN stream_last_seen_at TEXT`,
		`ALTER TABLE rooms ADD COLUMN stream_ended_at TEXT`,
		`ALTER TABLE rooms ADD COLUMN owner_sub TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE rooms ADD COLUMN ingest_token_hash TEXT NOT NULL DEFAULT ''`,
		`CREATE UNIQUE INDEX IF NOT EXISTS rooms_owner_sub_unique_index
			ON rooms (owner_sub)`,
		`CREATE TABLE IF NOT EXISTS comments (
				id TEXT PRIMARY KEY,
				room_id TEXT NOT NULL,
			author_sub TEXT NOT NULL,
			author_email TEXT NOT NULL,
			author_display_name TEXT NOT NULL,
			body TEXT NOT NULL,
			direction TEXT NOT NULL,
			color TEXT NOT NULL,
			font_size TEXT NOT NULL,
			sent_at TEXT NOT NULL,
			FOREIGN KEY (room_id) REFERENCES rooms (id)
		)`,
		`ALTER TABLE comments ADD COLUMN author_email TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE comments ADD COLUMN author_display_name TEXT NOT NULL DEFAULT ''`,
		`DROP INDEX IF EXISTS comments_room_id_sent_at_index`,
		`CREATE INDEX IF NOT EXISTS comments_room_id_sent_at_index
			ON comments (room_id, sent_at, id)`,
		`CREATE TABLE IF NOT EXISTS room_visits (
			room_id TEXT NOT NULL,
			visitor_sub TEXT NOT NULL,
			first_visited_at TEXT NOT NULL,
			last_visited_at TEXT NOT NULL,
			visit_count INTEGER NOT NULL,
			PRIMARY KEY (room_id, visitor_sub),
			FOREIGN KEY (room_id) REFERENCES rooms (id)
		)`,
		`CREATE INDEX IF NOT EXISTS room_visits_room_id_last_visited_at_index
			ON room_visits (room_id, last_visited_at)`,
	}

	for _, statement := range statements {
		if _, err := s.db.ExecContext(ctx, statement); err != nil {
			if isDuplicateColumnError(err) {
				continue
			}
			return err
		}
	}
	return nil
}

func (s *SQLite) CreateRoom(ctx context.Context, room Room) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO rooms (
			id,
			title,
			thumbnail_url,
			thumbnail_updated_at,
			thumbnail_refresh_seconds,
			stream_status,
			stream_started_at,
			stream_last_seen_at,
			stream_ended_at,
			owner_sub,
			ingest_token_hash,
			created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		room.ID,
		room.Title,
		room.ThumbnailURL,
		room.ThumbnailUpdatedAt.Format(time.RFC3339Nano),
		room.ThumbnailRefreshSeconds,
		room.StreamStatus,
		formatNullableTime(room.StreamStartedAt),
		formatNullableTime(room.StreamLastSeenAt),
		formatNullableTime(room.StreamEndedAt),
		room.OwnerSub,
		room.IngestTokenHash,
		room.CreatedAt.Format(time.RFC3339Nano),
	)
	return normalizeSQLiteError(err)
}

func (s *SQLite) UpdateRoomTitle(ctx context.Context, roomID string, ownerSub string, title string) error {
	result, err := s.db.ExecContext(ctx, `UPDATE rooms SET title = ? WHERE id = ? AND owner_sub = ?`, title, roomID, ownerSub)
	if err != nil {
		return err
	}
	return requireAffected(result)
}

func (s *SQLite) UpdateRoomIngestTokenHash(ctx context.Context, roomID string, ownerSub string, tokenHash string) error {
	result, err := s.db.ExecContext(ctx, `UPDATE rooms SET ingest_token_hash = ? WHERE id = ? AND owner_sub = ?`, tokenHash, roomID, ownerSub)
	if err != nil {
		return err
	}
	return requireAffected(result)
}

func (s *SQLite) UpdateRoomStreamState(ctx context.Context, roomID string, state RoomStreamState) error {
	result, err := s.db.ExecContext(ctx,
		`UPDATE rooms SET
			stream_status = ?,
			stream_started_at = ?,
			stream_last_seen_at = ?,
			stream_ended_at = ?,
			thumbnail_url = ?,
			thumbnail_updated_at = ?,
			thumbnail_refresh_seconds = ?
		 WHERE id = ?`,
		state.StreamStatus,
		formatNullableTime(state.StreamStartedAt),
		formatNullableTime(state.StreamLastSeenAt),
		formatNullableTime(state.StreamEndedAt),
		state.ThumbnailURL,
		state.ThumbnailUpdatedAt.Format(time.RFC3339Nano),
		state.ThumbnailRefreshSeconds,
		roomID,
	)
	if err != nil {
		return err
	}
	return requireAffected(result)
}

func (s *SQLite) DeleteRoom(ctx context.Context, roomID string, ownerSub string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `DELETE FROM comments WHERE room_id IN (SELECT id FROM rooms WHERE id = ? AND owner_sub = ?)`, roomID, ownerSub); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM room_visits WHERE room_id IN (SELECT id FROM rooms WHERE id = ? AND owner_sub = ?)`, roomID, ownerSub); err != nil {
		return err
	}
	result, err := tx.ExecContext(ctx, `DELETE FROM rooms WHERE id = ? AND owner_sub = ?`, roomID, ownerSub)
	if err != nil {
		return err
	}
	if err := requireAffected(result); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *SQLite) GetRoom(ctx context.Context, roomID string) (Room, error) {
	row := s.db.QueryRowContext(ctx, roomSelectSQL(`WHERE id = ?`), roomID)
	return scanRoom(row)
}

func (s *SQLite) ListRooms(ctx context.Context) ([]Room, error) {
	rows, err := s.db.QueryContext(ctx, roomSelectSQL(`ORDER BY created_at DESC`))
	return scanRooms(rows, err)
}

func (s *SQLite) ListPublicRooms(ctx context.Context) ([]Room, error) {
	rows, err := s.db.QueryContext(ctx, roomSelectSQL(`WHERE stream_status = 'live' ORDER BY stream_started_at DESC, created_at DESC`))
	return scanRooms(rows, err)
}

func (s *SQLite) ListRoomsByOwner(ctx context.Context, ownerSub string) ([]Room, error) {
	rows, err := s.db.QueryContext(ctx, roomSelectSQL(`WHERE owner_sub = ? ORDER BY created_at DESC`), ownerSub)
	return scanRooms(rows, err)
}

func scanRooms(rows *sql.Rows, err error) ([]Room, error) {
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rooms := []Room{}
	for rows.Next() {
		room, err := scanRoom(rows)
		if err != nil {
			return nil, err
		}
		rooms = append(rooms, room)
	}
	return rooms, rows.Err()
}

func (s *SQLite) CreateComment(ctx context.Context, stored comment.StoredComment) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO comments (id, room_id, author_sub, author_email, author_display_name, body, direction, color, font_size, sent_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		stored.ID,
		stored.RoomID,
		stored.AuthorSub,
		stored.AuthorEmail,
		stored.AuthorDisplayName,
		stored.Body,
		string(stored.Direction),
		stored.Color,
		string(stored.FontSize),
		stored.SentAt.Format(time.RFC3339Nano),
	)
	return normalizeSQLiteError(err)
}

func (s *SQLite) ListComments(ctx context.Context, roomID string, limit int, before *CommentCursor) ([]comment.StoredComment, error) {
	args := []any{roomID}
	cursorClause := ""
	if before != nil {
		cursorClause = " AND (sent_at < ? OR (sent_at = ? AND id < ?))"
		sentAt := before.SentAt.Format(time.RFC3339Nano)
		args = append(args, sentAt, sentAt, before.ID)
	}
	args = append(args, limit)
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, room_id, author_sub, author_email, author_display_name, body, direction, color, font_size, sent_at
		 FROM comments
		 WHERE room_id = ?`+cursorClause+`
		 ORDER BY sent_at DESC, id DESC
		 LIMIT ?`,
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	comments := []comment.StoredComment{}
	for rows.Next() {
		stored, err := scanComment(rows)
		if err != nil {
			return nil, err
		}
		comments = append(comments, stored)
	}
	return comments, rows.Err()
}

func (s *SQLite) DeleteComment(ctx context.Context, commentID string, ownerSub string) error {
	result, err := s.db.ExecContext(ctx,
		`DELETE FROM comments
		 WHERE id = ?
		 AND room_id IN (SELECT id FROM rooms WHERE owner_sub = ?)`,
		commentID,
		ownerSub,
	)
	if err != nil {
		return err
	}
	return requireAffected(result)
}

func (s *SQLite) RecordRoomVisit(ctx context.Context, roomID string, visitorSub string, visitedAt time.Time) error {
	if _, err := s.GetRoom(ctx, roomID); err != nil {
		return err
	}
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO room_visits (room_id, visitor_sub, first_visited_at, last_visited_at, visit_count)
		 VALUES (?, ?, ?, ?, 1)
		 ON CONFLICT (room_id, visitor_sub) DO UPDATE SET
			last_visited_at = excluded.last_visited_at,
			visit_count = room_visits.visit_count + 1`,
		roomID,
		visitorSub,
		visitedAt.Format(time.RFC3339Nano),
		visitedAt.Format(time.RFC3339Nano),
	)
	return normalizeSQLiteError(err)
}

func (s *SQLite) GetRoomStats(ctx context.Context, roomID string) (RoomStats, error) {
	row := s.db.QueryRowContext(ctx,
		`SELECT
			rooms.id,
			rooms.stream_status,
			rooms.stream_started_at,
			rooms.stream_ended_at,
			COUNT(DISTINCT room_visits.visitor_sub),
			COUNT(DISTINCT comments.id)
		 FROM rooms
		 LEFT JOIN room_visits ON room_visits.room_id = rooms.id
		 LEFT JOIN comments ON comments.room_id = rooms.id
		 WHERE rooms.id = ?
		 GROUP BY rooms.id, rooms.stream_status, rooms.stream_started_at, rooms.stream_ended_at`,
		roomID,
	)
	var stats RoomStats
	var startedAt sql.NullString
	var endedAt sql.NullString
	if err := row.Scan(&stats.RoomID, &stats.StreamStatus, &startedAt, &endedAt, &stats.VisitorCount, &stats.CommentCount); err != nil {
		return RoomStats{}, err
	}
	parsedStartedAt, err := parseNullableTime(startedAt)
	if err != nil {
		return RoomStats{}, err
	}
	parsedEndedAt, err := parseNullableTime(endedAt)
	if err != nil {
		return RoomStats{}, err
	}
	stats.StartedAt = parsedStartedAt
	stats.EndedAt = parsedEndedAt
	return stats, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanRoom(scanner rowScanner) (Room, error) {
	var room Room
	var createdAt string
	var thumbnailUpdatedAt string
	var streamStartedAt sql.NullString
	var streamLastSeenAt sql.NullString
	var streamEndedAt sql.NullString
	if err := scanner.Scan(&room.ID, &room.Title, &room.ThumbnailURL, &thumbnailUpdatedAt, &room.ThumbnailRefreshSeconds, &room.StreamStatus, &streamStartedAt, &streamLastSeenAt, &streamEndedAt, &room.OwnerSub, &room.IngestTokenHash, &createdAt); err != nil {
		return Room{}, err
	}
	parsedThumbnailUpdatedAt, err := time.Parse(time.RFC3339Nano, thumbnailUpdatedAt)
	if err != nil {
		return Room{}, err
	}
	parsedAt, err := time.Parse(time.RFC3339Nano, createdAt)
	if err != nil {
		return Room{}, err
	}
	parsedStreamStartedAt, err := parseNullableTime(streamStartedAt)
	if err != nil {
		return Room{}, err
	}
	parsedStreamLastSeenAt, err := parseNullableTime(streamLastSeenAt)
	if err != nil {
		return Room{}, err
	}
	parsedStreamEndedAt, err := parseNullableTime(streamEndedAt)
	if err != nil {
		return Room{}, err
	}
	room.ThumbnailUpdatedAt = parsedThumbnailUpdatedAt
	room.StreamStartedAt = parsedStreamStartedAt
	room.StreamLastSeenAt = parsedStreamLastSeenAt
	room.StreamEndedAt = parsedStreamEndedAt
	room.CreatedAt = parsedAt
	return room, nil
}

func roomSelectSQL(suffix string) string {
	return `SELECT
		id,
		title,
		thumbnail_url,
		thumbnail_updated_at,
		thumbnail_refresh_seconds,
		stream_status,
		stream_started_at,
		stream_last_seen_at,
		stream_ended_at,
		owner_sub,
		ingest_token_hash,
		created_at
	 FROM rooms ` + suffix
}

func formatNullableTime(value *time.Time) any {
	if value == nil {
		return nil
	}
	return value.UTC().Format(time.RFC3339Nano)
}

func parseNullableTime(value sql.NullString) (*time.Time, error) {
	if !value.Valid || strings.TrimSpace(value.String) == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339Nano, value.String)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func scanComment(scanner rowScanner) (comment.StoredComment, error) {
	var stored comment.StoredComment
	var sentAt string
	if err := scanner.Scan(&stored.ID, &stored.RoomID, &stored.AuthorSub, &stored.AuthorEmail, &stored.AuthorDisplayName, &stored.Body, &stored.Direction, &stored.Color, &stored.FontSize, &sentAt); err != nil {
		return comment.StoredComment{}, err
	}
	parsedAt, err := time.Parse(time.RFC3339Nano, sentAt)
	if err != nil {
		return comment.StoredComment{}, err
	}
	stored.SentAt = parsedAt
	return stored, nil
}

func requireAffected(result sql.Result) error {
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func isDuplicateColumnError(err error) bool {
	var sqliteErr *modernsqlite.Error
	return errors.As(err, &sqliteErr) && sqliteErr.Code() == sqlite3.SQLITE_ERROR && strings.Contains(sqliteErr.Error(), "duplicate column name:")
}

func normalizeSQLiteError(err error) error {
	if err == nil {
		return nil
	}
	var sqliteErr *modernsqlite.Error
	if errors.As(err, &sqliteErr) {
		switch sqliteErr.Code() {
		case sqlite3.SQLITE_CONSTRAINT_PRIMARYKEY, sqlite3.SQLITE_CONSTRAINT_UNIQUE:
			if isOwnerRoomLimitError(sqliteErr.Error()) {
				return ErrOwnerRoomLimitExceeded
			}
			return ErrAlreadyExists
		}
	}
	return err
}

func isOwnerRoomLimitError(message string) bool {
	return strings.Contains(message, "rooms.owner_sub") || strings.Contains(message, "rooms_owner_sub_unique_index")
}
