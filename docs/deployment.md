# デプロイ

このファイルを本番構成の正本にします。詳細な背景だけが必要な場合は、各専門docsを参照します。

このdocsの`example.com`はプレースホルダーです。実ドメイン、AccessのAUD tag、署名鍵、API tokenを含む`.env`実体はgitへ入れません。実値はリポジトリトップの`.env.production`へ書き、`pnpm env:sync:production`で各配置ファイルへ反映します。

## 全体構成

```text
bokevideo.example.com
  Browser -> Cloudflare Access -> Cloudflare Workers

stream.example.com
  Browser -> Cloudflare Access -> Cloudflare Tunnel -> Go 127.0.0.1:8080

ingest.example.com
  OBS -> Caddy -> Go /live/* -> OvenMediaEngine 127.0.0.1:3333

rtc.example.com
  Browser -> Caddy -> OvenMediaEngine WebRTC Publisher 127.0.0.1:3333
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

## Oracle入口

Oracleの`443/tcp`はCaddyが受けます。CaddyはTLSを終端し、Hostごとに内部サービスへ転送します。

```caddyfile
{$INGEST_HOST:ingest.example.com} {
	reverse_proxy 127.0.0.1:8080
}

{$RTC_HOST:rtc.example.com} {
	reverse_proxy 127.0.0.1:3333
}
```

OvenMediaEngineは公開TLS portを持ちません。WebRTCシグナリングはCaddyから内部`3333/tcp`へHTTP/WebSocketとして転送します。WebRTC mediaはCaddyを通らず、Oracleの`10000-10005/udp`へ直接到達します。

Caddyの実ホスト名は`/etc/boke-video/caddy.env`で指定します。systemd drop-inでCaddyへEnvironmentFileを渡します。

## 認証

Cloudflare Accessは`bokevideo.example.com`と`stream.example.com`を保護します。Goバックエンドは`Cf-Access-Jwt-Assertion`を検証し、署名、`aud`、`iss`、`exp`、`sub`を必須にします。

管理画面と管理APIへ到達できるユーザーはCloudflare Accessの既存ポリシーで制限します。アプリケーション独自の管理者ロールは持ちません。動画枠の更新、削除、コメント削除、WHIP Token再発行は、動画枠を作成したJWTの`sub`だけに許可します。

OBS入力はCloudflare Accessを通しません。Goの`/live/*`でWHIPの`Authorization: Bearer`を検証し、正しい動画枠のTokenだけをOvenMediaEngineへ転送します。Token平文は作成時または再発行時だけ返し、DBにはハッシュだけを保存します。

## Cloudflare設定

Cloudflare側の設定はTerraformで管理します。詳細は`docs/terraform.md`を参照します。

Access Applicationはdeny by defaultにします。

| 対象 | Application domain | Access Policy |
| --- | --- | --- |
| フロントエンド | `bokevideo.example.com` | 既存ポリシー |
| 管理画面 | `bokevideo.example.com/admin*` | 既存ポリシー |
| バックエンド | `stream.example.com` | 既存ポリシー |
| 管理画面用API | `stream.example.com/api/admin/*` | 既存ポリシー |

Tunnelは`stream.example.com`だけをGoへ転送します。Terraformのremote Tunnel configを使うため、Oracle上のcloudflaredはtokenで起動します。

```sh
printf 'TUNNEL_TOKEN=%s\n' "$(terraform -chdir=infra/cloudflare output -raw tunnel_token)" | sudo tee /etc/boke-video/cloudflared.env >/dev/null
sudo chmod 600 /etc/boke-video/cloudflared.env
```

## 環境変数

本番の入力は`.env.production`へ集約します。

```text
APP_DOMAIN=example.com
ORACLE_IPV4=203.0.113.10
CLOUDFLARE_ACCOUNT_ID=replace-with-account-id
CLOUDFLARE_ZONE_ID=replace-with-zone-id
CLOUDFLARE_ACCESS_TEAM_NAME=replace-with-team-name
CLOUDFLARE_ACCESS_POLICY_ID=replace-with-access-policy-id
CLOUDFLARE_MANAGEMENT_ACCESS_POLICY_ID=
CLOUDFLARE_ACCESS_AUDIENCE=replace-with-access-aud-tag
CLOUDFLARE_TUNNEL_TOKEN=replace-with-cloudflare-tunnel-token
STREAM_SIGNING_SECRET=replace-with-strong-secret
OME_API_ACCESS_TOKEN=replace-with-api-token
```

`pnpm env:sync:production`は、`.env.production`から`frontend/.env.production`、`deploy/backend/backend.env`、`deploy/caddy/caddy.env`、`deploy/cloudflared/cloudflared.env`、`infra/cloudflare/terraform.tfvars`を生成します。生成先はgitへ入れません。

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
| `deploy/caddy/Caddyfile.example` | OracleのTLS入口設定例 |
| `deploy/ovenmediaengine/Server.xml.example` | OvenMediaEngine設定例 |
| `deploy/systemd/*.service` | systemdユニット例 |
| `infra/cloudflare/*.tf` | Cloudflare Terraform設定 |
| `.env.production.example` | 本番env入力例 |
| `.env.local.example` | ローカルenv入力例 |

`deploy/backend/backend.env`、`deploy/caddy/caddy.env`、`deploy/cloudflared/cloudflared.env`、`frontend/.env`、`frontend/.env.production`、`backend/.env`、`infra/cloudflare/terraform.tfvars`は`pnpm env:sync:*`で生成します。生成ファイルはgitへ入れません。

## 本番配置

Goバックエンド、Caddy、cloudflared、OvenMediaEngineはsystemdで管理します。OvenMediaEngineはネイティブインストールを使います。Dockerはローカル開発用だけで使います。

```sh
id -u boke-video >/dev/null 2>&1 || sudo useradd --system --home /var/lib/boke-video --shell /usr/sbin/nologin boke-video
id -u cloudflared >/dev/null 2>&1 || sudo useradd --system --home /var/lib/cloudflared --shell /usr/sbin/nologin cloudflared
sudo install -d -o boke-video -g boke-video /var/lib/boke-video
sudo install -d /etc/boke-video
pnpm env:sync:production
sudo install -m 600 deploy/backend/backend.env /etc/boke-video/backend.env
sudo install -m 600 deploy/caddy/caddy.env /etc/boke-video/caddy.env
sudo install -m 600 deploy/cloudflared/cloudflared.env /etc/boke-video/cloudflared.env
sudo install -m 755 boke-video-server /usr/local/bin/boke-video-server
sudo install -m 644 deploy/systemd/boke-video.service /etc/systemd/system/boke-video.service
sudo install -m 644 deploy/systemd/cloudflared-boke-video.service /etc/systemd/system/cloudflared-boke-video.service
sudo install -m 644 deploy/caddy/Caddyfile.example /etc/caddy/Caddyfile
sudo install -d /etc/systemd/system/caddy.service.d
sudo install -m 644 deploy/systemd/caddy.service.d/boke-video.conf.example /etc/systemd/system/caddy.service.d/boke-video.conf
sudo install -m 644 deploy/ovenmediaengine/Server.xml.example /usr/share/ovenmediaengine/conf/Server.xml
sudo systemctl daemon-reload
```

## 確認

```sh
curl -fsS http://127.0.0.1:8080/healthz
sudo systemctl status boke-video.service
sudo systemctl status caddy.service
sudo systemctl status cloudflared-boke-video.service
sudo systemctl status ovenmediaengine.service
```

ブラウザでは`https://bokevideo.example.com`へAccessログインし、視聴画面と管理画面を確認します。
