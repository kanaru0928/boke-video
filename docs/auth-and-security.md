# 認証とセキュリティ

Cloudflare AccessとCloudflare Tunnelの具体的な設定手順は`docs/cloudflare.md`を正本にします。

## Cloudflare Access

Cloudflare Accessは通常画面、管理画面、WebSocket、APIを保護します。

GoバックエンドはCloudflare Accessがオリジンへ付与する`Cf-Access-Jwt-Assertion`を検証します。

検証対象は次です。

- 署名
- `aud`
- `iss`
- `exp`
- `sub`

アプリケーション独自のログイン、セッション、パスワード管理、アカウント管理、管理者ロールは持ちません。

## 管理者判定

管理画面と管理APIへ到達できるユーザーはCloudflare Accessのポリシーで制限します。Goバックエンドはアプリ内ロールを保存しません。

動画枠の更新、削除、保存済みコメント削除は、動画枠を作成したCloudflare Access JWTの`sub`だけに許可します。他のユーザーが作成した動画枠は管理APIで変更できません。

## OBS入力

OBS入力はCloudflare Accessで保護しません。WHIPの`Authorization: Bearer`をGoバックエンドのWHIP入口で検証し、成功したリクエストだけをOvenMediaEngineへ転送します。映像配信の認証仕様は`docs/streaming.md`を正本にします。

## CORSとCSP

Goバックエンドは`ALLOWED_ORIGINS`に含まれるWorkersのフロントエンドドメインだけをCORSで許可します。

Content Security Policyは、自分の配信元からのスクリプト、HTTPS/WSS接続、同一オリジンまたはblobのmediaだけを許可します。WebRTC接続先はフロントエンドの接続設定に合わせて許可します。
