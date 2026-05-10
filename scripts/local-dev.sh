#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATABASE_PATH="${DATABASE_PATH:-/tmp/boke-video-local.sqlite3}"
STREAM_DATA_DIR="${STREAM_DATA_DIR:-/tmp/boke-video-streams}"
MEDIAMTX_CONFIG="${MEDIAMTX_CONFIG:-/tmp/boke-video-mediamtx.yml}"
STREAM_MODE="${1:-${STREAM_MODE:-mock}}"

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
  if [ -n "${MEDIAMTX_PID:-}" ]; then
    kill "${MEDIAMTX_PID}" 2>/dev/null || true
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
case "${STREAM_MODE}" in
  mock | obs)
    ;;
  *)
    echo "stream mode must be mock or obs" >&2
    exit 1
    ;;
esac
command -v curl >/dev/null

rm -f "${DATABASE_PATH}"
rm -rf "${STREAM_DATA_DIR}"

export DATABASE_PATH
export STREAM_DATA_DIR

"${ROOT_DIR}/scripts/local-backend.sh" &
BACKEND_PID="$!"

"${ROOT_DIR}/scripts/local-frontend.sh" &
FRONTEND_PID="$!"

wait_for_url "http://127.0.0.1:8080/healthz" "backend"
wait_for_url "http://127.0.0.1:5173/" "frontend"

if [ "${STREAM_MODE}" = "obs" ]; then
  if lsof -tiTCP:8554 -sTCP:LISTEN >/dev/null || lsof -tiTCP:1935 -sTCP:LISTEN >/dev/null; then
    echo "using existing MediaMTX listener"
  elif command -v mediamtx >/dev/null; then
    cat >"${MEDIAMTX_CONFIG}" <<'EOF'
paths:
  all_others:
    source: publisher
EOF
    echo "starting MediaMTX with ${MEDIAMTX_CONFIG}"
    mediamtx "${MEDIAMTX_CONFIG}" &
    MEDIAMTX_PID="$!"
    sleep 1
  else
    echo "mediamtx command is missing. Install it with: brew install mediamtx" >&2
    exit 1
  fi
  "${ROOT_DIR}/scripts/start-local-obs-stream.sh" &
else
  "${ROOT_DIR}/scripts/start-local-dummy-stream.sh" &
fi
STREAM_PID="$!"

wait "${STREAM_PID}"
