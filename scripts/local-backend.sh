#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

export DATABASE_PATH="${DATABASE_PATH:-${ROOT_DIR}/cc-docs/boke-video-local.sqlite3}"
export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173}"
export STREAM_PUBLIC_BASE_URL="${STREAM_PUBLIC_BASE_URL:-http://127.0.0.1:3333}"
export STREAM_SIGNING_SECRET="${STREAM_SIGNING_SECRET:-local-stream-signing-secret}"
export WHIP_UPSTREAM_BASE_URL="${WHIP_UPSTREAM_BASE_URL:-http://127.0.0.1:3333}"
export OME_API_BASE_URL="${OME_API_BASE_URL:-http://127.0.0.1:8081}"
export OME_API_ACCESS_TOKEN="${OME_API_ACCESS_TOKEN:-local-api-token}"
export OME_VHOST_NAME="${OME_VHOST_NAME:-default}"
export OME_APP_NAME="${OME_APP_NAME:-live}"
export OME_THUMBNAIL_BASE_URL="${OME_THUMBNAIL_BASE_URL:-http://127.0.0.1:20080}"
export OME_THUMBNAIL_CODEC="${OME_THUMBNAIL_CODEC:-jpg}"
export STREAM_END_GRACE_SECONDS="${STREAM_END_GRACE_SECONDS:-90}"

cd "${ROOT_DIR}/backend"
exec go run ./cmd/server
