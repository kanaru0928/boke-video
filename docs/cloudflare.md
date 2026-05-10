# Cloudflare

## 構成

Cloudflareはフロントエンド、API、WebSocketを守ります。低遅延映像のmedia経路はCloudflare Tunnelへ入れません。

```text
ブラウザ
  -> Cloudflare Access
  -> Cloudflare Tunnel
  -> Goバックエンド 127.0.0.1:8080

ブラウザ
  -> MediaMTX WebRTC/WHEP
```

GoバックエンドはCloudflare Accessが付与する`Cf-Access-Jwt-Assertion`を検証します。OBS入力はMediaMTXへ直接入れます。

## ホスト名

| 用途 | 例 | 向き先 |
| --- | --- | --- |
| フロントエンド | `https://video.example.com` | Cloudflare Workers |
| API、WebSocket | `https://stream.example.com` | Cloudflare Tunnel経由のGoバックエンド |
| WebRTC/WHEP | `https://media.example.com` | MediaMTXの`:8889` |
| WebRTC media | `media.example.com:8189/udp` | MediaMTXのUDP |
| OBS入力 | `https://media.example.com/live/main/whip` | MediaMTXのWHIP |

Cloudflare Tunnelで扱うのは`stream.example.com`だけです。`media.example.com`はMediaMTXへ到達させます。

## Access Application

Cloudflare Zero TrustでSelf-hosted applicationを作成します。Accessはdeny by defaultです。許可するユーザーまたはグループをAllow policyで明示します。

| 対象 | Application domain | ポリシー |
| --- | --- | --- |
| 通常画面 | `video.example.com` | 視聴者を許可 |
| 管理画面 | `video.example.com/admin*` | 管理者だけ許可 |
| バックエンド | `stream.example.com` | 視聴者を許可 |
| 管理API | `stream.example.com/api/admin/*` | 管理者だけ許可 |

管理者判定はCloudflare Accessのポリシーで行います。Goバックエンドは管理APIへ到達したリクエストのJWTを検証しますが、アプリ内ロールは保存しません。

## JWT検証

Goバックエンドは次の環境変数でCloudflare Access JWTを検証します。

```text
ACCESS_ENABLED=true
ACCESS_AUDIENCE=Cloudflare Access ApplicationのAUD tag
ACCESS_ISSUER=https://チーム名.cloudflareaccess.com
ACCESS_CERTS_URL=https://チーム名.cloudflareaccess.com/cdn-cgi/access/certs
```

検証対象は署名、`aud`、`iss`、`exp`、`sub`です。

## Tunnel

Cloudflare Tunnelは`cloudflared`でGoバックエンドへ転送します。設定例は`deploy/cloudflared/boke-video.yml.example`です。

```yaml
tunnel: replace-with-tunnel-id
credentials-file: /etc/cloudflared/replace-with-tunnel-id.json

ingress:
  - hostname: stream.example.com
    service: http://127.0.0.1:8080
  - service: http_status:404
```

Tunnelを作成したら、DNSで`stream.example.com`をTunnelへ向けます。本番ではsystemdの`cloudflared-boke-video.service`で次を実行します。

```sh
cloudflared tunnel --config /etc/cloudflared/boke-video.yml run
```

## フロントエンド設定

フロントエンドのビルド時に次を設定します。

```text
VITE_API_BASE_URL=https://stream.example.com
VITE_STREAM_BASE_URL=https://media.example.com
VITE_COMMENT_WS_URL=wss://stream.example.com
```

Goバックエンドの`ALLOWED_ORIGINS`にはフロントエンドのoriginを入れます。

```text
ALLOWED_ORIGINS=https://video.example.com
```

## ローカルデバッグ

### ローカル、OBSあり

OBS入力をローカルで確認します。

```sh
pnpm dev:obs:local
```

起動ログの`OBS_WHIP_SERVER`をOBSのWHIPサーバーへ入れます。

### CFのTunnelを使うデバッグ

Cloudflare AccessとTunnelを経由して、GoバックエンドのJWT検証まで確認します。

```sh
ACCESS_ENABLED=true \
ACCESS_AUDIENCE=Cloudflare Access ApplicationのAUD tag \
ACCESS_ISSUER=https://チーム名.cloudflareaccess.com \
ACCESS_CERTS_URL=https://チーム名.cloudflareaccess.com/cdn-cgi/access/certs \
CLOUDFLARE_ACCESS_ORIGIN=https://stream.example.com \
CLOUDFLARE_TUNNEL_CONFIG=/path/to/boke-video.yml \
pnpm dev:obs:cloudflare
```

このモードでも映像はローカルMediaMTXの`http://127.0.0.1:8889`を使います。Cloudflare Tunnelで確認する対象はAPI、WebSocket、Access JWT検証です。

## 本番デプロイ確認

```sh
curl -fsS http://127.0.0.1:8080/healthz
sudo systemctl status boke-video.service
sudo systemctl status cloudflared-boke-video.service
sudo systemctl status mediamtx-boke-video.service
```

ブラウザでは`https://video.example.com`へアクセスし、Cloudflare Accessログイン後に視聴画面が表示されることを確認します。

## 参考

- Cloudflare Tunnel locally-managed tunnel: https://developers.cloudflare.com/tunnel/advanced/local-management/create-local-tunnel/
- Cloudflare Tunnel configuration file: https://developers.cloudflare.com/tunnel/advanced/local-management/configuration-file/
- Cloudflare Access JWT validation: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- Cloudflare Access application: https://developers.cloudflare.com/learning-paths/clientless-access/access-application/create-access-app/
- Cloudflare Access application paths: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
