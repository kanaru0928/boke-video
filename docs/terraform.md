# Terraform

Cloudflare側の本番設定は`infra/cloudflare`で管理します。このdocsの`example.com`はプレースホルダーです。実ドメインは`terraform.tfvars`にだけ書き、gitへ入れません。

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

Cloudflare API tokenは次の権限を持つものを使います。

| 権限 | 用途 |
| --- | --- |
| DNS Read、DNS Write | DNS record管理 |
| Access: Apps and Policies Read、Write | Access Application管理 |
| Cloudflare Tunnel Read、Write | Tunnel管理 |
| Workers Scripts Read、Write | Workers Custom Domain管理 |

```sh
cd infra/cloudflare
cp terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars`に実値を書きます。`team_name`は`https://<team_name>.cloudflareaccess.com`の`<team_name>`だけを書きます。

## 適用

```sh
export CLOUDFLARE_API_TOKEN="replace-with-api-token"
terraform init
terraform plan
terraform apply
```

既存のAccess ApplicationやTunnelをTerraform管理へ移す場合は、先に`terraform import`を実行します。importせずに`apply`すると、同名または同じdomainの新規リソース作成として扱われます。

## Oracleへ反映する値

`terraform apply`後に、バックエンド環境変数へ次を反映します。

```sh
terraform output -raw backend_access_audience
terraform output -raw access_issuer
terraform output -raw access_certs_url
```

cloudflaredはTerraformのremote Tunnel configを使います。tokenはsensitive outputなので、次でOracleの環境ファイルへ入れます。

```sh
sudo install -d /etc/boke-video
printf 'TUNNEL_TOKEN=%s\n' "$(terraform output -raw tunnel_token)" | sudo tee /etc/boke-video/cloudflared.env >/dev/null
sudo chmod 600 /etc/boke-video/cloudflared.env
sudo systemctl restart cloudflared-boke-video.service
```

## 管理者と視聴者

管理者は通常画面も使うため、Terraformでは`admin_emails`と`admin_email_domains`を視聴者向けAccess Applicationの許可条件にも含めます。管理画面と管理APIは管理者だけを許可します。
