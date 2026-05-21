#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OME_DIR="${ROOT_DIR}/.local-demo/ovenmediaengine"
CONF_DIR="${OME_DIR}/conf"
LOG_DIR="${OME_DIR}/logs"
CONTAINER_NAME="boke-video-ome"
IMAGE_NAME="airensoft/ovenmediaengine:latest"

cleanup() {
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}

stop() {
  cleanup
  exit "$1"
}

command -v docker >/dev/null

trap cleanup EXIT
trap 'stop 130' INT
trap 'stop 143' TERM

docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

for port in 3333 8081 20080; do
  if lsof -tiTCP:"${port}" -sTCP:LISTEN >/dev/null; then
    echo "port ${port} is already in use" >&2
    exit 1
  fi
done

mkdir -p "${CONF_DIR}" "${LOG_DIR}"

cp "${ROOT_DIR}/deploy/ovenmediaengine/Server.xml.example" "${CONF_DIR}/Server.xml"
perl -0pi -e 's/<Name>ingest\.example\.com<\/Name>\n          <Name>rtc\.example\.com<\/Name>/<Name>127.0.0.1<\/Name>\n          <Name>localhost<\/Name>\n          <Name>ingest.example.com<\/Name>\n          <Name>rtc.example.com<\/Name>/' "${CONF_DIR}/Server.xml"
perl -0pi -e 's/\$\{PublicIP\}:10000-10005\/udp/127.0.0.1:10000-10005\/udp/g' "${CONF_DIR}/Server.xml"
perl -0pi -e 's/replace-with-strong-secret/local-stream-signing-secret/g' "${CONF_DIR}/Server.xml"
perl -0pi -e 's/replace-with-api-token/local-api-token/g' "${CONF_DIR}/Server.xml"

if [ ! -f "${CONF_DIR}/Logger.xml" ]; then
  TEMP_CONTAINER="${CONTAINER_NAME}-conf"
  docker rm -f "${TEMP_CONTAINER}" >/dev/null 2>&1 || true
  docker create --name "${TEMP_CONTAINER}" "${IMAGE_NAME}" >/dev/null
  docker cp "${TEMP_CONTAINER}:/opt/ovenmediaengine/bin/origin_conf/Logger.xml" "${CONF_DIR}/Logger.xml"
  docker rm -f "${TEMP_CONTAINER}" >/dev/null
fi

docker run --name "${CONTAINER_NAME}" --rm \
  -e OME_HOST_IP=127.0.0.1 \
  -v "${CONF_DIR}:/opt/ovenmediaengine/bin/origin_conf" \
  -v "${LOG_DIR}:/var/log/ovenmediaengine" \
  -p 3333:3333 \
  -p 8081:8081 \
  -p 20080:20080 \
  -p 10000-10005:10000-10005/udp \
  "${IMAGE_NAME}" &
CONTAINER_PID="$!"
wait "${CONTAINER_PID}"
