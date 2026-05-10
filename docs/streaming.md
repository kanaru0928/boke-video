# 映像配信

## 方針

低遅延を優先するため、ブラウザ再生はMPEG-DASHではなくMediaMTXのWebRTC/WHEPを使います。Goバックエンドは映像を中継しません。

```text
OBS
  -> MediaMTX
  -> WebRTC/WHEP
  -> ブラウザ
```

コメントとAPIはGoバックエンド、映像はMediaMTXに分けます。

## OBS入力

OBSはMediaMTXへWHIPで配信します。

| 項目 | 値 |
| --- | --- |
| サービス | `WHIP` |
| サーバー | `https://media.example.com/live/main/whip` |

OBS側はBフレームを0にし、キーフレーム間隔を0.5秒にします。720p/30fpsでは映像ビットレートを1.5Mbpsから2Mbpsにします。音声はOpusを使います。

ローカルでは`pnpm dev:obs:local`の起動ログに出る`OBS_WHIP_SERVER`を使います。

## MediaMTX

本番設定例は`deploy/mediamtx.yml`です。

- WebRTC/WHEPは`:8889`で待ち受けます。
- WebRTC mediaは`:8189/udp`を使います。
- RTMP、HLS、SRTは無効化します。
- `publisher`ユーザーに`live/*`へのpublish権限を与えます。

MediaMTX公式ドキュメントでは、ブラウザは`/whep`のURLでWebRTCストリームを読めます。OBSはWHIPでMediaMTXへpublishできます。

## ブラウザ再生

フロントエンドは次のURLへWHEP接続します。

```text
https://media.example.com/live/main/whep
```

環境変数は次です。

```text
VITE_STREAM_BASE_URL=https://media.example.com
```

ローカルでは`http://127.0.0.1:8889`を使います。

## 100人視聴時の負荷

WebRTCは視聴者ごとにMediaMTXから映像を送ります。サーバーCPUはDASH変換より軽くなりますが、上り帯域は視聴者数に比例します。

| 映像ビットレート | 同時100人の上り帯域 |
| --- | ---: |
| 800kbps | 約80Mbps |
| 1.5Mbps | 約150Mbps |
| 3Mbps | 約300Mbps |

100人を1台で扱う場合は、720p/30fps、1.5Mbps以下を初期値にします。視聴者数や回線が増える場合は、MediaMTXのread replicaを追加します。

## Cloudflareとの関係

Cloudflare TunnelはAPIとWebSocket用です。低遅延映像のmedia経路をCloudflare Tunnelへ入れません。

本番で外部視聴させる場合は、MediaMTXのWHEP用HTTPポートとWebRTC用UDPポートを到達可能にします。UDPを開けられない環境ではTURNを使いますが、その場合も遅延と帯域負荷は増えます。
