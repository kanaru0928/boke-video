#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8080}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:5173}"
STREAM_DATA_DIR="${STREAM_DATA_DIR:-/tmp/boke-video-streams}"
ROOM_TITLE="${ROOM_TITLE:-Big Buck Bunny sample}"
SAMPLE_SECONDS="${SAMPLE_SECONDS:-45}"
SAMPLE_URL="${SAMPLE_URL:-https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4}"
CACHE_DIR="${CACHE_DIR:-${ROOT_DIR}/.local-demo}"
SAMPLE_FILE="${CACHE_DIR}/big-buck-bunny.mp4"

command -v curl >/dev/null
command -v ffmpeg >/dev/null
command -v node >/dev/null

mkdir -p "${CACHE_DIR}" "${STREAM_DATA_DIR}"

if [ ! -f "${SAMPLE_FILE}" ]; then
  curl --fail --location --output "${SAMPLE_FILE}" "${SAMPLE_URL}"
fi

ROOM_ID="$(
  node - "${BACKEND_URL}" "${ROOM_TITLE}" <<'NODE'
const [backendUrl, roomTitle] = process.argv.slice(2);
const response = await fetch(`${backendUrl}/api/admin/rooms`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: "http://127.0.0.1:5173",
  },
  body: JSON.stringify({ title: roomTitle }),
});
if (!response.ok) {
  throw new Error(`room create failed: ${response.status} ${await response.text()}`);
}
const room = await response.json();
process.stdout.write(room.id);
NODE
)"

OUTPUT_DIR="${STREAM_DATA_DIR}/${ROOM_ID}"
rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}"

ffmpeg -hide_banner -loglevel warning -y \
  -i "${SAMPLE_FILE}" \
  -t "${SAMPLE_SECONDS}" \
  -map 0:v:0 -map 0:v:0 -map 0:a:0? \
  -filter:v:0 "scale=w=640:h=360:force_original_aspect_ratio=decrease:force_divisible_by=2" \
  -filter:v:1 "scale=w=320:h=180:force_original_aspect_ratio=decrease:force_divisible_by=2" \
  -c:v libx264 \
  -preset veryfast \
  -g 30 \
  -keyint_min 30 \
  -sc_threshold 0 \
  -b:v:0 800k \
  -maxrate:v:0 856k \
  -bufsize:v:0 1200k \
  -b:v:1 300k \
  -maxrate:v:1 360k \
  -bufsize:v:1 600k \
  -c:a aac \
  -b:a 96k \
  -use_timeline 1 \
  -use_template 1 \
  -seg_duration 1 \
  -adaptation_sets "id=0,streams=v id=1,streams=a" \
  -f dash \
  "${OUTPUT_DIR}/manifest.mpd"

cat <<EOF
ROOM_ID=${ROOM_ID}
WATCH_URL=${FRONTEND_URL}/?room=${ROOM_ID}
MANIFEST_URL=${BACKEND_URL}/live/${ROOM_ID}/manifest.mpd
STREAM_DATA_DIR=${STREAM_DATA_DIR}
SAMPLE_FILE=${SAMPLE_FILE}
EOF
