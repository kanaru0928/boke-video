# デプロイ

## 正本

デプロイで参照する仕様は次です。

| 内容 | 正本 |
| --- | --- |
| Accessポリシーとセキュリティ | `docs/auth-and-security.md` |
| Cloudflare AccessとTunnel | `docs/cloudflare.md` |
| OBS入力とMediaMTX | `docs/streaming.md` |
| バックエンド環境変数 | `docs/backend.md` |
| フロントエンド環境変数 | `docs/frontend.md` |

## 配置サンプル

| ファイル | 用途 |
| --- | --- |
| `deploy/cloudflared/boke-video.yml.example` | Cloudflare Tunnel設定例 |
| `deploy/mediamtx.yml` | MediaMTX本番設定例 |
| `deploy/ffmpeg-dash.example.sh` | ffmpeg変換スクリプト例 |
| `deploy/systemd/*.service` | systemdユニット例 |

## フロントエンド

```sh
pnpm deploy:frontend
```

## バックエンド

`/etc/boke-video/backend.env`を配置します。

Cloudflare AccessとTunnelの手順は`docs/cloudflare.md`です。

## OBS入力

`deploy/mediamtx.yml`の`replace-with-strong-password`を本番値へ変更して配置します。

## systemd

systemdで次を管理します。

```text
boke-video.service
cloudflared-boke-video.service
mediamtx-boke-video.service
boke-video-obs-packager.service
```

配置例は`deploy/systemd/`にあります。

## 動作確認

```sh
curl -fsS http://127.0.0.1:8080/healthz
sudo systemctl status boke-video.service
sudo systemctl status cloudflared-boke-video.service
sudo systemctl status mediamtx-boke-video.service
sudo systemctl status boke-video-obs-packager.service
```
