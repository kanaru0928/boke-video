# アーキテクチャ

## 方針

Boke Videoは、100人規模の組織内ライブ配信を扱います。

通常の視聴画面、管理画面、MPEG-DASH、WebSocket、APIはCloudflare AccessとCloudflare Tunnelで保護します。OBSのRTMP入力だけはCloudflare DNSのDNS onlyで別経路にし、MediaMTX認証とファイアウォールで守ります。

アプリケーション独自のログイン、セッション、パスワード管理、アカウント管理は実装しません。

## 構成

```text
OBS
  |
  | RTMP
  | rtmp://obs.example.com/live/main?user=publisher&pass=strong-password
  v
Cloudflare DNS only
  |
  v
MediaMTX
  |
  | RTSP
  v
ffmpeg
  |
  | MPEG-DASHファイル生成
  v
Goバックエンド
  |
  | DASH、WebSocket、API
  v
Cloudflare Tunnel
  |
  v
Cloudflare Access
  |
  v
Cloudflare Workers
  |
  v
視聴者ブラウザ
```

## ドメイン

| 用途 | ホスト名 | Cloudflare設定 | 保護 |
| --- | --- | --- | --- |
| フロントエンド | `video.example.com` | Workers | Cloudflare Access |
| Goバックエンド | `stream.example.com` | Tunnel | Cloudflare Access |
| OBS入力 | `obs.example.com` | DNS only | MediaMTX認証、ファイアウォール |

`obs.example.com`はCloudflare proxyを無効にします。Cloudflare Access、Cloudflare Tunnel、Service TokenはRTMP入力には使いません。

## 非目標

- ブラウザからのライブ配信
- 複数配信者の同時入力
- 動画アーカイブ
- WebRTCによる超低遅延配信
- アプリケーション独自の認証機能
- OBS入力をCloudflare Accessで直接認証すること
- OBS利用者PCへ`cloudflared`を導入すること
