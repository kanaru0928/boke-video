#!/bin/sh
set -eu

ROOM_ID="${ROOM_ID:-main}"
RTSP_INPUT="${RTSP_INPUT:-rtsp://127.0.0.1:8554/live/${ROOM_ID}}"
OUTPUT_DIR="${OUTPUT_DIR:-/var/lib/boke-video/streams/${ROOM_ID}}"

mkdir -p "${OUTPUT_DIR}"

exec ffmpeg \
  -rtsp_transport tcp \
  -i "${RTSP_INPUT}" \
  -map 0:v:0 -map 0:a:0? \
  -map 0:v:0 -map 0:a:0? \
  -map 0:v:0 -map 0:a:0? \
  -map 0:v:0 -map 0:a:0? \
  -c:v libx264 \
  -preset veryfast \
  -tune zerolatency \
  -g 30 \
  -keyint_min 30 \
  -sc_threshold 0 \
  -filter:v:0 scale=w=1920:h=1080 \
  -b:v:0 5000k \
  -maxrate:v:0 5350k \
  -bufsize:v:0 7500k \
  -filter:v:1 scale=w=1280:h=720 \
  -b:v:1 3000k \
  -maxrate:v:1 3210k \
  -bufsize:v:1 4500k \
  -filter:v:2 scale=w=854:h=480 \
  -b:v:2 1500k \
  -maxrate:v:2 1605k \
  -bufsize:v:2 2250k \
  -filter:v:3 scale=w=640:h=360 \
  -b:v:3 800k \
  -maxrate:v:3 856k \
  -bufsize:v:3 1200k \
  -c:a aac \
  -b:a 128k \
  -use_timeline 1 \
  -use_template 1 \
  -seg_duration 1 \
  -adaptation_sets "id=0,streams=v id=1,streams=a" \
  -f dash \
  "${OUTPUT_DIR}/manifest.mpd"
