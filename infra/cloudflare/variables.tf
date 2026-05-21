variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare account ID."
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Cloudflare zone ID."
}

variable "zone_name" {
  type        = string
  description = "Zone name for production hostnames."
  default     = "example.com"
}

variable "oracle_ipv4" {
  type        = string
  description = "Oracle public IPv4 address for DNS-only ingest and RTC records."
}

variable "oracle_ipv6" {
  type        = string
  description = "Oracle public IPv6 address for DNS-only ingest and RTC records. Leave empty when unused."
  default     = ""
}

variable "cloudflare_access_team_name" {
  type        = string
  description = "Cloudflare Access team name without .cloudflareaccess.com."
}

variable "access_policy_id" {
  type        = string
  description = "Existing Cloudflare Access policy ID for the frontend and backend applications."
}

variable "worker_service_name" {
  type        = string
  description = "Cloudflare Workers service name created by wrangler deploy."
  default     = "boke-video-frontend"
}

variable "worker_environment" {
  type        = string
  description = "Cloudflare Workers environment name. Empty string uses the default Worker environment."
  default     = ""
}

variable "manage_worker_custom_domain" {
  type        = bool
  description = "Whether Terraform manages the Workers custom domain."
  default     = true
}

variable "tunnel_name" {
  type        = string
  description = "Cloudflare Tunnel name."
  default     = "boke-video"
}
