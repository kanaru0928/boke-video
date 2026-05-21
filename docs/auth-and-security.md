# 認証とセキュリティ

本番の正本は`docs/deployment.md`です。このファイルは認証境界だけを補足します。

## Access JWT

Cloudflare Accessは`bokevideo.example.com`と`stream.example.com`を保護します。Goバックエンドは`Cf-Access-Jwt-Assertion`の署名、`aud`、`iss`、`exp`、`sub`を検証します。

コメント表示名はユーザー設定で保存した`displayName`だけを使用します。プロフィール未作成時はUUIDv4を初期表示名として生成して保存します。メールアドレス、Access JWTの`name`、`sub`へのフォールバックはしません。メールアドレスは保存しません。

アプリケーション独自のログイン、セッション、パスワード管理、認証用アカウント管理、管理者ロールは持ちません。ユーザー設定はCloudflare Access JWTの`sub`に紐づく表示名だけを保存します。

## 所有者判定

動画枠の作成者はAccess JWTの`sub`で保存します。動画枠の更新、削除、保存済みコメント削除、WHIP Token再発行は、保存済み`owner_sub`とリクエストJWTの`sub`が一致する場合だけ許可します。

## WHIP入力

OBS入力はCloudflare Accessを通しません。Goバックエンドの`/live/*`でWHIPの`Authorization: Bearer`を検証し、成功したリクエストだけをOvenMediaEngineへ転送します。

WHIP Bearer Tokenの平文は作成時または再発行時だけ返します。DBにはハッシュだけを保存します。
