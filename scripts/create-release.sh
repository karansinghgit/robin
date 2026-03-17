#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required for releases."
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Robin release flow expects a git repository."
  exit 1
fi

if git rev-parse --verify HEAD >/dev/null 2>&1; then
  if ! git diff-index --quiet HEAD --; then
    echo "You have uncommitted changes."
    git status --short
    exit 1
  fi
else
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "You have uncommitted changes."
    git status --short
    exit 1
  fi
fi

VERSION="${VERSION:-${1:-}}"

if [[ -z "$VERSION" ]]; then
  VERSION="$("$ROOT_DIR/scripts/nodew" -e 'const v=require("./package.json").version.split(".").map(Number); v[2] += 1; console.log(v.join("."));')"
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version must look like 0.1.0"
  exit 1
fi

echo "Preparing Robin v$VERSION"

"$ROOT_DIR/scripts/npmw" version "$VERSION" --no-git-tag-version
"$ROOT_DIR/scripts/npmw" run test
"$ROOT_DIR/scripts/npmw" run make:mac

git add package.json package-lock.json 2>/dev/null || git add package.json
git commit -m "release: v$VERSION"
git tag "v$VERSION"

echo ""
echo "Release prepared."
echo "Artifacts:"
find out/make -type f \( -name "*.dmg" -o -name "*.zip" \) | sort || true
echo ""
echo "Next:"
echo "  VERSION=$VERSION ./scripts/npmw run release:publish"
