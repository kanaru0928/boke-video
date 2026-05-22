#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8080}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:5173}"
ROOM_ID="${ROOM_ID:-mock-local}"
ROOM_TITLE="${ROOM_TITLE:-Dummy WHIP stream}"
VIDEO_SIZE="${VIDEO_SIZE:-1280x720}"
VIDEO_RATE="${VIDEO_RATE:-30}"
VIDEO_BITRATE_KBPS="${VIDEO_BITRATE_KBPS:-1800}"
AUDIO_FREQUENCY="${AUDIO_FREQUENCY:-1000}"

command -v node >/dev/null
command -v gst-launch-1.0 >/dev/null

if ! gst-inspect-1.0 whipsink >/dev/null 2>&1; then
  echo "GStreamer whipsink is not installed. Install gst-plugin-webrtchttp." >&2
  exit 1
fi
if ! gst-inspect-1.0 nicesrc >/dev/null 2>&1; then
  echo "GStreamer libnice elements are not installed. On macOS, run: brew install libnice-gstreamer" >&2
  exit 1
fi
if ! gst-inspect-1.0 x264enc >/dev/null 2>&1; then
  echo "GStreamer x264enc is not installed." >&2
  exit 1
fi
if ! gst-inspect-1.0 opusenc >/dev/null 2>&1; then
  echo "GStreamer opusenc is not installed." >&2
  exit 1
fi

room_env="$(
  node "${ROOT_DIR}/scripts/create-local-whip-room.mjs" \
    "${BACKEND_URL}" \
    "${ROOM_ID}" \
    "${ROOM_TITLE}" \
    "${FRONTEND_URL}"
)"
eval "${room_env}"

WHIP_URL="${BACKEND_URL}/live/${ROOM_ID}?direction=whip"

cat <<EOF
ROOM_ID=${ROOM_ID}
WATCH_URL=${FRONTEND_URL}/watch?room=${ROOM_ID}
WHIP_URL=${WHIP_URL}
EOF

exec gst-launch-1.0 -e \
  videotestsrc is-live=true pattern=ball ! \
  "video/x-raw,width=${VIDEO_SIZE%x*},height=${VIDEO_SIZE#*x},framerate=${VIDEO_RATE}/1" ! \
  videoconvert ! \
  x264enc tune=zerolatency speed-preset=veryfast key-int-max="${VIDEO_RATE}" bitrate="${VIDEO_BITRATE_KBPS}" bframes=0 ! \
  video/x-h264,profile=baseline ! \
  rtph264pay pt=97 config-interval=1 ! \
  "application/x-rtp,media=video,encoding-name=H264,payload=97,clock-rate=90000" ! \
  whip.sink_0 \
  audiotestsrc is-live=true wave=sine freq="${AUDIO_FREQUENCY}" ! \
  audioconvert ! \
  audioresample ! \
  opusenc ! \
  rtpopuspay pt=96 ! \
  "application/x-rtp,media=audio,encoding-name=OPUS,payload=96,clock-rate=48000,encoding-params=(string)2" ! \
  whip.sink_1 \
  whipsink name=whip auth-token="${WHIP_BEARER_TOKEN}" whip-endpoint="${WHIP_URL}"
