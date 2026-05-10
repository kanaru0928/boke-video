# Boke Video

100人規模の組織内ライブ配信用プロジェクトです。

## 構成

```text
backend/   Goバックエンド
frontend/  ViteとTypeScriptのフロントエンド
deploy/    systemd、cloudflared、MediaMTX、ffmpegの配置サンプル
docs/      仕様
```

## ドキュメント

仕様は`docs/`を正本にします。

| ファイル | 内容 |
| --- | --- |
| `docs/streaming.md` | OBS入力、MediaMTX、ffmpeg、MPEG-DASH |
| `docs/comments.md` | コメント仕様 |
| `docs/auth-and-security.md` | Cloudflare Access、管理者判定、セキュリティ |
| `docs/backend.md` | Goバックエンド、API、SQLite、環境変数 |
| `docs/frontend.md` | フロントエンド、Workers |
| `docs/deployment.md` | デプロイ手順 |

## ローカル開発

```sh
pnpm install
pnpm dev:mock
pnpm dev:obs
```

`pnpm dev:mock`はダミーライブ配信です。`pnpm dev:obs`はローカルOBS入力を使う開発用です。

OBS入力と認証の確認は、目的ごとに次のコマンドを使います。

| コマンド | 用途 |
| --- | --- |
| `pnpm dev:obs:local` | OBS入力を認証なしで確認します。 |
| `pnpm dev:obs:auth` | OBS入力のMediaMTX認証をローカルで確認します。 |
| `pnpm dev:obs:cloudflare` | Cloudflare AccessのJWT検証を実際のAccess URL経由で確認します。 |

`pnpm dev:obs:auth`のOBS設定は、起動ログの`OBS_RTMP_SERVER`をサーバーへ入れ、ストリームキーを空欄にします。デフォルトの認証情報は`publisher`と`local-password`です。

`pnpm dev:obs:cloudflare`は次の環境変数が必要です。

```sh
ACCESS_ENABLED=true
ACCESS_AUDIENCE=Cloudflare Accessのaud
ACCESS_ISSUER=https://チーム名.cloudflareaccess.com
ACCESS_CERTS_URL=https://チーム名.cloudflareaccess.com/cdn-cgi/access/certs
CLOUDFLARE_ACCESS_ORIGIN=https://Accessで保護したホスト名
```

Cloudflare Tunnelも同時に起動する場合は、追加で`CLOUDFLARE_TUNNEL_CONFIG`にcloudflared設定ファイルを指定します。

## 検証

```sh
pnpm check
```
