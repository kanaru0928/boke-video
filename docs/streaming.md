# 映像配信

## 方針

最新OBSと最新ブラウザを前提に、映像配信はWebRTCで統一します。

```text
OBS
  -> WHIP/WebRTC
  -> WebRTC Media Server
  -> OvenMediaEngine WebRTC
  -> ブラウザ
```

Goバックエンドは映像を中継しません。映像の受信と視聴者への配信はWebRTC Media Serverが担当します。

## OBS入力

OBSはWHIPでWebRTC Media Serverへ配信します。ローカルと本番でOBSに入れるパス構造は同じです。

| 項目 | 値 |
| --- | --- |
| サービス | `WHIP` |
| ローカルサーバー | `http://127.0.0.1:3333/live/<roomId>?direction=whip` |
| 本番サーバー | `https://ingest.example.com/live/<roomId>?direction=whip` |
| ローカル認証 | 空 |
| 本番認証 | 配信者用Bearer Token |

OBSはWHIP Simulcastで複数レイヤーを送信します。WebRTC Media Serverはコーデック変換を行わず、OvenMediaEngineのPlaylistで視聴者へ配信します。

初期設定は次を基準にします。

| 項目 | 値 |
| --- | --- |
| 映像コーデック | H.264 |
| 音声コーデック | Opus |
| FPS | 30 |
| キーフレーム間隔 | 1秒 |
| Bフレーム | 0 |
| レート制御 | CBR |
| サイマルキャスト合計レイヤー数 | 3 |

H.264はWebRTCブラウザで広く扱えるため、iPhone、Android、macOS、Windows、Linuxの最新ブラウザを対象にできます。

OBSのサイマルキャストは3レイヤーを使用します。OvenMediaEngineは各レイヤーを`video_bypass`として受け、`master` Playlistで視聴者へ配信します。

## WebRTC Media Server

WebRTC Media ServerはOracle上で動かします。第一候補はOvenMediaEngineです。

必須要件は次です。

- WHIP入力を受けられる
- WebRTC出力を提供できる
- 視聴者100人未満を1台で扱える
- WebRTC media用UDPポートを固定または狭い範囲に制限できる
- WHIP入力とWebRTC視聴の認証を外部トークンで制御できる

映像変換は行いません。

OvenMediaEngineのWebRTC Publisherでは、UDP向けの再送と前方誤り訂正として`Rtx`と`Ulpfec`を有効にします。`JitterBuffer`は有効にしません。`JitterBuffer`はA/V同期の均等出力用であり、低遅延の既定構成には入れません。

## ブラウザ再生

フロントエンドはGoバックエンドから署名済み再生URLを取得し、そのURLでWebRTC Media Serverへ接続します。OvenMediaEngineの再生URLはSimulcast Playlistの`master`を使います。

```text
ws://127.0.0.1:3333/live/main/master
```

本番では次の形式になります。

```text
wss://rtc.example.com/live/main/master
```

Goバックエンドは次の環境変数から署名済み再生URLを発行します。

```text
STREAM_PUBLIC_BASE_URL=http://127.0.0.1:3333
STREAM_SIGNING_SECRET=local-stream-signing-secret
```

`STREAM_SIGNING_SECRET`はOvenMediaEngineの`SignedPolicy`の`SecretKey`と同じ値にします。

ブラウザはOvenMediaEngineのWebSocketシグナリングで接続を開始し、mediaはOracle VCNで開けたUDPポートへ流れます。

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
443/tcp          WHIP入力とWebRTC視聴のHTTPS/WSSシグナリング
10000-10005/udp  WebRTC media
```

実際のUDP範囲は採用するWebRTC Media Serverの設定値を正本にします。配信者用WHIPと視聴者用WebRTCはホスト名を分けます。

```text
ingest.example.com  配信者OBS用
rtc.example.com     視聴者ブラウザ用
```

OvenMediaEngineのICE候補には、配信者と視聴者が到達できるグローバルIPを明示します。`*`はDocker bridge、VPN、内部NICなどの到達不能な候補を配るため、本番設定では使いません。

## ローカルデバッグ

ローカルでは次の2つを別シェルで起動します。

```sh
pnpm demo:media
pnpm dev
```

`pnpm demo:media`はDocker Desktop上のOvenMediaEngineを起動します。OBSから見るmedia経路はmacOSからDocker DesktopのLinux VMを経由するため、本番OracleのUDP直接受信とは同一ではありません。

ローカルで確認する項目は次です。

- OBSの配信状態が開始になる
- OvenMediaEngineログに`Stream has been prepared`が出る
- OvenMediaEngineログに`WebRTC Stream has been created`が出る
- ブラウザで`http://127.0.0.1:5173/watch?room=<roomId>`を開くと映像が出る
- WebRTC Publisherログが`Rtx(true) Ulpfec(true) JitterBuffer(false)`になる

設定変更後は`pnpm demo:media`を再起動し、OBSも配信停止してから再開します。OvenMediaEngineは`Server.xml`を起動時に読み込みます。

ローカルで`RtpVideoJitterBuffer`の`Invalid frame`が多発する場合、受信側でRTPフレームを完全に組み立てられていません。まずOBSのBフレームが0、キーフレーム間隔が1秒、サイマルキャスト合計レイヤー数が3であることを確認します。そのうえでDocker Desktop経路のUDP転送に依存する問題か、Oracle上のOvenMediaEngineでも再現する問題かを切り分けます。

## 認証

WHIP入力は配信者用Bearer Tokenで保護します。OBSにはWHIP URLとBearer Tokenを設定します。

視聴は、Cloudflare Accessで視聴画面へ入ったユーザーに対してGoバックエンドが短寿命トークンを発行し、そのトークンをOvenMediaEngineのシグナリングへ渡します。

UDP media自体をCloudflare Accessで保護しません。認証済みのWHIP入力とWebRTC視聴シグナリングから成立したWebRTC接続だけがmediaを送受信します。

## 100人視聴時の負荷

WebRTC Media Serverは視聴者ごとにmediaを送信します。上り帯域は視聴者数に比例します。

| 映像ビットレート | 同時100人の上り帯域 |
| --- | ---: |
| 800kbps | 約80Mbps |
| 1.5Mbps | 約150Mbps |
| 3Mbps | 約300Mbps |
