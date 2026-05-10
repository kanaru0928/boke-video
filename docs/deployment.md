# デプロイ

詳細な手順は`deploy/README.md`に置きます。このファイルでは構成だけをまとめます。

## Cloudflare

| 用途 | ホスト名 | Cloudflare設定 |
| --- | --- | --- |
| フロントエンド | `video.example.com` | Workers+Access |
| Goバックエンド | `stream.example.com` | Tunnel+Access |
| OBS入力 | `obs.example.com` | DNS only |

OBS入力はCloudflare proxyを通しません。

## オンプレ

systemdで次を管理します。

```text
boke-video.service
cloudflared-boke-video.service
mediamtx-boke-video.service
boke-video-obs-packager.service
```

## 配置ファイル

| ファイル | 用途 |
| --- | --- |
| `deploy/cloudflared/boke-video.yml.example` | Cloudflare Tunnel設定例 |
| `deploy/mediamtx.yml` | MediaMTX本番設定例 |
| `deploy/ffmpeg-dash.example.sh` | ffmpeg変換スクリプト例 |
| `deploy/systemd/*.service` | systemdユニット例 |
