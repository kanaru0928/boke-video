# Boke Video

100人規模の組織内ライブ配信用プロジェクトです。

## 構成

```text
backend/   Goバックエンド
frontend/  ViteとTypeScriptのフロントエンド
deploy/    systemd、cloudflared、MediaMTX、ffmpegの配置サンプル
docs/      仕様と設計
```

## ドキュメント

仕様は`docs/`を正本にします。

| ファイル | 内容 |
| --- | --- |
| `docs/architecture.md` | 全体構成、ドメイン、非目標 |
| `docs/streaming.md` | OBS入力、MediaMTX、ffmpeg、MPEG-DASH |
| `docs/comments.md` | コメント仕様 |
| `docs/auth-and-security.md` | Cloudflare Access、管理者判定、セキュリティ |
| `docs/backend.md` | Goバックエンド、API、SQLite、環境変数 |
| `docs/frontend.md` | フロントエンド、Workers |
| `docs/deployment.md` | デプロイ手順 |

## ローカル開発

```sh
pnpm install
pnpm dev:mock
pnpm dev:obs
```

`pnpm dev:mock`はダミーライブ配信です。`pnpm dev:obs`はローカルOBS入力を使う開発用です。

## 検証

```sh
pnpm check
```

## フロントエンドデプロイ

```sh
pnpm deploy:frontend
```
