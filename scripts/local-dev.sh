#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

wait_for_url() {
  url="$1"
  label="$2"
  remaining=30
  while [ "${remaining}" -gt 0 ]; do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      return
    fi
    remaining=$((remaining - 1))
    sleep 1
  done
  echo "${label} did not become ready: ${url}" >&2
  exit 1
}

wait_for_port() {
  port="$1"
  label="$2"
  remaining=60
  while [ "${remaining}" -gt 0 ]; do
    if lsof -tiTCP:"${port}" -sTCP:LISTEN >/dev/null; then
      return
    fi
    if [ -n "${MEDIA_PID:-}" ] && ! kill -0 "${MEDIA_PID}" 2>/dev/null; then
      echo "${label} stopped before opening port ${port}" >&2
      exit 1
    fi
    remaining=$((remaining - 1))
    sleep 1
  done
  echo "${label} did not open port ${port}" >&2
  exit 1
}

cleanup() {
  if [ -n "${MEDIA_PID:-}" ]; then
    kill "${MEDIA_PID}" 2>/dev/null || true
  fi
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
  if [ -n "${FRONTEND_PID:-}" ]; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
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

command -v curl >/dev/null

MEDIA_PID=""
"${ROOT_DIR}/scripts/local-media.sh" &
MEDIA_PID="$!"
wait_for_port 3333 "media"
wait_for_port 8081 "media api"
wait_for_port 20080 "media thumbnail"

"${ROOT_DIR}/scripts/local-backend.sh" &
BACKEND_PID="$!"

"${ROOT_DIR}/scripts/local-frontend.sh" &
FRONTEND_PID="$!"

wait_for_url "http://127.0.0.1:8080/healthz" "backend"
wait_for_url "http://127.0.0.1:5173/" "frontend"

echo "frontend: http://127.0.0.1:5173"
echo "backend: http://127.0.0.1:8080"
echo "obs ingest: ${INGEST_PUBLIC_BASE_URL:-http://127.0.0.1:8080}/live/<roomId>?direction=whip"

wait
