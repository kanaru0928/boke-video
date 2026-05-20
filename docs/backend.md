# バックエンド

本番の設定値と公開経路は`docs/deployment.md`を正本にします。

## 責務

Goバックエンドは次を担当します。

- コメント投稿を受ける
- ルーム内の視聴者へコメントを配信する
- 簡易なレート制限を行う
- ヘルスチェックを返す
- SQLiteへ配信ルームとコメントを保存する
- 配信枠サムネイルの状態と更新間隔を保存する
- JWTの`sub`に紐づくユニーク来場者数を集計する
- 管理者向けAPIを提供する
- Cloudflare Access JWTを検証する
- OvenMediaEngine視聴用の短寿命トークンを発行する
- OBS WHIP入力のBearer Tokenを検証してOvenMediaEngineへ転送する

WebRTC mediaの受信と視聴者への配信はOvenMediaEngineが担当します。

## API

```text
GET /healthz
GET /api/rooms
GET /api/rooms/:roomId
GET /api/rooms/:roomId/stats
GET /api/rooms/:roomId/comments
GET /ws/rooms/:roomId/comments
POST /api/rooms/:roomId/visits
POST /api/rooms/:roomId/comments
GET /api/admin/rooms
POST /api/admin/rooms
POST /api/admin/rooms/:roomId/ingest-token
PATCH /api/admin/rooms/:roomId
DELETE /api/admin/rooms/:roomId
DELETE /api/admin/comments/:commentId
```

## SQLite

```sql
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  owner_sub TEXT NOT NULL,
  ingest_token_hash TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  thumbnail_updated_at TEXT NOT NULL,
  thumbnail_refresh_seconds INTEGER NOT NULL,
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

CREATE TABLE room_visits (
  room_id TEXT NOT NULL,
  visitor_sub TEXT NOT NULL,
  first_visited_at TEXT NOT NULL,
  last_visited_at TEXT NOT NULL,
  visit_count INTEGER NOT NULL,
  PRIMARY KEY (room_id, visitor_sub),
  FOREIGN KEY (room_id) REFERENCES rooms (id)
);

CREATE INDEX room_visits_room_id_last_visited_at_index
  ON room_visits (room_id, last_visited_at);
```

SQLiteはWALを有効にします。初期規模100人では外部DBを追加しません。

保存するユーザー識別子はCloudflare Access JWTの`sub`だけです。認証情報、パスワード、メールアドレス、WHIP Bearer Tokenの平文は保存しません。配信ルーム所有者は`owner_sub`、コメント投稿者は`author_sub`、来場者は`visitor_sub`として保存します。WHIP Bearer Tokenはハッシュだけを保存します。

`thumbnail_url`は必須です。サムネイル未生成時は`n/a`を保存し、フロントエンドはその状態をサムネイル生成待ちとして表示します。`thumbnail_refresh_seconds`はトップページがサムネイル再取得に使う更新間隔です。初期値は30秒です。

## 環境変数

```text
LISTEN_ADDR=127.0.0.1:8080
DATABASE_PATH=/var/lib/boke-video/boke-video.sqlite3
STREAM_PUBLIC_BASE_URL=https://rtc.example.com
STREAM_SIGNING_SECRET=replace-with-strong-secret
WHIP_UPSTREAM_BASE_URL=http://127.0.0.1:3333
```

CORSとCloudflare Access関連の設定値は`docs/deployment.md`を参照します。
