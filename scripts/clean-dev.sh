#!/bin/bash

set -euo pipefail

echo "Cleaning Robin app data..."

pkill -f "/Robin.app/Contents/MacOS/Robin" 2>/dev/null || true
pkill -x Robin 2>/dev/null || true

rm -rf "$HOME/Library/Application Support/Robin" 2>/dev/null || true
rm -rf "$HOME/Library/Caches/Robin" 2>/dev/null || true
rm -rf "$HOME/Library/Preferences/com.robin.sidekick.plist" 2>/dev/null || true
rm -rf "$HOME/Library/Saved Application State/com.robin.sidekick.savedState" 2>/dev/null || true

echo "Done."
