#!/bin/sh
set -eu

BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8080}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:5173}"
WEBRTC_BASE_URL="${WEBRTC_BASE_URL:-http://127.0.0.1:8889}"
ROOM_TITLE="${ROOM_TITLE:-Dummy live stream}"
ROOM_ID="${ROOM_ID:-mock-local}"

command -v ffmpeg >/dev/null
command -v node >/dev/null

ROOM_ID="$(
  node scripts/ensure-local-room.mjs "${BACKEND_URL}" "${ROOM_ID}" "${ROOM_TITLE}" "${FRONTEND_URL}"
)"

RTSP_OUTPUT="${RTSP_OUTPUT:-rtsp://127.0.0.1:8554/live/${ROOM_ID}}"

cat <<EOF
ROOM_ID=${ROOM_ID}
WATCH_URL=${FRONTEND_URL}/?room=${ROOM_ID}
WHEP_URL=${WEBRTC_BASE_URL}/live/${ROOM_ID}/whep
RTSP_OUTPUT=${RTSP_OUTPUT}
EOF

exec ffmpeg -hide_banner -loglevel warning -re \
  -f lavfi -i "testsrc2=size=1280x720:rate=30,format=yuv420p" \
  -f lavfi -i "sine=frequency=1000:sample_rate=48000" \
  -map 0:v:0 -map 1:a:0 \
  -c:v libx264 \
  -preset veryfast \
  -tune zerolatency \
  -g 15 \
  -keyint_min 15 \
  -sc_threshold 0 \
  -b:v 1800k \
  -maxrate 2000k \
  -bufsize 2000k \
  -c:a libopus \
  -b:a 96k \
  -f rtsp \
  -rtsp_transport tcp \
  "${RTSP_OUTPUT}"
