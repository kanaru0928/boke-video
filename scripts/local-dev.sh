#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATABASE_PATH="${DATABASE_PATH:-/tmp/boke-video-local.sqlite3}"
MEDIAMTX_CONFIG="${MEDIAMTX_CONFIG:-/tmp/boke-video-mediamtx.yml}"
STREAM_MODE="${1:-${STREAM_MODE:-mock}}"
LOCAL_OBS_USER="${LOCAL_OBS_USER:-publisher}"
LOCAL_OBS_PASSWORD="${LOCAL_OBS_PASSWORD:-local-password}"
CLOUDFLARE_ACCESS_ORIGIN="${CLOUDFLARE_ACCESS_ORIGIN:-}"
CLOUDFLARE_TUNNEL_CONFIG="${CLOUDFLARE_TUNNEL_CONFIG:-}"

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
  if [ -n "${CLOUDFLARED_PID:-}" ]; then
    kill "${CLOUDFLARED_PID}" 2>/dev/null || true
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
  mock | obs | obs-no-auth | obs-auth | obs-cloudflare)
    ;;
  *)
    echo "stream mode must be mock, obs, obs-no-auth, obs-auth, or obs-cloudflare" >&2
    exit 1
    ;;
esac
command -v curl >/dev/null

if [ "${STREAM_MODE}" = "obs-cloudflare" ]; then
  if [ "${ACCESS_ENABLED:-}" != "true" ]; then
    echo "ACCESS_ENABLED=true is required for obs-cloudflare" >&2
    exit 1
  fi
  if [ -z "${ACCESS_AUDIENCE:-}" ] || [ -z "${ACCESS_ISSUER:-}" ] || [ -z "${ACCESS_CERTS_URL:-}" ]; then
    echo "ACCESS_AUDIENCE, ACCESS_ISSUER, and ACCESS_CERTS_URL are required for obs-cloudflare" >&2
    exit 1
  fi
  if [ -z "${CLOUDFLARE_ACCESS_ORIGIN}" ]; then
    echo "CLOUDFLARE_ACCESS_ORIGIN is required for obs-cloudflare" >&2
    exit 1
  fi
  CLOUDFLARE_ACCESS_ORIGIN="$(printf "%s" "${CLOUDFLARE_ACCESS_ORIGIN}" | sed 's#/*$##')"
fi

rm -f "${DATABASE_PATH}"

export DATABASE_PATH
export VITE_STREAM_BASE_URL="${VITE_STREAM_BASE_URL:-http://127.0.0.1:8889}"
if [ "${STREAM_MODE}" = "obs-cloudflare" ]; then
  export LOCAL_ROOM_SETUP="${LOCAL_ROOM_SETUP:-database}"
  export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173}"
  export VITE_API_BASE_URL="${VITE_API_BASE_URL:-${CLOUDFLARE_ACCESS_ORIGIN}}"
  export VITE_COMMENT_WS_URL="${VITE_COMMENT_WS_URL:-$(printf "%s" "${CLOUDFLARE_ACCESS_ORIGIN}" | sed 's#^https://#wss://#;s#^http://#ws://#')}"
fi

"${ROOT_DIR}/scripts/local-backend.sh" &
BACKEND_PID="$!"

"${ROOT_DIR}/scripts/local-frontend.sh" &
FRONTEND_PID="$!"

wait_for_url "http://127.0.0.1:8080/healthz" "backend"
wait_for_url "http://127.0.0.1:5173/" "frontend"

if [ "${STREAM_MODE}" = "obs-cloudflare" ] && [ -n "${CLOUDFLARE_TUNNEL_CONFIG}" ]; then
  command -v cloudflared >/dev/null
  echo "starting cloudflared with ${CLOUDFLARE_TUNNEL_CONFIG}"
  cloudflared tunnel --config "${CLOUDFLARE_TUNNEL_CONFIG}" run &
  CLOUDFLARED_PID="$!"
fi

if lsof -tiTCP:8554 -sTCP:LISTEN >/dev/null || lsof -tiTCP:1935 -sTCP:LISTEN >/dev/null || lsof -tiTCP:8889 -sTCP:LISTEN >/dev/null; then
  echo "using existing MediaMTX listener"
elif command -v mediamtx >/dev/null; then
  if [ "${STREAM_MODE}" = "obs-auth" ] || [ "${STREAM_MODE}" = "obs-cloudflare" ]; then
    cat >"${MEDIAMTX_CONFIG}" <<EOF
rtspAddress: 127.0.0.1:8554
rtspTransports: [tcp]
rtmpAddress: :1935
hls: no
webrtc: yes
webrtcAddress: :8889
webrtcLocalUDPAddress: :8189
srt: no

authMethod: internal
authInternalUsers:
  - user: ${LOCAL_OBS_USER}
    pass: ${LOCAL_OBS_PASSWORD}
    ips: []
    permissions:
      - action: publish
        path: "~^live/.+$"
  - user: any
    pass:
    ips: ["127.0.0.1", "::1"]
    permissions:
      - action: read
        path: "~^live/.+$"

paths:
  all_others:
    source: publisher
EOF
  else
    cat >"${MEDIAMTX_CONFIG}" <<'EOF'
rtspAddress: 127.0.0.1:8554
rtspTransports: [tcp]
rtmpAddress: :1935
hls: no
webrtc: yes
webrtcAddress: :8889
webrtcLocalUDPAddress: :8189
srt: no

paths:
  all_others:
    source: publisher
EOF
  fi
  echo "starting MediaMTX with ${MEDIAMTX_CONFIG}"
  mediamtx "${MEDIAMTX_CONFIG}" &
  MEDIAMTX_PID="$!"
  sleep 1
else
  echo "mediamtx command is missing. Install it with: brew install mediamtx" >&2
  exit 1
fi

if [ "${STREAM_MODE}" = "obs" ] || [ "${STREAM_MODE}" = "obs-no-auth" ] || [ "${STREAM_MODE}" = "obs-auth" ] || [ "${STREAM_MODE}" = "obs-cloudflare" ]; then
  "${ROOT_DIR}/scripts/start-local-obs-stream.sh" &
else
  "${ROOT_DIR}/scripts/start-local-dummy-stream.sh" &
fi
STREAM_PID="$!"

wait "${STREAM_PID}"
