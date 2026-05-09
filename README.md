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

## ローカル映像デモ

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

APIとWebSocketの最低限の疎通は次で確認できます。

```sh
pnpm demo:smoke
```

Lefthookはgitリポジトリ内で次のコマンドを実行すると有効化されます。

```sh
pnpm hooks:install
```

devサーバーはこのリポジトリの運用ルールに従い、自動起動しません。
