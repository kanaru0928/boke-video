#!/bin/sh
set -eu

BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8080}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:5173}"
STREAM_DATA_DIR="${STREAM_DATA_DIR:-/tmp/boke-video-streams}"
ROOM_TITLE="${ROOM_TITLE:-Dummy live stream}"
ROOM_ID="${ROOM_ID:-mock-local}"

command -v ffmpeg >/dev/null
command -v node >/dev/null

mkdir -p "${STREAM_DATA_DIR}"

ROOM_ID="$(
  node scripts/ensure-local-room.mjs "${BACKEND_URL}" "${ROOM_ID}" "${ROOM_TITLE}" "${FRONTEND_URL}"
)"

OUTPUT_DIR="${STREAM_DATA_DIR}/${ROOM_ID}"
rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}"

cat <<EOF
ROOM_ID=${ROOM_ID}
WATCH_URL=${FRONTEND_URL}/?room=${ROOM_ID}
MANIFEST_URL=${BACKEND_URL}/live/${ROOM_ID}/manifest.mpd
STREAM_DATA_DIR=${STREAM_DATA_DIR}
EOF

exec ffmpeg -hide_banner -loglevel warning -re \
  -f lavfi -i "testsrc2=size=1280x720:rate=30,format=yuv420p" \
  -f lavfi -i "sine=frequency=1000:sample_rate=48000" \
  -map 0:v:0 -map 0:v:0 -map 1:a:0 \
  -filter:v:0 "scale=w=1280:h=720" \
  -filter:v:1 "scale=w=640:h=360" \
  -c:v libx264 \
  -preset veryfast \
  -tune zerolatency \
  -g 30 \
  -keyint_min 30 \
  -sc_threshold 0 \
  -b:v:0 1800k \
  -maxrate:v:0 2000k \
  -bufsize:v:0 3000k \
  -b:v:1 700k \
  -maxrate:v:1 900k \
  -bufsize:v:1 1400k \
  -c:a aac \
  -b:a 96k \
  -use_timeline 1 \
  -use_template 1 \
  -seg_duration 1 \
  -window_size 8 \
  -extra_window_size 4 \
  -remove_at_exit 0 \
  -adaptation_sets "id=0,streams=v id=1,streams=a" \
  -f dash \
  "${OUTPUT_DIR}/manifest.mpd"
