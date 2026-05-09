#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

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

"${ROOT_DIR}/scripts/local-backend.sh" &
BACKEND_PID="$!"

"${ROOT_DIR}/scripts/local-frontend.sh" &
FRONTEND_PID="$!"

sleep 1

"${ROOT_DIR}/scripts/start-local-dummy-stream.sh" &
STREAM_PID="$!"

wait
