#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

is_port_busy() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

find_free_port() {
  local start="$1"
  local end="$2"
  local port
  for ((port = start; port <= end; port++)); do
    if ! is_port_busy "$port"; then
      echo "$port"
      return 0
    fi
  done
  return 1
}

cleanup_stale_robin_dev() {
  local pids=()
  local pid

  while IFS= read -r pid; do
    [[ -n "$pid" ]] && pids+=("$pid")
  done < <(pgrep -f "$ROOT_DIR/node_modules/.bin/electron-forge start" || true)

  while IFS= read -r pid; do
    [[ -n "$pid" ]] && pids+=("$pid")
  done < <(pgrep -f "$ROOT_DIR/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron \\." || true)

  if [[ "${#pids[@]}" -gt 0 ]]; then
    echo "Stopping stale Robin dev processes..."
    for pid in "${pids[@]}"; do
      kill "$pid" 2>/dev/null || true
    done
    sleep 1
  fi
}

cleanup_stale_robin_dev

DEV_PORT="$(find_free_port 3310 3360 || true)"
LOGGER_PORT="$(find_free_port 9310 9360 || true)"

if [[ -z "${DEV_PORT}" || -z "${LOGGER_PORT}" ]]; then
  echo "Could not find free dev ports in the expected ranges."
  echo "Please free some ports and retry."
  exit 1
fi

export ROBIN_FORGE_PORT="$DEV_PORT"
export ROBIN_FORGE_LOGGER_PORT="$LOGGER_PORT"

echo "Starting Robin dev server on port ${ROBIN_FORGE_PORT} (logger: ${ROBIN_FORGE_LOGGER_PORT})..."

cd "$ROOT_DIR"
exec electron-forge start
