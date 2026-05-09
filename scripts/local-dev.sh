#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATABASE_PATH="${DATABASE_PATH:-/tmp/boke-video-local.sqlite3}"
STREAM_DATA_DIR="${STREAM_DATA_DIR:-/tmp/boke-video-streams}"

cleanup() {
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
  if [ -n "${FRONTEND_PID:-}" ]; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
  fi
  if [ -n "${STREAM_PID:-}" ]; then
    kill "${STREAM_PID}" 2>/dev/null || true
  fi
}

trap cleanup INT TERM EXIT

if lsof -tiTCP:8080 -sTCP:LISTEN >/dev/null; then
  echo "port 8080 is already in use" >&2
  exit 1
fi
if lsof -tiTCP:5173 -sTCP:LISTEN >/dev/null; then
  echo "port 5173 is already in use" >&2
  exit 1
fi

rm -f "${DATABASE_PATH}"
rm -rf "${STREAM_DATA_DIR}"

export DATABASE_PATH
export STREAM_DATA_DIR

"${ROOT_DIR}/scripts/local-backend.sh" &
BACKEND_PID="$!"

"${ROOT_DIR}/scripts/local-frontend.sh" &
FRONTEND_PID="$!"

sleep 1

"${ROOT_DIR}/scripts/start-local-dummy-stream.sh" &
STREAM_PID="$!"

wait
