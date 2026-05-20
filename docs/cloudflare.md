# Cloudflare

本番の正本は`docs/deployment.md`です。このファイルはCloudflare作業だけを補足します。

## DNS

| ホスト名 | 設定 |
| --- | --- |
| `bokevideo.example.com` | Workers Custom Domain |
| `stream.example.com` | TunnelのDNS route、`<tunnel-id>.cfargotunnel.com`へのCNAME |
| `ingest.example.com` | Oracle IPへのDNS-only A/AAAA |
| `rtc.example.com` | Oracle IPへのDNS-only A/AAAA |

`ingest.example.com`と`rtc.example.com`はCloudflare proxyを使いません。Oracle VCNとOS firewallで公開ポートを`443/tcp`と`10000-10005/udp`に限定します。`3333/tcp`は公開しません。

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

Tunnelは`stream.example.com`だけをGoバックエンドへ転送します。

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

## 参考

- Cloudflare Workers Custom Domains: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Cloudflare Tunnel routing and DNS records: https://developers.cloudflare.com/tunnel/routing/
- Cloudflare Tunnel configuration file: https://developers.cloudflare.com/tunnel/advanced/local-management/configuration-file/
- Cloudflare DNS proxy status: https://developers.cloudflare.com/dns/manage-dns-records/reference/proxied-dns-records/
- Cloudflare exposed origin IP addresses: https://developers.cloudflare.com/dns/manage-dns-records/troubleshooting/exposed-ip-address/
- Cloudflare Access JWT validation: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- Cloudflare Access application paths: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
