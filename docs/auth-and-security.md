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

## 枠の合言葉（パスワード）

枠ごとに合言葉を設定できます。合言葉が設定された枠は、`POST /api/rooms/:roomId/stream-access`でパスワードまたはバイパストークンが一致しない限り映像アクセスを拒否します（HTTP 403）。コメント投稿、統計取得、来場記録などの他のAPIは合言葉の影響を受けません。

合言葉はランダムな16バイトのソルトを付けてSHA-256でハッシュしDBに保存します。平文はDBに保存しません。

バイパストークンは合言葉とは独立した32バイトの乱数トークンです。SHA-256ハッシュをDBに保存し、平文は管理者への返却時のみ使用します。バイパスURL（`/watch?room=<id>&bypass=<token>`）を知っているユーザーは合言葉を入力せずに視聴できます。バイパストークンを再発行すると旧トークンは無効になります。バイパストークンからは合言葉を逆算できません。

合言葉を解除すると同時にバイパストークンも削除します。
