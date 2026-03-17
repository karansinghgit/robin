#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required."
  exit 1
fi

echo "Packaging Robin for macOS..."
npm run package:mac

APP_PATH="$(find "$ROOT_DIR/out" -type d -name 'Robin.app' | head -n 1)"

if [[ -z "$APP_PATH" ]]; then
  echo "Could not find Robin.app in out/"
  exit 1
fi

echo "Installing $APP_PATH to /Applications/Robin.app"
rm -rf /Applications/Robin.app
cp -R "$APP_PATH" /Applications/Robin.app

echo "Installed."
