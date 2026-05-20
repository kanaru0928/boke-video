# Boke Video

100人規模の組織内ライブ配信用プロジェクトです。

## 構成

```text
backend/   Goバックエンド
frontend/  ViteとTypeScriptのフロントエンド
deploy/    systemd、cloudflaredの配置サンプル
docs/      仕様
```

## ドキュメント

仕様は`docs/`を正本にします。

| ファイル | 内容 |
| --- | --- |
| `docs/streaming.md` | OBS WHIP入力、OvenMediaEngine、WebRTC視聴 |
| `docs/comments.md` | コメント仕様 |
| `docs/auth-and-security.md` | Cloudflare Access、管理者判定、セキュリティ |
| `docs/cloudflare.md` | Cloudflare Access、Tunnel、Oracle VCN |
| `docs/backend.md` | Goバックエンド、API、SQLite、環境変数 |
| `docs/frontend.md` | フロントエンド、Workers |
| `docs/deployment.md` | デプロイ手順 |

## ローカル開発

```sh
pnpm install
pnpm demo:media
pnpm dev
```

`pnpm demo:media`はOvenMediaEngineをDockerで起動し、`127.0.0.1:3333`でOBSのWHIP入力とブラウザのWebRTC視聴を受けます。OBSのサーバーには`http://127.0.0.1:3333/live/<roomId>?direction=whip`を入れ、Bearer Tokenは空にします。

ブラウザは`http://127.0.0.1:5173/?room=<roomId>`を開きます。再生URLはGoバックエンドが`ws://127.0.0.1:3333/live/<roomId>/master`として発行するため、手入力しません。

## 検証

```sh
pnpm check
```
