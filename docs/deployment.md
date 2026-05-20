# デプロイ

## 正本

デプロイで参照する仕様は次です。

| 内容 | 正本 |
| --- | --- |
| Accessポリシーとセキュリティ | `docs/auth-and-security.md` |
| Cloudflare AccessとTunnel | `docs/cloudflare.md` |
| OBS入力とWebRTC Media Server | `docs/streaming.md` |
| バックエンド環境変数 | `docs/backend.md` |
| フロントエンド環境変数 | `docs/frontend.md` |

## 配置サンプル

| ファイル | 用途 |
| --- | --- |
| `deploy/cloudflared/boke-video.yml.example` | Cloudflare Tunnel設定例 |
| `deploy/ovenmediaengine/Server.xml.example` | OvenMediaEngine設定例 |
| `deploy/systemd/*.service` | systemdユニット例 |

## フロントエンド

```sh
pnpm deploy:frontend
```

## バックエンド

`/etc/boke-video/backend.env`を配置します。

Cloudflare AccessとTunnelの手順は`docs/cloudflare.md`です。

## 映像配信

OvenMediaEngineをOracle上に配置します。設定値は`docs/streaming.md`を正本にします。

`deploy/ovenmediaengine/Server.xml.example`の`${PublicIP}`は、配信者と視聴者が到達できるOracleのグローバルIPへ置き換えます。`10000-10005/udp`はVCNのSecurity ListまたはNetwork Security GroupとOS firewallの両方で開けます。

OBS入力は`https://ingest.example.com/live/<roomId>?direction=whip`です。視聴者ブラウザはGoバックエンドから`wss://rtc.example.com/live/<roomId>/master`の署名済みURLを受け取ります。

## systemd

systemdで次を管理します。

```text
boke-video.service
cloudflared-boke-video.service
ovenmediaengine.service
```

配置例は`deploy/systemd/`にあります。

## 動作確認

```sh
curl -fsS http://127.0.0.1:8080/healthz
sudo systemctl status boke-video.service
sudo systemctl status cloudflared-boke-video.service
sudo systemctl status ovenmediaengine.service
```
