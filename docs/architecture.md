# アーキテクチャ

## 目的

Boke Videoは、100人規模の組織内ライブ配信を扱います。

このファイルは全体構成とドメインだけを定義します。映像配信、認証、デプロイの詳細は各ドキュメントを参照します。

## 構成

```text
OBS
  |
  v
Cloudflare DNS only
  |
  v
MediaMTX
  |
  v
ffmpeg
  |
  v
Goバックエンド
  |
  v
Cloudflare Tunnel
  |
  v
Cloudflare Access
  |
  v
Cloudflare Workers
  |
  v
視聴者ブラウザ
```

## ドメイン

| 用途 | ホスト名 | Cloudflare設定 |
| --- | --- | --- |
| フロントエンド | `video.example.com` | Workers |
| Goバックエンド | `stream.example.com` | Tunnel |
| OBS入力 | `obs.example.com` | DNS only |

## 非目標

- ブラウザからのライブ配信
- 複数配信者の同時入力
- 動画アーカイブ
- WebRTCによる超低遅延配信
- アプリケーション独自の認証機能
- OBS入力をCloudflare Accessで直接認証すること
- OBS利用者PCへ`cloudflared`を導入すること

## 詳細

- 映像配信は`docs/streaming.md`を参照します。
- コメントは`docs/comments.md`を参照します。
- 認証とセキュリティは`docs/auth-and-security.md`を参照します。
- バックエンドは`docs/backend.md`を参照します。
- フロントエンドは`docs/frontend.md`を参照します。
- デプロイは`docs/deployment.md`を参照します。
