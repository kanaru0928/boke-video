# Terraform

Cloudflare側の本番設定は`infra/cloudflare`で管理します。このdocsの`example.com`はプレースホルダーです。実ドメインは`.env.production`にだけ書き、`pnpm env:sync:production`で`infra/cloudflare/terraform.tfvars`へ反映します。`.env.production`と`terraform.tfvars`はgitへ入れません。

## 管理対象

Terraformで管理する対象は次です。

| 対象 | Terraform |
| --- | --- |
| `stream.example.com` | TunnelへのCNAME、Cloudflare Access、Tunnel公開ホスト名 |
| `bokevideo.example.com` | Cloudflare Access、Workers Custom Domain |
| `ingest.example.com` | Oracle IPへのDNS-only A/AAAA |
| `rtc.example.com` | Oracle IPへのDNS-only A/AAAA |
| Tunnel token | sensitive output |

Workersのコードと静的アセットのアップロードはTerraformではなく`wrangler deploy`で行います。Oracle上のGoバックエンド、Caddy、OvenMediaEngine、systemdの配置もTerraformの管理対象外です。

`manage_worker_custom_domain=true`で適用する場合は、`worker_service_name`のWorkerがCloudflare上に存在している必要があります。まだ存在しない場合は先に`wrangler deploy`を1回実行するか、初回だけ`manage_worker_custom_domain=false`にします。

## 事前準備

Cloudflare API tokenは次の権限を持つものを使います。Account権限は対象Accountへ、Zone権限は対象Zoneへ絞ります。

| 権限 | スコープ | 用途 |
| --- | --- |
| DNS Read、DNS Write | Zone | DNS record管理 |
| Access: Apps and Policies Read、Write | Account | Access Application管理 |
| Cloudflare Tunnel Read、Write | Account | Tunnel管理 |
| Workers Scripts Read、Write | Account | Workers Custom Domain管理と`wrangler deploy` |

`CLOUDFLARE_API_TOKEN`はTerraformとWranglerの実行用です。`.env.production`に置きますが、`pnpm env:sync:production`は生成ファイルへ書きません。Terraform ProviderとWranglerが読むように、実行前にshellへexportします。

`wrangler deploy`でフロントエンドを配信する場合もCloudflareへの認証が必要です。Oracle上で`pnpm --dir frontend exec wrangler login`を実行するか、Workers Scriptsを操作できるAPI tokenを`CLOUDFLARE_API_TOKEN`として渡します。

```sh
cp .env.production.example .env.production
pnpm env:sync:production
```

`.env.production`に実値を書きます。`CLOUDFLARE_ACCESS_TEAM_NAME`は`https://<team_name>.cloudflareaccess.com`の`<team_name>`だけを書きます。

`CLOUDFLARE_ACCESS_POLICY_ID`には既存のCloudflare Access Policy IDを書きます。フロントエンドとバックエンドのAccess Applicationに同じPolicy IDを紐づけます。

IPv6を使う場合は`ORACLE_IPV6`を追加します。Worker名、Worker environment、Tunnel名を既定値から変える場合は`WORKER_SERVICE_NAME`、`WORKER_ENVIRONMENT`、`TUNNEL_NAME`を追加します。

`CLOUDFLARE_ACCESS_AUDIENCE`と`CLOUDFLARE_TUNNEL_TOKEN`はTerraform適用後に出る値です。最初の`terraform apply`前には書きません。

## 適用

```sh
set -a
. ./.env.production
set +a
terraform -chdir=infra/cloudflare init
terraform -chdir=infra/cloudflare plan
terraform -chdir=infra/cloudflare apply
```

既存のAccess ApplicationやTunnelをTerraform管理へ移す場合は、先に`terraform import`を実行します。importせずに`apply`すると、同名または同じdomainの新規リソース作成として扱われます。

## Oracleへ反映する値

`terraform apply`後に、バックエンドとcloudflaredの環境変数へTerraform outputを反映します。

```sh
{
  printf '\nCLOUDFLARE_ACCESS_AUDIENCE=%s\n' "$(terraform -chdir=infra/cloudflare output -raw backend_access_audience)"
  printf 'CLOUDFLARE_TUNNEL_TOKEN=%s\n' "$(terraform -chdir=infra/cloudflare output -raw tunnel_token)"
} >> .env.production
pnpm env:sync:production
```

cloudflaredはTerraformのremote Tunnel configを使います。

```sh
sudo install -m 600 deploy/cloudflared/cloudflared.env /etc/boke-video/cloudflared.env
sudo systemctl restart cloudflared-boke-video.service
```

## Access Policy

TerraformはAccess Applicationを作成し、既存のAccess Policy IDを紐づけます。メールアドレス、IdPグループ、許可ドメインなどの条件はCloudflare Access側のPolicyで管理します。このリポジトリのenvでは管理しません。
