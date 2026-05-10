# 認証とセキュリティ

Cloudflare AccessとCloudflare Tunnelの具体的な設定手順は`docs/cloudflare.md`を正本にします。

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

管理者判定はCloudflare Accessのポリシーで行います。Goバックエンドはアプリ内ロールを保存しません。

## OBS入力

OBS入力はCloudflare Accessで保護しません。RTMPはHTTPではなく、OBSから任意HTTPヘッダーも送れないためです。Cloudflare AccessのService TokenもHTTPヘッダーで送る仕組みなので、OBSのRTMP接続には使いません。

OBS入力の接続仕様は`docs/streaming.md`を参照します。OBS入力はMediaMTXのRTMP認証とオリジン側のネットワーク制限で守ります。

## CORSとCSP

Goバックエンドは`ALLOWED_ORIGINS`に含まれるWorkersのフロントエンドドメインだけをCORSで許可します。

Content Security Policyは、自分の配信元からのスクリプト、HTTPS/WSS接続、同一オリジンまたはblobのmediaだけを許可します。
