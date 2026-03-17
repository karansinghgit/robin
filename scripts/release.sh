#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

VERSION="${VERSION:-${1:-}}"

if [[ -z "$VERSION" ]]; then
  VERSION="$(node -e 'const v=require("./package.json").version.split(".").map(Number); v[2] += 1; console.log(v.join("."));')"
fi

VERSION="$VERSION" bash ./scripts/create-release.sh
VERSION="$VERSION" bash ./scripts/deploy-release.sh
