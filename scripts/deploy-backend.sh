#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BINARY_PATH="/usr/local/bin/boke-video-server"
BUILD_PATH="/tmp/boke-video-server"
SERVICE_NAME="boke-video.service"

cd "${ROOT_DIR}/backend"

go test ./...
go vet ./...
go build -o "${BUILD_PATH}" ./cmd/server

sudo install -m 0755 "${BUILD_PATH}" "${BINARY_PATH}"
sudo systemctl restart "${SERVICE_NAME}"
systemctl is-active "${SERVICE_NAME}"
systemctl status "${SERVICE_NAME}" --no-pager
