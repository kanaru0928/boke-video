# 映像配信

本番の正本は`docs/deployment.md`です。このファイルは映像仕様だけを補足します。

## 経路

```text
OBS
  -> WHIP/WebRTC
  -> Go /live/* Bearer検証
  -> OvenMediaEngine
  -> WebRTC
  -> ブラウザ
```

GoバックエンドはWHIPシグナリングを認証して転送します。WebRTC mediaの受信と視聴者への配信はOvenMediaEngineが担当します。

## OBS

| 項目 | 値 |
| --- | --- |
| サービス | `WHIP` |
| ローカルサーバー | `http://127.0.0.1:8080/live/<roomId>?direction=whip` |
| 本番サーバー | `https://ingest.example.com/live/<roomId>?direction=whip` |
| 認証 | 管理画面で作成または再発行したBearer Token |

初期設定はH.264、Opus、30fps、キーフレーム間隔1秒、Bフレーム0、CBR、Simulcast3レイヤーです。

## OvenMediaEngine

OvenMediaEngineはコーデック変換を行いません。OBSのSimulcast3レイヤーを`video_bypass`として受け、`master` Playlistで視聴者へ配信します。

WebRTC Publisherは`Rtx`と`Ulpfec`を有効にし、`JitterBuffer`は有効にしません。視聴URLはGoバックエンドが短寿命のSignedPolicy URLとして発行します。

```text
ローカル: ws://127.0.0.1:3333/live/<roomId>/master
本番:    wss://rtc.example.com/live/<roomId>/master
```

## ポート

```text
443/tcp          WHIP認証入口とWebRTC視聴のHTTPS/WSSシグナリング
3333/tcp         Oracle内部のOvenMediaEngine HTTPシグナリング
10000-10005/udp  WebRTC media
```

`3333/tcp`は公開しません。OvenMediaEngineのProviderは内部`3333/tcp`だけで受け、Publisherは公開`443/tcp`で視聴者向けWebRTCシグナリングを受けます。ICE候補にはOracleのグローバルIPを明示します。

## ローカルデバッグ

別シェルで起動します。

```sh
pnpm demo:media
pnpm dev
```

OBSには管理画面で作成した動画枠のWHIP URLとBearer Tokenを入れます。OBSからOvenMediaEngineの`3333/tcp`へ直接入れません。

確認項目は次です。

- OBSの配信状態が開始になる
- OvenMediaEngineログに`Stream has been prepared`が出る
- OvenMediaEngineログに`WebRTC Stream has been created`が出る
- ブラウザで`http://127.0.0.1:5173/watch?room=<roomId>`を開くと映像が出る
- WebRTC Publisherログが`Rtx(true) Ulpfec(true) JitterBuffer(false)`になる
