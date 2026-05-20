package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"boke-video/backend/internal/comment"

	modernsqlite "modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

type SQLite struct {
	db *sql.DB
}

type Room struct {
	ID                      string    `json:"id"`
	Title                   string    `json:"title"`
	ThumbnailURL            string    `json:"thumbnailUrl"`
	ThumbnailUpdatedAt      time.Time `json:"thumbnailUpdatedAt"`
	ThumbnailRefreshSeconds int       `json:"thumbnailRefreshSeconds"`
	CreatedAt               time.Time `json:"createdAt"`
}

type RoomStats struct {
	RoomID       string    `json:"roomId"`
	VisitorCount int       `json:"visitorCount"`
	CommentCount int       `json:"commentCount"`
	StartedAt    time.Time `json:"startedAt"`
}

var ErrAlreadyExists = errors.New("already exists")

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
			created_at TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS comments (
			id TEXT PRIMARY KEY,
			room_id TEXT NOT NULL,
			author_sub TEXT NOT NULL,
			body TEXT NOT NULL,
			direction TEXT NOT NULL,
			color TEXT NOT NULL,
			font_size TEXT NOT NULL,
			sent_at TEXT NOT NULL,
			FOREIGN KEY (room_id) REFERENCES rooms (id)
		)`,
		`CREATE INDEX IF NOT EXISTS comments_room_id_sent_at_index
			ON comments (room_id, sent_at)`,
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
			return err
		}
	}
	return nil
}

func (s *SQLite) CreateRoom(ctx context.Context, room Room) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO rooms (id, title, thumbnail_url, thumbnail_updated_at, thumbnail_refresh_seconds, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		room.ID,
		room.Title,
		room.ThumbnailURL,
		room.ThumbnailUpdatedAt.Format(time.RFC3339Nano),
		room.ThumbnailRefreshSeconds,
		room.CreatedAt.Format(time.RFC3339Nano),
	)
	return normalizeSQLiteError(err)
}

func (s *SQLite) UpdateRoomTitle(ctx context.Context, roomID string, title string) error {
	result, err := s.db.ExecContext(ctx, `UPDATE rooms SET title = ? WHERE id = ?`, title, roomID)
	if err != nil {
		return err
	}
	return requireAffected(result)
}

func (s *SQLite) GetRoom(ctx context.Context, roomID string) (Room, error) {
	row := s.db.QueryRowContext(ctx, `SELECT id, title, thumbnail_url, thumbnail_updated_at, thumbnail_refresh_seconds, created_at FROM rooms WHERE id = ?`, roomID)
	return scanRoom(row)
}

func (s *SQLite) ListRooms(ctx context.Context) ([]Room, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, title, thumbnail_url, thumbnail_updated_at, thumbnail_refresh_seconds, created_at FROM rooms ORDER BY created_at DESC`)
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
		`INSERT INTO comments (id, room_id, author_sub, body, direction, color, font_size, sent_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		stored.ID,
		stored.RoomID,
		stored.AuthorSub,
		stored.Body,
		string(stored.Direction),
		stored.Color,
		string(stored.FontSize),
		stored.SentAt.Format(time.RFC3339Nano),
	)
	return normalizeSQLiteError(err)
}

func (s *SQLite) ListComments(ctx context.Context, roomID string, limit int) ([]comment.StoredComment, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, room_id, author_sub, body, direction, color, font_size, sent_at
		 FROM comments
		 WHERE room_id = ?
		 ORDER BY sent_at DESC
		 LIMIT ?`,
		roomID,
		limit,
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

func (s *SQLite) DeleteComment(ctx context.Context, commentID string) error {
	result, err := s.db.ExecContext(ctx, `DELETE FROM comments WHERE id = ?`, commentID)
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
			rooms.created_at,
			COUNT(room_visits.visitor_sub),
			COUNT(DISTINCT comments.id)
		 FROM rooms
		 LEFT JOIN room_visits ON room_visits.room_id = rooms.id
		 LEFT JOIN comments ON comments.room_id = rooms.id
		 WHERE rooms.id = ?
		 GROUP BY rooms.id, rooms.created_at`,
		roomID,
	)
	var stats RoomStats
	var startedAt string
	if err := row.Scan(&stats.RoomID, &startedAt, &stats.VisitorCount, &stats.CommentCount); err != nil {
		return RoomStats{}, err
	}
	parsedAt, err := time.Parse(time.RFC3339Nano, startedAt)
	if err != nil {
		return RoomStats{}, err
	}
	stats.StartedAt = parsedAt
	return stats, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanRoom(scanner rowScanner) (Room, error) {
	var room Room
	var createdAt string
	var thumbnailUpdatedAt string
	if err := scanner.Scan(&room.ID, &room.Title, &room.ThumbnailURL, &thumbnailUpdatedAt, &room.ThumbnailRefreshSeconds, &createdAt); err != nil {
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
	room.ThumbnailUpdatedAt = parsedThumbnailUpdatedAt
	room.CreatedAt = parsedAt
	return room, nil
}

func scanComment(scanner rowScanner) (comment.StoredComment, error) {
	var stored comment.StoredComment
	var sentAt string
	if err := scanner.Scan(&stored.ID, &stored.RoomID, &stored.AuthorSub, &stored.Body, &stored.Direction, &stored.Color, &stored.FontSize, &sentAt); err != nil {
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

func normalizeSQLiteError(err error) error {
	if err == nil {
		return nil
	}
	var sqliteErr *modernsqlite.Error
	if errors.As(err, &sqliteErr) {
		switch sqliteErr.Code() {
		case sqlite3.SQLITE_CONSTRAINT_PRIMARYKEY, sqlite3.SQLITE_CONSTRAINT_UNIQUE:
			return ErrAlreadyExists
		}
	}
	return err
}
