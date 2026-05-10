# 認証とセキュリティ

## Cloudflare Access

Cloudflare Accessは通常画面、管理画面、MPEG-DASH、WebSocket、APIを保護します。

GoバックエンドはCloudflare Accessがオリジンへ付与する`Cf-Access-Jwt-Assertion`を検証します。

検証対象は次です。

- 署名
- `aud`
- `iss`
- `exp`
- `sub`

アプリケーション独自のログイン、セッション、パスワード管理、アカウント管理、管理者ロールは持ちません。

## 管理者判定

管理者判定はCloudflare Accessのポリシーで行います。

| 対象 | パス | ポリシー |
| --- | --- | --- |
| 管理画面 | `/admin*` | 管理者 |
| 管理API | `/api/admin/*` | 管理者 |

Goバックエンドは到達した管理APIリクエストのJWTを検証しますが、アプリ内ロールは保存しません。

## OBS入力

OBS入力はCloudflare Accessで保護しません。RTMPはHTTPではなく、OBSから任意HTTPヘッダーも送れないためです。Cloudflare AccessのService TokenもHTTPヘッダーで送る仕組みなので、OBSのRTMP接続には使いません。

OBS入力の接続仕様は`docs/streaming.md`を参照します。

OBS入力は次で守ります。

- MediaMTXのRTMP公開ポートはOBS入力専用にします。
- MediaMTXの配信用認証を有効にします。
- 推測しにくいユーザー名とパスワードを使います。
- 可能ならオリジンのファイアウォールで配信者の接続元IPだけにTCP/1935を制限します。
- RTSP、HLS、WebRTC、SRTなど不要な外部リスナーは公開しません。
- Goバックエンド、DASH、WebSocket、APIは直接公開しません。

## CORSとCSP

Goバックエンドは`ALLOWED_ORIGINS`に含まれるWorkersのフロントエンドドメインだけをCORSで許可します。

Content Security Policyは、自分の配信元からのスクリプト、HTTPS/WSS接続、同一オリジンまたはblobのmediaだけを許可します。
