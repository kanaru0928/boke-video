output "frontend_hostname" {
  value = local.frontend_hostname
}

output "stream_hostname" {
  value = local.stream_hostname
}

output "ingest_hostname" {
  value = local.ingest_hostname
}

output "rtc_hostname" {
  value = local.rtc_hostname
}

output "backend_access_audience" {
  value = cloudflare_zero_trust_access_application.boke_video.aud
}

output "access_issuer" {
  value = "https://${var.cloudflare_access_team_name}.cloudflareaccess.com"
}

output "access_certs_url" {
  value = "https://${var.cloudflare_access_team_name}.cloudflareaccess.com/cdn-cgi/access/certs"
}

output "tunnel_id" {
  value = cloudflare_zero_trust_tunnel_cloudflared.boke_video.id
}

output "tunnel_token" {
  value     = data.cloudflare_zero_trust_tunnel_cloudflared_token.boke_video.token
  sensitive = true
}
