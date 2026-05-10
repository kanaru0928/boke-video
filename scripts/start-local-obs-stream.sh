#!/bin/sh
set -eu

BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8080}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:5173}"
STREAM_DATA_DIR="${STREAM_DATA_DIR:-/tmp/boke-video-streams}"
ROOM_ID="${ROOM_ID:-obs-local}"
ROOM_TITLE="${ROOM_TITLE:-OBS live stream}"
RTSP_INPUT="${RTSP_INPUT:-rtsp://127.0.0.1:8554/live/${ROOM_ID}}"

command -v ffmpeg >/dev/null
command -v ffprobe >/dev/null
command -v node >/dev/null

wait_for_obs_input() {
  echo "waiting for OBS input at ${RTSP_INPUT}" >&2
  while ! ffprobe -v error -rtsp_transport tcp "${RTSP_INPUT}" >/dev/null 2>&1; do
    sleep 1
  done
  echo "OBS input is available at ${RTSP_INPUT}" >&2
}

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
RTSP_INPUT=${RTSP_INPUT}
OBS_RTMP_SERVER=rtmp://127.0.0.1:1935/live/${ROOM_ID}
OBS_STREAM_KEY=
STREAM_DATA_DIR=${STREAM_DATA_DIR}
EOF

while true; do
  wait_for_obs_input
  ffmpeg -hide_banner -loglevel warning \
    -rtsp_transport tcp \
    -i "${RTSP_INPUT}" \
    -map 0:v:0 -map 0:v:0 -map 0:a:0? \
    -filter:v:0 "scale=w=1280:h=720:force_original_aspect_ratio=decrease:force_divisible_by=2" \
    -filter:v:1 "scale=w=640:h=360:force_original_aspect_ratio=decrease:force_divisible_by=2" \
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
  sleep 1
done
