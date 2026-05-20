# Cloudflare

## 構成

Cloudflare Accessは`video.example.com`と`stream.example.com`を保護します。WebRTC media経路はCloudflare Tunnelへ入れません。

```text
video.example.com
  ブラウザ
    -> Cloudflare edgeでAccess判定
    -> Cloudflare Workers

stream.example.com
  ブラウザ
    -> Cloudflare edgeでAccess判定
    -> Cloudflare Tunnel
    -> Goバックエンド 127.0.0.1:8080

ingest.example.com
  OBS
    -> Oracle上のTLS入口
    -> Goバックエンド /live/*
    -> OvenMediaEngine

rtc.example.com
  ブラウザ
    -> WebRTC Media Server
```

`ingest.example.com`と`rtc.example.com`はCloudflare AccessやCloudflare Tunnelを経由しません。`ingest.example.com`はWHIPのBearer TokenをGoバックエンドで検証します。WebRTC mediaはOracle VCNで開けたUDPポートへ直接流します。

GoバックエンドはCloudflare Accessが付与する`Cf-Access-Jwt-Assertion`を検証します。映像配信の詳細は`docs/streaming.md`を正本にします。

## サブドメインとDNS

| ホスト名 | 用途 | Cloudflare設定 | DNS |
| --- | --- | --- | --- |
| `video.example.com` | フロントエンド | Workers Custom Domain | Custom Domain作成時にCloudflareが作成 |
| `stream.example.com` | API、コメントWebSocket | Cloudflare Tunnel | `<tunnel-id>.cfargotunnel.com`へのCNAME |
| `ingest.example.com` | OBS WHIP入力 | Cloudflare proxyを使わない | OracleのグローバルIPへのDNS-only A/AAAA |
| `rtc.example.com` | 視聴者向けWebRTC | Cloudflare proxyを使わない | OracleのグローバルIPへのDNS-only A/AAAA |

Cloudflare Tunnelで扱うのは`stream.example.com`だけです。`ingest.example.com`はOracle上のTLS入口からGoバックエンドへ到達させます。`rtc.example.com`はOracle VCNでWebRTC Media Serverへ到達させます。

`video.example.com`はCloudflare WorkersのCustom Domainとして設定します。Workers RoutesではなくCustom Domainを使い、`video.example.com`全体をフロントエンドWorkerへ向けます。

`stream.example.com`はTunnelの公開ホスト名です。Cloudflare TunnelのDNS routeで`stream.example.com`を作成し、CNAMEを`<tunnel-id>.cfargotunnel.com`へ向けます。

`ingest.example.com`と`rtc.example.com`はWebRTC mediaの都合でCloudflare proxyを通しません。DNS-onlyにするとOracleのIPが公開されるため、Oracle VCNのSecurity ListまたはNetwork Security GroupとOS firewallで公開ポートを最小化します。`3333/tcp`はDNSから到達させず、公開するのは`443/tcp`と`10000-10005/udp`だけです。

## Access Application

Cloudflare Zero TrustでSelf-hosted applicationを作成します。Accessはdeny by defaultです。許可するユーザーまたはグループをAllow policyで明示します。

| 対象 | Application domain | ポリシー |
| --- | --- | --- |
| 通常画面 | `video.example.com` | 視聴者を許可 |
| 管理画面 | `video.example.com/admin*` | 管理者だけ許可 |
| バックエンド | `stream.example.com` | 視聴者を許可 |
| 管理API | `stream.example.com/api/admin/*` | 管理者だけ許可 |

管理画面と管理APIへ到達できるユーザーはCloudflare Accessのポリシーで制限します。Goバックエンドは管理APIへ到達したリクエストのJWTを検証し、動画枠単位の所有者判定をJWTの`sub`で行います。アプリ内ロールは保存しません。

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
    originRequest:
      access:
        required: true
        teamName: replace-with-team-name
        audTag:
          - replace-with-access-aud-tag
  - service: http_status:404
```

Tunnelを作成したら、DNSで`stream.example.com`をTunnelへ向けます。本番ではsystemdの`cloudflared-boke-video.service`で次を実行します。

`originRequest.access`でもAccess JWTを検証します。Goバックエンドでも`Cf-Access-Jwt-Assertion`を検証するため、Tunnel境界とアプリ境界の両方でJWT検証を行います。

```sh
cloudflared tunnel --config /etc/cloudflared/boke-video.yml run
```

## フロントエンド設定

フロントエンドのビルド時に次を設定します。

```text
VITE_API_BASE_URL=https://stream.example.com
VITE_COMMENT_WS_URL=wss://stream.example.com
```

Goバックエンドの`ALLOWED_ORIGINS`にはフロントエンドのoriginを入れます。

```text
ALLOWED_ORIGINS=https://video.example.com
```

## 本番デプロイ確認

```sh
curl -fsS http://127.0.0.1:8080/healthz
sudo systemctl status boke-video.service
sudo systemctl status cloudflared-boke-video.service
sudo systemctl status ovenmediaengine.service
```

ブラウザでは`https://video.example.com`へアクセスし、Cloudflare Accessログイン後に視聴画面が表示されることを確認します。

## 参考

- Cloudflare Workers Custom Domains: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Cloudflare Tunnel locally-managed tunnel: https://developers.cloudflare.com/tunnel/advanced/local-management/create-local-tunnel/
- Cloudflare Tunnel configuration file: https://developers.cloudflare.com/tunnel/advanced/local-management/configuration-file/
- Cloudflare Tunnel protocols: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/protocols/
- Cloudflare Tunnel routing and DNS records: https://developers.cloudflare.com/tunnel/routing/
- Cloudflare DNS proxy status: https://developers.cloudflare.com/dns/manage-dns-records/reference/proxied-dns-records/
- Cloudflare exposed origin IP addresses: https://developers.cloudflare.com/dns/manage-dns-records/troubleshooting/exposed-ip-address/
- Cloudflare Access JWT validation: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- Cloudflare Access application: https://developers.cloudflare.com/learning-paths/clientless-access/access-application/create-access-app/
- Cloudflare Access application paths: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
