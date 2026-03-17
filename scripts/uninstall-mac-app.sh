#!/bin/bash

set -euo pipefail

echo "Removing Robin.app from /Applications..."

pkill -x Robin 2>/dev/null || true
rm -rf /Applications/Robin.app 2>/dev/null || true
rm -rf "$HOME/Applications/Robin.app" 2>/dev/null || true

echo "Removed."
