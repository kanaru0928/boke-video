# フロントエンド

## 方針

フロントエンドはVite、TypeScript、素のDOM APIで実装します。Reactは使いません。

Cloudflare Workersで静的アセットとして配信します。

## 責務

- MPEG-DASH映像を再生する
- コメント入力UIを表示する
- コメントWebSocketへ接続する
- 受信コメントを映像上へ描画する
- 横方向と縦方向のコメントレーンを制御する
- 管理画面を表示する

## 設定

```text
VITE_API_BASE_URL=https://stream.example.com
VITE_STREAM_BASE_URL=https://stream.example.com
VITE_COMMENT_WS_URL=wss://stream.example.com
```

## デプロイ

デプロイ手順は`docs/deployment.md`を参照します。Wrangler設定は`frontend/wrangler.jsonc`です。`frontend/dist`をWorkers Assetsとして配信します。

## レスポンシブ

| 項目 | PC | スマホ |
| --- | --- | --- |
| コメント入力 | 映像横または下部 | 画面下部固定 |
| コメント同時表示 | 120件 | 45件 |
| 縦方向コメント | 有効 | 有効。ただし上限を少なくする |
| 管理画面 | リスト表示 | リスト表示 |
