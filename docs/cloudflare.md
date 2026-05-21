# Cloudflare

本番の正本は`docs/deployment.md`です。このファイルはCloudflare作業だけを補足します。

このdocsの`example.com`はプレースホルダーです。Cloudflare上では実ドメインの既存Access ApplicationとTunnel設定に合わせます。

Terraformで管理する場合は`docs/terraform.md`を参照します。

## DNS

| ホスト名 | 設定 |
| --- | --- |
| `bokevideo.example.com` | Workers Custom Domain |
| `stream.example.com` | TunnelのDNS route、`<tunnel-id>.cfargotunnel.com`へのCNAME |
| `ingest.example.com` | Oracle IPへのDNS-only A/AAAA |
| `rtc.example.com` | Oracle IPへのDNS-only A/AAAA |

`ingest.example.com`と`rtc.example.com`はCloudflare proxyを使いません。Oracle VCNとOS firewallで公開ポートを`443/tcp`と`10000-10005/udp`に限定します。`3333/tcp`は公開しません。

`443/tcp`はOracle上のCaddyが受けます。`ingest.example.com`はGoバックエンド`127.0.0.1:8080`へ転送し、`rtc.example.com`はOvenMediaEngine`127.0.0.1:3333`へ転送します。

## Access

Access Applicationはdeny by defaultにします。

| 対象 | Application domain | 許可 |
| --- | --- | --- |
| 視聴画面 | `bokevideo.example.com` | 視聴者 |
| 管理画面 | `bokevideo.example.com/admin*` | 管理者 |
| バックエンド | `stream.example.com` | 視聴者 |
| 管理API | `stream.example.com/api/admin/*` | 管理者 |

GoバックエンドはAccess JWTの署名、`aud`、`iss`、`exp`、`sub`を検証します。`sub`は動画枠所有者の判定に使います。

## Tunnel

Tunnelは`stream.example.com`だけをGoバックエンドへ転送します。Terraformではremote Tunnel configを管理し、Oracle上のcloudflaredはtokenで起動します。

ローカル管理のYAMLを使う場合は`deploy/cloudflared/boke-video.yml.example`を参照します。ただしTerraformのremote Tunnel configと同時には使いません。

## 参考

- Cloudflare Workers Custom Domains: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Cloudflare Tunnel routing and DNS records: https://developers.cloudflare.com/tunnel/routing/
- Cloudflare Tunnel configuration file: https://developers.cloudflare.com/tunnel/advanced/local-management/configuration-file/
- Cloudflare DNS proxy status: https://developers.cloudflare.com/dns/manage-dns-records/reference/proxied-dns-records/
- Cloudflare exposed origin IP addresses: https://developers.cloudflare.com/dns/manage-dns-records/troubleshooting/exposed-ip-address/
- Cloudflare Access JWT validation: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- Cloudflare Access application paths: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
- Caddy Automatic HTTPS: https://caddyserver.com/docs/automatic-https
- Caddy reverse_proxy: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
