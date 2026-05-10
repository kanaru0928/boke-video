# Boke Video

100人規模の組織内配信用プロジェクトです。フロントエンドはCloudflare Workersへ配置し、オンプレGoバックエンドがMPEG-DASH、WebSocketコメント、SQLite保存、管理APIを担当します。

## 構成

```text
backend/   Goバックエンド
frontend/  ViteとTypeScriptのフロントエンド
deploy/    systemdとffmpegの運用サンプル
cc-docs/   設計メモ
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
