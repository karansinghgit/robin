#!/bin/bash

set -euo pipefail

echo "Robin prerequisite check"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "Missing: node"
  echo "Run: bash ./scripts/bootstrap-node.sh"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Missing: npm"
  exit 1
fi

echo "Node: $(node -v)"
echo "npm : $(npm -v)"

if [[ "$(uname -s)" == "Darwin" ]]; then
  if command -v xcodebuild >/dev/null 2>&1; then
    echo "Xcode: $(xcodebuild -version | head -n 1)"
  else
    echo "Warning: xcodebuild not found. Packaging on macOS may fail."
  fi

  if command -v gh >/dev/null 2>&1; then
    echo "gh   : $(gh --version | head -n 1)"
  else
    echo "Note : GitHub CLI not installed. Release publishing will be unavailable."
  fi
fi

echo ""
echo "Next:"
echo "  npm install"
echo "  npm run test"
echo "  npm run dev"
