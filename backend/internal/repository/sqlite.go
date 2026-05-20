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
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	CreatedAt       time.Time `json:"createdAt"`
	OwnerSub        string    `json:"-"`
	IngestTokenHash string    `json:"-"`
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
				owner_sub TEXT NOT NULL DEFAULT '',
				ingest_token_hash TEXT NOT NULL DEFAULT '',
				created_at TEXT NOT NULL
			)`,
		`ALTER TABLE rooms ADD COLUMN owner_sub TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE rooms ADD COLUMN ingest_token_hash TEXT NOT NULL DEFAULT ''`,
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
		`INSERT INTO rooms (id, title, owner_sub, ingest_token_hash, created_at) VALUES (?, ?, ?, ?, ?)`,
		room.ID,
		room.Title,
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

func (s *SQLite) DeleteRoom(ctx context.Context, roomID string, ownerSub string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `DELETE FROM comments WHERE room_id IN (SELECT id FROM rooms WHERE id = ? AND owner_sub = ?)`, roomID, ownerSub); err != nil {
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
	row := s.db.QueryRowContext(ctx, `SELECT id, title, owner_sub, ingest_token_hash, created_at FROM rooms WHERE id = ?`, roomID)
	return scanRoom(row)
}

func (s *SQLite) ListRooms(ctx context.Context) ([]Room, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, title, owner_sub, ingest_token_hash, created_at FROM rooms ORDER BY created_at DESC`)
	return scanRooms(rows, err)
}

func (s *SQLite) ListRoomsByOwner(ctx context.Context, ownerSub string) ([]Room, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, title, owner_sub, ingest_token_hash, created_at FROM rooms WHERE owner_sub = ? ORDER BY created_at DESC`, ownerSub)
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

type rowScanner interface {
	Scan(dest ...any) error
}

func scanRoom(scanner rowScanner) (Room, error) {
	var room Room
	var createdAt string
	if err := scanner.Scan(&room.ID, &room.Title, &room.OwnerSub, &room.IngestTokenHash, &createdAt); err != nil {
		return Room{}, err
	}
	parsedAt, err := time.Parse(time.RFC3339Nano, createdAt)
	if err != nil {
		return Room{}, err
	}
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
			return ErrAlreadyExists
		}
	}
	return err
}
