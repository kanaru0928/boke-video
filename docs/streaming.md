# 映像配信

## OBS入力

OBSはMediaMTXへRTMPで配信します。OBS設定はこの形に固定します。

| 項目 | 値 |
| --- | --- |
| サービス | カスタム |
| サーバー | `rtmp://obs.example.com/live/main?user=publisher&pass=strong-password` |
| ストリームキー | 空欄 |

MediaMTX公式ドキュメントでは、OBSのRTMP publishはServerに`rtmp://host/path`を入れ、Stream keyを空欄にします。MediaMTXのRTMP認証は`user`と`pass`のクエリパラメータで渡します。

OBS入力はDNS onlyでオリジンへ直接到達します。Cloudflare proxyによるIP秘匿やCloudflare Accessの認証はありません。

## MediaMTX

本番設定例は`deploy/mediamtx.yml`です。

- RTMPは`:1935`で受けます。
- RTSPは`127.0.0.1:8554`だけで待ち受けます。
- HLS、WebRTC、SRTは無効化します。
- `publisher`ユーザーに`live/*`へのpublish権限を与えます。
- ローカルホストだけにread権限を与え、ffmpegがRTSPを読みます。

`deploy/mediamtx.yml`の`replace-with-strong-password`は本番値へ変更します。

## ffmpeg

ffmpegはMediaMTXのRTSP出力を読み、MPEG-DASHを生成します。

```text
rtsp://127.0.0.1:8554/live/main
```

生成先はGoバックエンドの`STREAM_DATA_DIR`配下です。

```text
/var/lib/boke-video/streams/main/manifest.mpd
/var/lib/boke-video/streams/main/chunk-stream0-00001.m4s
```

## ブラウザ再生

ブラウザはGoバックエンドからMPEG-DASHを取得します。

```text
https://stream.example.com/live/main/manifest.mpd
```

フロントエンドでは`dash.js`を使います。初期目標遅延は3秒から5秒です。

## 画質

| 画質 | 解像度 | fps | 映像ビットレート目安 |
| --- | --- | ---: | ---: |
| 1080p | 1920x1080 | 30 | 5Mbps |
| 720p | 1280x720 | 30 | 3Mbps |
| 480p | 854x480 | 30 | 1.5Mbps |
| 360p | 640x360 | 30 | 800kbps |

実装ではまず720p/360pのDASH生成を扱います。1080p/480pはオンプレ回線とCPUに合わせて追加します。

## 帯域

100人が同時視聴する場合、オンプレ側の上り帯域が制約になります。

| 映像ビットレート | 同時100人の上り帯域 |
| --- | ---: |
| 800kbps | 約80Mbps |
| 1.5Mbps | 約150Mbps |
| 3Mbps | 約300Mbps |
| 5Mbps | 約500Mbps |
