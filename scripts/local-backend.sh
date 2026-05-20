#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

export DATABASE_PATH="${DATABASE_PATH:-/tmp/boke-video-local.sqlite3}"
export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173}"
export STREAM_PUBLIC_BASE_URL="${STREAM_PUBLIC_BASE_URL:-http://127.0.0.1:3333}"
export STREAM_SIGNING_SECRET="${STREAM_SIGNING_SECRET:-local-stream-signing-secret}"
export WHIP_UPSTREAM_BASE_URL="${WHIP_UPSTREAM_BASE_URL:-http://127.0.0.1:3333}"

cd "${ROOT_DIR}/backend"
exec go run ./cmd/server
