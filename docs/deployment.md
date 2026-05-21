# デプロイ

このファイルを本番構成の正本にします。詳細な背景だけが必要な場合は、各専門docsを参照します。

## 全体構成

```text
bokevideo.example.com
  Browser -> Cloudflare Access -> Cloudflare Workers

stream.example.com
  Browser -> Cloudflare Access -> Cloudflare Tunnel -> Go 127.0.0.1:8080

ingest.example.com
  OBS -> Oracle TLS入口 -> Go /live/* -> OvenMediaEngine 127.0.0.1:3333

rtc.example.com
  Browser -> OvenMediaEngine WebRTC Publisher
```

`stream.example.com`だけをCloudflare Tunnelへ入れます。`ingest.example.com`と`rtc.example.com`はWebRTCのためOracleへDNS-onlyで向けます。

## サブドメイン

| ホスト名 | 役割 | 設定 |
| --- | --- | --- |
| `bokevideo.example.com` | フロントエンド | Workers Custom Domain |
| `stream.example.com` | API、コメントWebSocket | Tunnelの公開ホスト名 |
| `ingest.example.com` | OBS WHIP入力 | Oracle IPへのDNS-only A/AAAA |
| `rtc.example.com` | 視聴者向けWebRTC | Oracle IPへのDNS-only A/AAAA |

## 公開ポート

| ポート | 用途 |
| --- | --- |
| `443/tcp` | `ingest.example.com`のWHIP認証入口、`rtc.example.com`のWebRTCシグナリング |
| `10000-10005/udp` | WebRTC media |

`3333/tcp`はOvenMediaEngineの内部HTTPシグナリングです。Oracle VCN、OS firewall、DNSのいずれからも公開しません。

## 認証

Cloudflare Accessは`bokevideo.example.com`と`stream.example.com`を保護します。Goバックエンドは`Cf-Access-Jwt-Assertion`を検証し、署名、`aud`、`iss`、`exp`、`sub`を必須にします。

管理画面と管理APIへ到達できるユーザーはCloudflare Accessのポリシーで制限します。動画枠の更新、削除、コメント削除、WHIP Token再発行は、動画枠を作成したJWTの`sub`だけに許可します。

OBS入力はCloudflare Accessを通しません。Goの`/live/*`でWHIPの`Authorization: Bearer`を検証し、正しい動画枠のTokenだけをOvenMediaEngineへ転送します。Token平文は作成時または再発行時だけ返し、DBにはハッシュだけを保存します。

## Cloudflare設定

Access Applicationはdeny by defaultにします。

| 対象 | Application domain | 許可 |
| --- | --- | --- |
| 視聴画面 | `bokevideo.example.com` | 視聴者 |
| 管理画面 | `bokevideo.example.com/admin*` | 管理者 |
| バックエンド | `stream.example.com` | 視聴者 |
| 管理API | `stream.example.com/api/admin/*` | 管理者 |

Tunnelは`stream.example.com`だけをGoへ転送します。

```yaml
tunnel: replace-with-tunnel-id
credentials-file: /etc/cloudflared/replace-with-tunnel-id.json

ingress:
  - hostname: stream.example.com
    service: http://127.0.0.1:8080
    originRequest:
      access:
        required: true
        teamName: replace-with-team-name
        audTag:
          - replace-with-access-aud-tag
  - service: http_status:404
```

## 環境変数

```text
LISTEN_ADDR=127.0.0.1:8080
DATABASE_PATH=/var/lib/boke-video/boke-video.sqlite3
ALLOWED_ORIGINS=https://bokevideo.example.com

ACCESS_ENABLED=true
ACCESS_AUDIENCE=Cloudflare Access ApplicationのAUD tag
ACCESS_ISSUER=https://チーム名.cloudflareaccess.com
ACCESS_CERTS_URL=https://チーム名.cloudflareaccess.com/cdn-cgi/access/certs

STREAM_PUBLIC_BASE_URL=https://rtc.example.com
STREAM_SIGNING_SECRET=replace-with-strong-secret
WHIP_UPSTREAM_BASE_URL=http://127.0.0.1:3333

OME_API_BASE_URL=http://127.0.0.1:8081
OME_API_ACCESS_TOKEN=replace-with-api-token
OME_VHOST_NAME=default
OME_APP_NAME=live
OME_THUMBNAIL_BASE_URL=http://127.0.0.1:20080
OME_THUMBNAIL_CODEC=jpg
STREAM_END_GRACE_SECONDS=90
```

フロントエンドのビルド時は次を設定します。

```text
VITE_API_BASE_URL=https://stream.example.com
VITE_COMMENT_WS_URL=wss://stream.example.com
```

## OBS

管理画面で動画枠を作成し、表示されたBearer TokenをOBSへ設定します。

| 項目 | 値 |
| --- | --- |
| サービス | `WHIP` |
| サーバー | `https://ingest.example.com/live/<roomId>?direction=whip` |
| Bearer Token | 管理画面で作成または再発行したToken |

OBSの初期設定はH.264、Opus、30fps、キーフレーム間隔1秒、Bフレーム0、CBR、Simulcast3レイヤーです。

## 配置ファイル

| ファイル | 用途 |
| --- | --- |
| `deploy/cloudflared/boke-video.yml.example` | Tunnel設定例 |
| `deploy/ovenmediaengine/Server.xml.example` | OvenMediaEngine設定例 |
| `deploy/systemd/*.service` | systemdユニット例 |

## 確認

```sh
curl -fsS http://127.0.0.1:8080/healthz
sudo systemctl status boke-video.service
sudo systemctl status cloudflared-boke-video.service
sudo systemctl status ovenmediaengine.service
```

ブラウザでは`https://bokevideo.example.com`へAccessログインし、視聴画面と管理画面を確認します。
