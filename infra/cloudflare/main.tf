locals {
  frontend_hostname = "bokevideo.${var.zone_name}"
  stream_hostname   = "stream.${var.zone_name}"
  ingest_hostname   = "ingest.${var.zone_name}"
  rtc_hostname      = "rtc.${var.zone_name}"

  viewer_include = concat(
    [for email in var.viewer_emails : { email = { email = email } }],
    [for domain in var.viewer_email_domains : { email_domain = { domain = domain } }],
    [for email in var.admin_emails : { email = { email = email } }],
    [for domain in var.admin_email_domains : { email_domain = { domain = domain } }]
  )
  admin_include = concat(
    [for email in var.admin_emails : { email = { email = email } }],
    [for domain in var.admin_email_domains : { email_domain = { domain = domain } }]
  )
}

resource "random_id" "tunnel_secret" {
  byte_length = 32
}

resource "cloudflare_zero_trust_tunnel_cloudflared" "boke_video" {
  account_id    = var.cloudflare_account_id
  name          = var.tunnel_name
  config_src    = "cloudflare"
  tunnel_secret = random_id.tunnel_secret.b64_std
}

resource "cloudflare_zero_trust_access_application" "frontend_viewer" {
  account_id = var.cloudflare_account_id
  name       = "boke-video frontend viewer"
  domain     = local.frontend_hostname
  type       = "self_hosted"

  policies = [{
    decision   = "allow"
    include    = local.viewer_include
    name       = "Allow viewers"
    precedence = 1
  }]
}

resource "cloudflare_zero_trust_access_application" "frontend_admin" {
  account_id = var.cloudflare_account_id
  name       = "boke-video frontend admin"
  domain     = "${local.frontend_hostname}/admin*"
  type       = "self_hosted"

  policies = [{
    decision   = "allow"
    include    = local.admin_include
    name       = "Allow admins"
    precedence = 1
  }]
}

resource "cloudflare_zero_trust_access_application" "backend_viewer" {
  account_id = var.cloudflare_account_id
  name       = "boke-video backend viewer"
  domain     = local.stream_hostname
  type       = "self_hosted"

  policies = [{
    decision   = "allow"
    include    = local.viewer_include
    name       = "Allow viewers"
    precedence = 1
  }]
}

resource "cloudflare_zero_trust_access_application" "backend_admin" {
  account_id = var.cloudflare_account_id
  name       = "boke-video backend admin"
  domain     = "${local.stream_hostname}/api/admin/*"
  type       = "self_hosted"

  policies = [{
    decision   = "allow"
    include    = local.admin_include
    name       = "Allow admins"
    precedence = 1
  }]
}

resource "cloudflare_zero_trust_tunnel_cloudflared_config" "boke_video" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.boke_video.id
  source     = "cloudflare"

  config = {
    ingress = [
      {
        hostname = local.stream_hostname
        service  = "http://127.0.0.1:8080"
        origin_request = {
          access = {
            aud_tag   = [cloudflare_zero_trust_access_application.backend_viewer.aud]
            required  = true
            team_name = var.cloudflare_access_team_name
          }
        }
      },
      {
        service = "http_status:404"
      }
    ]
  }
}

data "cloudflare_zero_trust_tunnel_cloudflared_token" "boke_video" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.boke_video.id
}

resource "cloudflare_dns_record" "stream" {
  zone_id = var.cloudflare_zone_id
  name    = local.stream_hostname
  type    = "CNAME"
  content = "${cloudflare_zero_trust_tunnel_cloudflared.boke_video.id}.cfargotunnel.com"
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "ingest_ipv4" {
  zone_id = var.cloudflare_zone_id
  name    = local.ingest_hostname
  type    = "A"
  content = var.oracle_ipv4
  proxied = false
  ttl     = 1
}

resource "cloudflare_dns_record" "rtc_ipv4" {
  zone_id = var.cloudflare_zone_id
  name    = local.rtc_hostname
  type    = "A"
  content = var.oracle_ipv4
  proxied = false
  ttl     = 1
}

resource "cloudflare_dns_record" "ingest_ipv6" {
  count   = var.oracle_ipv6 == "" ? 0 : 1
  zone_id = var.cloudflare_zone_id
  name    = local.ingest_hostname
  type    = "AAAA"
  content = var.oracle_ipv6
  proxied = false
  ttl     = 1
}

resource "cloudflare_dns_record" "rtc_ipv6" {
  count   = var.oracle_ipv6 == "" ? 0 : 1
  zone_id = var.cloudflare_zone_id
  name    = local.rtc_hostname
  type    = "AAAA"
  content = var.oracle_ipv6
  proxied = false
  ttl     = 1
}

resource "cloudflare_workers_custom_domain" "frontend" {
  count      = var.manage_worker_custom_domain ? 1 : 0
  account_id = var.cloudflare_account_id
  hostname   = local.frontend_hostname
  service    = var.worker_service_name
  zone_id    = var.cloudflare_zone_id
  zone_name  = var.zone_name

  environment = var.worker_environment == "" ? null : var.worker_environment
}
