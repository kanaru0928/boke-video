# Cloudflare

本番の正本は`docs/deployment.md`です。このファイルはCloudflare作業だけを補足します。

このdocsの`example.com`はプレースホルダーです。Cloudflare上では実ドメインの既存Access PolicyとZoneに合わせます。

Terraformで管理する場合は`docs/terraform.md`を参照します。
実値はリポジトリトップの`.env.production`へ書き、`pnpm env:sync:production`でCloudflare Terraformと各配置envへ反映します。

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

| 対象 | Application domain | Access Policy |
| --- | --- | --- |
| フロントエンド | `bokevideo.example.com` | 既存ポリシー |
| 管理画面 | `bokevideo.example.com/admin*` | 既存ポリシー |
| バックエンド | `stream.example.com` | 既存ポリシー |
| 管理画面用API | `stream.example.com/api/admin/*` | 既存ポリシー |

GoバックエンドはAccess JWTの署名、`aud`、`iss`、`exp`、`sub`を検証します。`sub`は動画枠所有者とユーザー設定の紐づけに使います。コメント表示名はユーザー設定で保存した`displayName`だけを使用し、メールアドレス、Access JWTの`name`、`sub`へのフォールバックはしません。メールアドレスは保存しません。

## Tunnel

Tunnelは`stream.example.com`だけをGoバックエンドへ転送します。Terraformではremote Tunnel configを管理し、Oracle上のcloudflaredはtokenで起動します。ローカル管理のYAMLは使いません。

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
