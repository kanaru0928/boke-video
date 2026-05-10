# Cloudflare

## 正本

Cloudflare AccessとCloudflare Tunnelの設定はこのファイルを正本にします。

## 構成

本番では次の経路にします。

```text
ブラウザ
  -> Cloudflare Access
  -> Cloudflare Tunnel
  -> Goバックエンド 127.0.0.1:8080
```

GoバックエンドはCloudflare Accessが付与する`Cf-Access-Jwt-Assertion`を検証します。

OBS入力はこの経路に含めません。OBSのRTMP接続ではCloudflare Access用のHTTPヘッダーを送れないため、OBS入力はMediaMTXのRTMP認証で守ります。

## ホスト名

| 用途 | 例 | 向き先 |
| --- | --- | --- |
| フロントエンド | `https://video.example.com` | Cloudflare Workers |
| API、DASH、WebSocket | `https://stream.example.com` | Cloudflare Tunnel経由のGoバックエンド |
| OBS入力 | `rtmp://obs.example.com/live/main?user=publisher&pass=strong-password` | MediaMTXのRTMPポート |

フロントエンドはWorkersで静的アセットを配信します。API、DASH、WebSocketは`stream.example.com`へ向けます。

## Access Application

Cloudflare Zero TrustでSelf-hosted applicationを作成します。

| 対象 | Application domain | ポリシー |
| --- | --- | --- |
| 通常画面 | `video.example.com` | 視聴者を許可 |
| 管理画面 | `video.example.com/admin*` | 管理者だけ許可 |
| バックエンド | `stream.example.com` | 視聴者を許可 |
| 管理API | `stream.example.com/api/admin/*` | 管理者だけ許可 |

Cloudflare Accessはdeny by defaultです。許可するユーザーまたはグループをAllow policyで明示します。

Cloudflare Accessのpathルールは、共通のroot pathに複数のルールがある場合、より具体的なpathが優先されます。このため、`/admin*`と`/api/admin/*`は通常画面や通常APIより厳しいポリシーにします。

管理者判定はCloudflare Accessのポリシーで行います。Goバックエンドは管理APIへ到達したリクエストのJWTを検証しますが、アプリ内ロールは保存しません。

## JWT検証

Goバックエンドは次の環境変数でCloudflare Access JWTを検証します。

```text
ACCESS_ENABLED=true
ACCESS_AUDIENCE=Cloudflare Access ApplicationのAUD tag
ACCESS_ISSUER=https://チーム名.cloudflareaccess.com
ACCESS_CERTS_URL=https://チーム名.cloudflareaccess.com/cdn-cgi/access/certs
```

`ACCESS_AUDIENCE`はCloudflare Zero TrustのAccess application詳細画面にあるApplication Audience(AUD)Tagを使います。Cloudflareの仕様ではAUD tagはAccess applicationごとに一意です。

`ACCESS_ISSUER`はCloudflare Accessのteam domainです。`ACCESS_CERTS_URL`は同じteam domainの`/cdn-cgi/access/certs`です。

Goバックエンドの検証対象は次です。

- 署名
- `aud`
- `iss`
- `exp`
- `sub`

## Tunnel

Cloudflare Tunnelは`cloudflared`でGoバックエンドへ転送します。

設定例は`deploy/cloudflared/boke-video.yml.example`です。

```yaml
tunnel: replace-with-tunnel-id
credentials-file: /etc/cloudflared/replace-with-tunnel-id.json

ingress:
  - hostname: stream.example.com
    service: http://127.0.0.1:8080
  - service: http_status:404
```

この設定では`stream.example.com`だけを`127.0.0.1:8080`へ転送します。最後の`http_status:404`は、定義していないhostnameへのリクエストを落とすための終端ルールです。

Tunnelを作成したら、DNSで`stream.example.com`をTunnelへ向けます。ローカル管理Tunnelでは、Cloudflare公式手順に従い`cloudflared tunnel login`、`cloudflared tunnel create <NAME>`、`cloudflared tunnel route dns <UUID or NAME> stream.example.com`を使います。

本番ではsystemdの`cloudflared-boke-video.service`で次を実行します。

```sh
cloudflared tunnel --config /etc/cloudflared/boke-video.yml run
```

## フロントエンド設定

フロントエンドのビルド時に次を設定します。

```text
VITE_API_BASE_URL=https://stream.example.com
VITE_STREAM_BASE_URL=https://stream.example.com
VITE_COMMENT_WS_URL=wss://stream.example.com
```

Goバックエンドの`ALLOWED_ORIGINS`にはフロントエンドのoriginを入れます。

```text
ALLOWED_ORIGINS=https://video.example.com
```

## ローカルデバッグ

### ローカル

OBSなしで、ダミー配信を使います。

```sh
pnpm dev:mock
```

Access、Tunnel、MediaMTX認証は使いません。

### ローカル、OBSあり

OBS入力をローカルで確認します。

```sh
pnpm dev:obs:local
```

MediaMTX認証も確認する場合は次を使います。

```sh
pnpm dev:obs:auth
```

起動ログの`OBS_RTMP_SERVER`をOBSのサーバーへ入れます。ストリームキーは空欄です。

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

`CLOUDFLARE_TUNNEL_CONFIG`を指定すると、`scripts/local-dev.sh`が`cloudflared tunnel --config <file> run`を同時に起動します。別shellでTunnelを起動済みの場合は、この変数を指定しません。

ローカルフロントエンドは`http://127.0.0.1:5173`で動きますが、API、DASH、WebSocketは`CLOUDFLARE_ACCESS_ORIGIN`へ向きます。ブラウザでCloudflare Accessのログインを完了してから視聴画面を開きます。

`pnpm dev:obs:cloudflare`では、ローカル用ルーム作成だけSQLiteへ直接行います。これはJWT検証を有効にしたバックエンドAPIへ、ローカルスクリプトがJWTなしで管理APIを呼ばないようにするためです。

## 本番デプロイ確認

```sh
curl -fsS http://127.0.0.1:8080/healthz
sudo systemctl status boke-video.service
sudo systemctl status cloudflared-boke-video.service
```

ブラウザでは`https://video.example.com`へアクセスし、Cloudflare Accessログイン後に視聴画面が表示されることを確認します。

## 参考

- Cloudflare Tunnel locally-managed tunnel: https://developers.cloudflare.com/tunnel/advanced/local-management/create-local-tunnel/
- Cloudflare Tunnel configuration file: https://developers.cloudflare.com/tunnel/advanced/local-management/configuration-file/
- Cloudflare Access JWT validation: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- Cloudflare Access application: https://developers.cloudflare.com/learning-paths/clientless-access/access-application/create-access-app/
- Cloudflare Access application paths: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
