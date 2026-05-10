# デプロイ手順

## 構成

```text
視聴者ブラウザ
  |
  | https://video.example.com
  v
Cloudflare Workers
  |
  | https://stream.example.com
  v
Cloudflare Access
  |
  v
Cloudflare Tunnel
  |
  v
オンプレGoバックエンド

OBS
  |
  | RTMP
  v
Cloudflare DNS only
  |
  | obs.example.com
  v
MediaMTX
  |
  | RTSP
  v
ffmpeg
  |
  | MPEG-DASH
  v
オンプレGoバックエンドのSTREAM_DATA_DIR
```

Cloudflare Workersはフロントエンドの静的アセットだけを配信します。API、MPEG-DASH、WebSocketはCloudflare Tunnelの背後にあるGoバックエンドへ接続します。

## 1. フロントエンドをWorkersへデプロイする

`frontend/.env.production`を作ります。

```sh
cp frontend/.env.production.example frontend/.env.production
```

値を本番ホストへ変更します。

```sh
VITE_API_BASE_URL=https://stream.example.com
VITE_STREAM_BASE_URL=https://stream.example.com
VITE_COMMENT_WS_URL=wss://stream.example.com
```

Wranglerへログインしてからデプロイします。

```sh
pnpm --dir frontend exec wrangler login
pnpm deploy:frontend
```

Workersの設定は`frontend/wrangler.jsonc`です。静的アセットは`frontend/dist`を配信します。

## 2. Cloudflare Accessを設定する

Cloudflare Zero TrustでAccessアプリケーションを作ります。

| 対象 | ホストまたはパス | ポリシー |
| --- | --- | --- |
| 視聴画面 | `https://video.example.com/*` | 視聴を許可するユーザー |
| 管理画面 | `https://video.example.com/admin*` | 管理者 |
| バックエンド | `https://stream.example.com/*` | 視聴を許可するユーザー |
| 管理API | `https://stream.example.com/api/admin/*` | 管理者 |

GoバックエンドはCloudflare Accessがオリジンへ付与する`Cf-Access-Jwt-Assertion`を検証します。アプリ独自のログイン、セッション、パスワード、アカウント管理、管理者ロールは持ちません。

OBSのRTMP入力はHTTPではないため、Cloudflare AccessのHTTPアプリケーションとして保護できません。AccessのService TokenもHTTPヘッダーで送る仕組みなので、OBSのRTMP接続には使えません。

OBS入力はCloudflare DNSのDNS onlyレコードで別経路にします。

| 対象 | ホスト | Cloudflare設定 | 保護 |
| --- | --- | --- | --- |
| 視聴画面 | `video.example.com` | Workers | Cloudflare Access |
| バックエンド | `stream.example.com` | Tunnel | Cloudflare Access |
| OBS入力 | `obs.example.com` | DNS only | MediaMTX認証とファイアウォール |

## 3. バックエンド環境変数を配置する

`backend/.env.example`をもとに、オンプレサーバーへ`/etc/boke-video/backend.env`を作ります。

```sh
LISTEN_ADDR=127.0.0.1:8080
DATABASE_PATH=/var/lib/boke-video/boke-video.sqlite3
STREAM_DATA_DIR=/var/lib/boke-video/streams
ALLOWED_ORIGINS=https://video.example.com
ACCESS_ENABLED=true
ACCESS_AUDIENCE=replace-with-cloudflare-access-aud
ACCESS_ISSUER=https://replace-with-team-name.cloudflareaccess.com
ACCESS_CERTS_URL=https://replace-with-team-name.cloudflareaccess.com/cdn-cgi/access/certs
```

`ACCESS_AUDIENCE`、`ACCESS_ISSUER`、`ACCESS_CERTS_URL`はCloudflare Accessアプリケーションの値に合わせます。

## 4. Cloudflare Tunnelを設定する

`deploy/cloudflared/boke-video.yml.example`をもとに、オンプレサーバーへ`/etc/cloudflared/boke-video.yml`を作ります。

```yaml
tunnel: replace-with-tunnel-id
credentials-file: /etc/cloudflared/replace-with-tunnel-id.json

ingress:
  - hostname: stream.example.com
    service: http://127.0.0.1:8080
  - service: http_status:404
```

DNSの公開ホスト名`stream.example.com`をこのTunnelへ向けます。

## 5. OBS入力を設定する

`deploy/mediamtx.yml`をオンプレサーバーへ配置します。

```sh
sudo install -m 0644 deploy/mediamtx.yml /etc/boke-video/mediamtx.yml
```

この設定例では、ffmpegが読むRTSPは`127.0.0.1`だけで待ち受け、OBS入力用RTMPは`:1935`で待ち受けます。RTMPはDNS onlyの`obs.example.com`から直接到達します。

Cloudflare DNSで`obs.example.com`のA/AAAAレコードを作り、プロキシ状態をDNS onlyにします。Cloudflare proxy、Cloudflare Access、Cloudflare TunnelはこのRTMP入力には使いません。

この設定例では、MediaMTXのHLS、WebRTC、SRTリスナーは無効化しています。ブラウザ配信はGoバックエンドのMPEG-DASHで行います。

ffmpeg変換スクリプトを配置します。

```sh
sudo install -m 0755 deploy/ffmpeg-dash.example.sh /usr/local/bin/ffmpeg-dash-boke-video
```

OBSの配信設定は次です。

| 項目 | 値 |
| --- | --- |
| サービス | カスタム |
| サーバー | `rtmp://obs.example.com/live/main?user=publisher&pass=strong-password` |
| ストリームキー | 空欄 |

OBS設定はこの形に固定します。MediaMTX公式ドキュメントでは、OBSのRTMP publishはServerに`rtmp://host/path`を入れ、Stream keyを空欄にする手順です。MediaMTXのRTMP認証は`user`と`pass`のクエリパラメータで渡します。`deploy/mediamtx.yml`の`replace-with-strong-password`は本番値へ変更します。

OBS入力はDNS onlyでオリジンへ直接到達するため、Cloudflare proxyによるIP秘匿やCloudflare Accessの認証はありません。可能ならオリジンのファイアウォールで配信者の接続元IPだけにTCP/1935を制限します。

## 6. systemdサービスを配置する

```sh
sudo install -m 0644 deploy/systemd/boke-video.service /etc/systemd/system/boke-video.service
sudo install -m 0644 deploy/systemd/cloudflared-boke-video.service /etc/systemd/system/cloudflared-boke-video.service
sudo install -m 0644 deploy/systemd/mediamtx-boke-video.service /etc/systemd/system/mediamtx-boke-video.service
sudo install -m 0644 deploy/systemd/boke-video-obs-packager.service /etc/systemd/system/boke-video-obs-packager.service
sudo systemctl daemon-reload
```

起動します。

```sh
sudo systemctl enable --now boke-video.service
sudo systemctl enable --now cloudflared-boke-video.service
sudo systemctl enable --now mediamtx-boke-video.service
sudo systemctl enable --now boke-video-obs-packager.service
```

## 7. 動作確認

```sh
curl -fsS http://127.0.0.1:8080/healthz
sudo systemctl status boke-video.service
sudo systemctl status cloudflared-boke-video.service
sudo systemctl status mediamtx-boke-video.service
sudo systemctl status boke-video-obs-packager.service
```

Cloudflare Access経由では、ブラウザで`https://video.example.com`を開きます。管理者は`https://video.example.com/admin`を開きます。

## 未自動化

Cloudflare側のAccessアプリケーション作成、ポリシー作成、Tunnel作成、DNS公開ホスト名の紐付けは、このリポジトリでは自動化していません。CloudflareダッシュボードまたはCloudflare APIで設定します。
