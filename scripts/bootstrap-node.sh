#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(cat "$ROOT_DIR/.nvmrc")"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$OS" in
  darwin) NODE_OS="darwin" ;;
  linux) NODE_OS="linux" ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

case "$ARCH" in
  arm64|aarch64) NODE_ARCH="arm64" ;;
  x86_64) NODE_ARCH="x64" ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

TARGET_DIR="$ROOT_DIR/.local/node-v${VERSION}-${NODE_OS}-${NODE_ARCH}"
ARCHIVE="node-v${VERSION}-${NODE_OS}-${NODE_ARCH}.tar.xz"
URL="https://nodejs.org/dist/v${VERSION}/${ARCHIVE}"

if [[ -x "$TARGET_DIR/bin/node" ]]; then
  echo "Node v${VERSION} already installed at:"
  echo "  $TARGET_DIR"
  exit 0
fi

mkdir -p "$ROOT_DIR/.local"
cd "$ROOT_DIR/.local"

echo "Downloading $URL"
curl -fsSLO "$URL"
tar -xf "$ARCHIVE"
rm "$ARCHIVE"

echo ""
echo "Installed Node v${VERSION} at:"
echo "  $TARGET_DIR"
echo ""
echo "Add it to PATH for this shell:"
echo "  export PATH=\"$TARGET_DIR/bin:\$PATH\""
