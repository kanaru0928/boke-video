# 映像配信

## 方針

最新OBSと最新ブラウザを前提に、映像配信はWebRTCで統一します。

```text
OBS
  -> WHIP/WebRTC
  -> WebRTC Media Server
  -> WHEP/WebRTC
  -> ブラウザ
```

Goバックエンドは映像を中継しません。映像の受信、視聴者への配信、Simulcastレイヤー選択はWebRTC Media Serverが担当します。

## OBS入力

OBSはWHIPでWebRTC Media Serverへ配信します。

| 項目 | 値 |
| --- | --- |
| サービス | `WHIP` |
| サーバー | `https://ingest.example.com/live/main/whip` |
| 認証 | Bearer Token |

OBSはWebRTC Simulcastを使います。複数画質はOBSから同時に送信します。WebRTC Media Serverはレイヤーを選択して配信し、コーデック変換は行いません。

初期設定は次を基準にします。

| 項目 | 値 |
| --- | --- |
| 映像コーデック | H.264 |
| 音声コーデック | Opus |
| FPS | 30 |
| キーフレーム間隔 | 1秒 |
| Bフレーム | 0 |
| レート制御 | CBR |
| 品質レイヤー | 1080p、720p、360p |

H.264はWebRTCブラウザで広く扱えるため、iPhone、Android、macOS、Windows、Linuxの最新ブラウザを対象にできます。

## WebRTC Media Server

WebRTC Media ServerはOracle上で動かします。第一候補はOvenMediaEngineです。

必須要件は次です。

- WHIP入力を受けられる
- WHEP出力を提供できる
- Simulcastを扱える
- 視聴者100人未満を1台で扱える
- WebRTC media用UDPポートを固定または狭い範囲に制限できる
- WHIPとWHEPの認証を外部トークンで制御できる

映像変換は原則として行いません。画質切り替えはOBSのSimulcastレイヤーをWebRTC Media Serverが選択して実現します。

## ブラウザ再生

フロントエンドはWHEPでWebRTC Media Serverへ接続します。

```text
https://rtc.example.com/live/main/whep
```

環境変数は次です。

```text
VITE_STREAM_BASE_URL=https://rtc.example.com
```

ブラウザはWHEPのHTTPシグナリングで接続を開始し、mediaはOracle VCNで開けたUDPポートへ流れます。

## 遅延目標

目標遅延は次です。

| 状態 | 遅延 |
| --- | ---: |
| 通常時 | 0.5秒から1.5秒 |
| 回線品質が低い視聴者を含む実運用 | 1秒から3秒 |

5秒未満を目標とするHTTP系の超低遅延配信ではなく、WebRTCで1秒台を狙います。

## Oracle VCN

Cloudflare TunnelはWebRTC media経路には使いません。WebRTC mediaはOracle VCNで直接到達可能にします。

公開するポートはWebRTC Media Serverの設定に合わせて最小化します。

```text
443/tcp          WHIP/WHEPのHTTPSシグナリング
10000-10005/udp  WebRTC media
```

実際のUDP範囲は採用するWebRTC Media Serverの設定値を正本にします。配信者用WHIPと視聴者用WHEPはホスト名を分けます。

```text
ingest.example.com  配信者OBS用
rtc.example.com     視聴者ブラウザ用
```

## 認証

WHIP入力は配信者用Bearer Tokenで保護します。OBSにはWHIP URLとBearer Tokenを設定します。

WHEP視聴は、Cloudflare Accessで視聴画面へ入ったユーザーに対してGoバックエンドが短寿命トークンを発行し、そのトークンをWHEPシグナリングへ渡します。

UDP media自体をCloudflare Accessで保護しません。認証済みのWHIP/WHEPシグナリングから成立したWebRTC接続だけがmediaを送受信します。

## 100人視聴時の負荷

WebRTC Media Serverは視聴者ごとにmediaを送信します。上り帯域は視聴者数に比例します。

| 視聴レイヤー | 同時100人の上り帯域 |
| --- | ---: |
| 360p 500kbps | 約50Mbps |
| 720p 1.5Mbps | 約150Mbps |
| 1080p 3Mbps | 約300Mbps |

全員が高画質を視聴する前提ではなく、Simulcastレイヤー選択で視聴者の回線に合わせます。
