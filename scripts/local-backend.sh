#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

set -a
. "${ROOT_DIR}/backend/.env"
set +a

cd "${ROOT_DIR}/backend"
exec go run ./cmd/server
