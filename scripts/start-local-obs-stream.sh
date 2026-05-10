#!/bin/sh
set -eu

BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8080}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:5173}"
STREAM_DATA_DIR="${STREAM_DATA_DIR:-/tmp/boke-video-streams}"
ROOM_ID="${ROOM_ID:-obs-local}"
ROOM_TITLE="${ROOM_TITLE:-OBS live stream}"
RTSP_INPUT="${RTSP_INPUT:-rtsp://127.0.0.1:8554/live/${ROOM_ID}}"

command -v ffmpeg >/dev/null
command -v node >/dev/null

mkdir -p "${STREAM_DATA_DIR}"

ROOM_ID="$(
  node - "${BACKEND_URL}" "${ROOM_ID}" "${ROOM_TITLE}" <<'NODE'
const [backendUrl, roomId, roomTitle] = process.argv.slice(2);
const response = await fetch(`${backendUrl}/api/admin/rooms`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: "http://127.0.0.1:5173",
  },
  body: JSON.stringify({ id: roomId, title: roomTitle }),
});
if (response.ok) {
  const room = await response.json();
  process.stdout.write(room.id);
} else {
  const existing = await fetch(
    `${backendUrl}/api/rooms/${encodeURIComponent(roomId)}`,
    {
      headers: { Origin: "http://127.0.0.1:5173" },
    },
  );
  if (existing.ok) {
    const room = await existing.json();
    process.stdout.write(room.id);
  } else {
    throw new Error(`room create failed: ${response.status} ${await response.text()}`);
  }
}
NODE
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
  echo "waiting for OBS input at ${RTSP_INPUT}" >&2
  sleep 1
done
