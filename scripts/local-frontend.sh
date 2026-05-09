#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "${ROOT_DIR}"
exec pnpm --dir frontend exec vite --host 127.0.0.1 --strictPort
