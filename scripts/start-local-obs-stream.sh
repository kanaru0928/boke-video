#!/bin/sh
set -eu

BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8080}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:5173}"
STREAM_DATA_DIR="${STREAM_DATA_DIR:-/tmp/boke-video-streams}"
ROOM_ID="${ROOM_ID:-obs-local}"
ROOM_TITLE="${ROOM_TITLE:-OBS live stream}"
RTSP_INPUT="${RTSP_INPUT:-rtsp://127.0.0.1:8554/live/${ROOM_ID}}"
RTMP_INPUT="${RTMP_INPUT:-rtmp://127.0.0.1:1935/live/${ROOM_ID}}"
LOCAL_OBS_USER="${LOCAL_OBS_USER:-publisher}"
LOCAL_OBS_PASSWORD="${LOCAL_OBS_PASSWORD:-local-password}"
LOCAL_OBS_AUTH="${LOCAL_OBS_AUTH:-false}"

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
RTSP_INPUT=${RTSP_INPUT}
RTMP_INPUT=${RTMP_INPUT}
OBS_STREAM_KEY=
OBS_RTMP_SERVER_LEGACY=rtmp://127.0.0.1:1935/live
OBS_RECOMMENDED_OUTPUT_RESOLUTION=1280x720
OBS_RECOMMENDED_FPS=30
OBS_RECOMMENDED_KEYFRAME_INTERVAL=0.5s
OBS_RECOMMENDED_B_FRAMES=0
STREAM_DATA_DIR=${STREAM_DATA_DIR}
EOF

if [ "${LOCAL_OBS_AUTH}" = "true" ]; then
  echo "OBS_RTMP_SERVER=rtmp://127.0.0.1:1935/live/${ROOM_ID}?user=${LOCAL_OBS_USER}&pass=${LOCAL_OBS_PASSWORD}"
  echo "OBS_RTMP_SERVER_LEGACY=rtmp://127.0.0.1:1935/live?user=${LOCAL_OBS_USER}&pass=${LOCAL_OBS_PASSWORD}"
else
  echo "OBS_RTMP_SERVER=rtmp://127.0.0.1:1935/live/${ROOM_ID}"
fi

echo "waiting for OBS input at ${RTMP_INPUT}" >&2

while true; do
  if ffmpeg -hide_banner -loglevel warning \
    -fflags +genpts+nobuffer \
    -i "${RTMP_INPUT}" \
    -map 0:v:0 -map 0:a:0? \
    -filter:v "fps=30,scale=w=1280:h=720:force_original_aspect_ratio=decrease:force_divisible_by=2" \
    -c:v libx264 \
    -preset ultrafast \
    -tune zerolatency \
    -g 15 \
    -keyint_min 15 \
    -sc_threshold 0 \
    -b:v 1800k \
    -maxrate 2000k \
    -bufsize 2000k \
    -c:a aac \
    -b:a 96k \
    -avoid_negative_ts make_zero \
    -use_timeline 0 \
    -use_template 1 \
    -index_correction 1 \
    -seg_duration 0.5 \
    -window_size 12 \
    -extra_window_size 6 \
    -remove_at_exit 0 \
    -adaptation_sets "id=0,streams=v id=1,streams=a" \
    -f dash \
    "${OUTPUT_DIR}/manifest.mpd"; then
    echo "OBS input ended. Retrying in 1 second." >&2
  else
    echo "OBS input is not available. Retrying in 1 second." >&2
  fi
  rm -rf "${OUTPUT_DIR}"
  mkdir -p "${OUTPUT_DIR}"
  sleep 1
done
