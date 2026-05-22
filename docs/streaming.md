# 映像配信

本番の正本は`docs/deployment.md`です。このファイルは映像仕様だけを補足します。

## 経路

```text
OBS
  -> WHIP/WebRTC
  -> Caddy
  -> Go /live/* Bearer検証
  -> OvenMediaEngine
  -> WebRTC
  -> Caddy
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

OBSのサイマルキャストに対応しています。サイマルキャストは、同じ映像を複数の画質で同時に送る設定です。OBSでは`設定` > `配信` > `サイマルキャスト` > `合計レイヤー数`を`3`にします。

## OvenMediaEngine

OvenMediaEngineはコーデック変換を行いません。OBSのSimulcast3レイヤーを`video_bypass`として受け、`master` Playlistで自動ABR配信します。個別画質は`layer-1`、`layer-2`、`layer-3`のPlaylistで配信し、GoバックエンドはOvenMediaEngineのStream APIで実在するPlaylistだけを署名して返します。

WebRTC Publisherは`TransportCC`で帯域推定し、`JitterBuffer`を有効にします。`Rtx`と`Ulpfec`はローカルのOBS WHIP SimulcastでRTP履歴探索ログが増え続けるため無効にします。視聴URLはGoバックエンドが短寿命のSignedPolicy URLとして発行します。

```text
ローカル: ws://127.0.0.1:3333/live/<roomId>/master
本番:    wss://rtc.example.com/live/<roomId>/master
```

## ポート

公開ポートは`docs/deployment.md`を参照します。OvenMediaEngineの内部ポートは次です。

```text
3333/tcp   HTTPシグナリング
8081/tcp   REST API
20080/tcp  Thumbnail Publisher
```

`3333/tcp`、`8081/tcp`、`20080/tcp`は公開しません。REST APIとThumbnail PublisherはGoバックエンドだけが参照します。

## 本番OvenMediaEngine

OBS WHIP Simulcast構成はOvenMediaEngine v0.20.5のネイティブ実行で動作確認済みです。

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
- WebRTC Publisherログが`Rtx(false) Ulpfec(false) JitterBuffer(true)`になる
