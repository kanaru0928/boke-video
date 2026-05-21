# フロントエンド

## 方針

フロントエンドはVite、React、TypeScriptで実装します。

Cloudflare Workersで静的アセットとして配信します。

## 責務

- WebRTC Media ServerのWebRTC映像を再生する
- コメント入力UIを表示する
- コメントWebSocketへ接続する
- 受信コメントを映像上へ描画する
- トップページで配信枠一覧とサムネイルを表示する
- 横方向と縦方向のコメントレーンを制御する
- 管理画面を表示する

## 実装構成

- 画面表示はReactコンポーネントに置きます。
- WebSocket、OvenMediaEngineプレイヤー、ルーム取得、サムネイル再取得などの副作用はカスタムフックに置きます。
- コメントの方向ラベル、再生接続URL、視聴トークンの扱いなどの純粋な変換処理は関数として分離します。

## サムネイル

トップページの枠一覧はバックエンドが返す`thumbnailUrl`を使います。`thumbnailUrl`が空文字のときだけ、サムネイル待ちとしてマスコット表示を出します。再取得間隔は各枠の`thumbnailRefreshSeconds`を使い、一覧内で最も短い値に合わせます。

## 設定

API、OBS入力、コメントWebSocketの接続先はビルド時のVite環境変数で設定します。本番の設定値は`docs/deployment.md`を正本にします。

## デプロイ

デプロイ手順は`docs/deployment.md`を参照します。Wrangler設定は`frontend/wrangler.jsonc`です。`frontend/dist`をWorkers Assetsとして配信します。

## レスポンシブ

| 項目 | PC | スマホ |
| --- | --- | --- |
| コメント入力 | 映像横または下部 | 画面下部固定 |
| コメント同時表示 | 120件 | 45件 |
| 縦方向コメント | 有効 | 有効。ただし上限を少なくする |
| 管理画面 | リスト表示 | リスト表示 |
