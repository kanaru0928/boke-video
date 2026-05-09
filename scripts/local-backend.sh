#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

export DATABASE_PATH="${DATABASE_PATH:-/tmp/boke-video-local.sqlite3}"
export STREAM_DATA_DIR="${STREAM_DATA_DIR:-/tmp/boke-video-streams}"
export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173}"

mkdir -p "${STREAM_DATA_DIR}"

cd "${ROOT_DIR}/backend"
exec go run ./cmd/server
