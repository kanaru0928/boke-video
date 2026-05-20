# 認証とセキュリティ

本番の正本は`docs/deployment.md`です。このファイルは認証境界だけを補足します。

## Access JWT

Cloudflare Accessは`bokevideo.example.com`と`stream.example.com`を保護します。Goバックエンドは`Cf-Access-Jwt-Assertion`の署名、`aud`、`iss`、`exp`、`sub`を検証します。

アプリケーション独自のログイン、セッション、パスワード管理、アカウント管理、管理者ロールは持ちません。

## 所有者判定

動画枠の作成者はAccess JWTの`sub`で保存します。動画枠の更新、削除、保存済みコメント削除、WHIP Token再発行は、保存済み`owner_sub`とリクエストJWTの`sub`が一致する場合だけ許可します。

## WHIP入力

OBS入力はCloudflare Accessを通しません。Goバックエンドの`/live/*`でWHIPの`Authorization: Bearer`を検証し、成功したリクエストだけをOvenMediaEngineへ転送します。

WHIP Bearer Tokenの平文は作成時または再発行時だけ返します。DBにはハッシュだけを保存します。
