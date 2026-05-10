# フロントエンド

## 方針

フロントエンドはVite、React、TypeScriptで実装します。

Cloudflare Workersで静的アセットとして配信します。

## 責務

- MPEG-DASH映像を再生する
- コメント入力UIを表示する
- コメントWebSocketへ接続する
- 受信コメントを映像上へ描画する
- 横方向と縦方向のコメントレーンを制御する
- 管理画面を表示する

## 実装構成

- 画面表示はReactコンポーネントに置きます。
- WebSocket、DASHプレイヤー、ルーム取得などの副作用はカスタムフックに置きます。
- コメントの方向ラベル、配信状態の判定などの純粋な変換処理は関数として分離します。

## 設定

```text
VITE_API_BASE_URL=https://stream.example.com
VITE_STREAM_BASE_URL=https://stream.example.com
VITE_COMMENT_WS_URL=wss://stream.example.com
```

## デプロイ

デプロイ手順は`docs/deployment.md`を参照します。Wrangler設定は`frontend/wrangler.jsonc`です。`frontend/dist`をWorkers Assetsとして配信します。

Cloudflare AccessとTunnelの設定は`docs/cloudflare.md`を参照します。

## レスポンシブ

| 項目 | PC | スマホ |
| --- | --- | --- |
| コメント入力 | 映像横または下部 | 画面下部固定 |
| コメント同時表示 | 120件 | 45件 |
| 縦方向コメント | 有効 | 有効。ただし上限を少なくする |
| 管理画面 | リスト表示 | リスト表示 |
