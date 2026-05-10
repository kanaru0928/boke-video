# Boke Video

100人規模の組織内配信用プロジェクトです。フロントエンドはCloudflare Workersへ配置し、オンプレGoバックエンドがMPEG-DASH、WebSocketコメント、SQLite保存、管理APIを担当します。

## 構成

```text
backend/   Goバックエンド
frontend/  ViteとTypeScriptのフロントエンド
deploy/    systemdとffmpegの運用サンプル
docs/      仕様と設計
```

## 実装状況

Cloudflare Access JWT検証、MPEG-DASH再生、WebSocketコメント、SQLite保存、管理API、管理画面は実装済みです。

アプリケーション独自のログイン、セッション、パスワード管理、オンプレ側のアカウント管理機能は実装していません。これはCloudflare Accessへ認証を任せる設計どおりです。管理者判定もCloudflare Accessのポリシーで行います。Goバックエンドは到達したリクエストのJWTを検証しますが、アプリ内ロールは持ちません。

OBS入力は、現状ではGoプロセス内RTSP受信としては実装していません。ローカルとデプロイ例ではMediaMTXでOBS入力を受け、ffmpegでMPEG-DASHへ変換します。

仕様と設計は`docs/`に分けてまとめています。

```text
docs/architecture.md
docs/streaming.md
docs/comments.md
docs/auth-and-security.md
docs/backend.md
docs/frontend.md
docs/deployment.md
```

## バックエンド

```sh
cd backend
go test ./...
go vet ./...
go build ./cmd/server
```

ローカル開発では、バックエンドはデフォルトで`http://localhost:5173`と`http://127.0.0.1:5173`からのリクエストを許可します。本番では`ALLOWED_ORIGINS`にCloudflare WorkersのURLをカンマ区切りで設定します。

## フロントエンド

```sh
pnpm install
pnpm check
```

Cloudflare Workersへデプロイする場合は、`frontend/.env.production`へ本番URLを設定してからデプロイします。

```sh
VITE_API_BASE_URL=https://stream.example.com
VITE_STREAM_BASE_URL=https://stream.example.com
VITE_COMMENT_WS_URL=wss://stream.example.com
```

```sh
pnpm deploy:frontend
```

Wrangler設定は`frontend/wrangler.jsonc`です。

## Cloudflare Access

フロントエンド、バックエンド、DASH、WebSocket、管理画面をCloudflare Accessの対象にします。バックエンドは`Cf-Access-Jwt-Assertion`を検証します。

バックエンドの本番環境変数例は`backend/.env.example`です。

```sh
ACCESS_ENABLED=true
ACCESS_AUDIENCE=replace-with-cloudflare-access-aud
ACCESS_ISSUER=https://replace-with-team-name.cloudflareaccess.com
ACCESS_CERTS_URL=https://replace-with-team-name.cloudflareaccess.com/cdn-cgi/access/certs
ALLOWED_ORIGINS=https://video.example.com
```

`/admin`と`/api/admin/*`はCloudflare Access側で管理者だけに許可します。Goバックエンド側にはアプリ独自の管理者ロールを保存しません。

## オンプレデプロイ

Goバックエンド、Cloudflare Tunnel、MediaMTX、ffmpeg変換をsystemdで管理する例を`deploy/systemd/`に置いています。

デプロイ手順は`deploy/README.md`にまとめています。

```text
deploy/systemd/boke-video.service
deploy/systemd/cloudflared-boke-video.service
deploy/systemd/mediamtx-boke-video.service
deploy/systemd/boke-video-obs-packager.service
```

Cloudflare Tunnelの設定例は`deploy/cloudflared/boke-video.yml.example`です。MediaMTXの設定例は`deploy/mediamtx.yml`です。

ffmpeg変換サービスは`deploy/ffmpeg-dash.example.sh`を実行ファイルとして配置して使います。

```sh
sudo install -m 0755 deploy/ffmpeg-dash.example.sh /usr/local/bin/ffmpeg-dash-boke-video
```

## ローカル開発

バックエンド、フロントエンド、ダミーライブ配信をまとめて起動します。

```sh
pnpm dev:mock
```

起動すると`WATCH_URL`が表示されます。そのURLをブラウザで開くと、ライブDASH再生とリアルタイムコメントを確認できます。終了するときは`Ctrl+C`で止めます。

`pnpm dev:mock`は次の3つをまとめて実行します。

```sh
pnpm demo:backend
pnpm demo:frontend
pnpm demo:stream:dummy
```

ダミー配信は`ffmpeg`の`testsrc2`映像と`sine`音声からライブDASHを生成し続けます。DASH出力先はデフォルトで`/tmp/boke-video-streams`です。

`pnpm dev:mock`はOBS入力を使いません。ローカルで画面、DASH再生、コメントを確認するためのダミー配信です。

## OBS入力

OBS入力を使うローカル開発は次で起動します。

```sh
pnpm dev:obs
```

`pnpm dev:obs`はMediaMTX、Goバックエンド、フロントエンド、ffmpeg変換を起動します。MediaMTXが入っていない場合は先にインストールします。

```sh
brew install mediamtx
```

OBS側は次のように設定します。

| 項目 | 値 |
| --- | --- |
| サービス | カスタム |
| サーバー | `rtmp://127.0.0.1:1935/live/obs-local` |
| ストリームキー | 空欄 |

`pnpm dev:obs`はOBS入力が来るまで待機します。先に`pnpm dev:obs`を起動してからOBSで配信開始しても動作します。OBSで配信開始すると、`pnpm dev:obs`が`rtsp://127.0.0.1:8554/live/obs-local`を読み、`/tmp/boke-video-streams/obs-local`へDASHを生成します。表示された`WATCH_URL`を開くとOBS映像を確認できます。

## サンプル映像デモ

別々のshellでバックエンドとフロントエンドを起動します。

```sh
pnpm demo:backend
pnpm demo:frontend
```

その後、BigBuckBunnyのサンプル動画からMPEG-DASHを生成します。

```sh
pnpm demo:setup
```

出力された`WATCH_URL`をブラウザで開くと、生成済みDASHとコメント機能を同時に確認できます。サンプル動画はBlenderのPeachプロジェクト配布ファイルを`.local-demo/`へ保存します。DASH出力先はデフォルトで`/tmp/boke-video-streams`です。

## ローカル検証

```sh
pnpm check
```

`pnpm check`はBiome、Knip、TypeScript、Vitest、Viteビルド、`go vet`、Goテストを実行します。

APIとWebSocketの最低限の疎通は次で確認できます。

```sh
pnpm demo:smoke
```

PC幅とスマホ幅のブラウザ表示、DASH再生、コメント送信、ショートカット、コメント位置は次で確認できます。実行前に`WATCH_URL`を指定します。

```sh
WATCH_URL="http://127.0.0.1:5173/?room=..." pnpm demo:browser-smoke
```

Lefthookはgitリポジトリ内で次のコマンドを実行すると有効化されます。

```sh
pnpm hooks:install
```

devサーバーはこのリポジトリの運用ルールに従い、自動起動しません。
