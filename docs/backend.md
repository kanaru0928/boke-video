# バックエンド

## 責務

Goバックエンドは次を担当します。

- DASHマニフェストとセグメントをHTTPで配信する
- コメント投稿を受ける
- ルーム内の視聴者へコメントを配信する
- 簡易なレート制限を行う
- ヘルスチェックを返す
- SQLiteへ配信ルームとコメントを保存する
- 管理者向けAPIを提供する
- Cloudflare Access JWTを検証する

RTMP受信、RTSP受信、エンコード、MPEG-DASH生成はGoバックエンドの責務ではありません。MediaMTXとffmpegが担当します。

## API

```text
GET /healthz
GET /live/:roomId/manifest.mpd
GET /live/:roomId/:segmentName
GET /api/rooms
GET /api/rooms/:roomId
GET /api/rooms/:roomId/status
GET /api/rooms/:roomId/comments
GET /ws/rooms/:roomId/comments
POST /api/rooms/:roomId/comments
POST /api/admin/rooms
PATCH /api/admin/rooms/:roomId
DELETE /api/admin/comments/:commentId
GET /api/admin/rooms/:roomId/status
```

## SQLite

```sql
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  author_sub TEXT NOT NULL,
  body TEXT NOT NULL,
  direction TEXT NOT NULL,
  color TEXT NOT NULL,
  font_size TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms (id)
);

CREATE INDEX comments_room_id_sent_at_index
  ON comments (room_id, sent_at);
```

SQLiteはWALを有効にします。初期規模100人では外部DBを追加しません。

## 環境変数

```text
LISTEN_ADDR=127.0.0.1:8080
DATABASE_PATH=/var/lib/boke-video/boke-video.sqlite3
STREAM_DATA_DIR=/var/lib/boke-video/streams
ALLOWED_ORIGINS=https://video.example.com
ACCESS_ENABLED=true
ACCESS_AUDIENCE=replace-with-cloudflare-access-aud
ACCESS_ISSUER=https://replace-with-team-name.cloudflareaccess.com
ACCESS_CERTS_URL=https://replace-with-team-name.cloudflareaccess.com/cdn-cgi/access/certs
```
