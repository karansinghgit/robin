#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is required. Install it with: brew install gh"
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Robin release flow expects a git repository."
  exit 1
fi

VERSION="${VERSION:-${1:-}}"

if [[ -z "$VERSION" ]]; then
  VERSION="$(node -p 'require("./package.json").version')"
fi

TAG="v$VERSION"

if ! git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG does not exist."
  exit 1
fi

mapfile -t ARTIFACTS < <(find out/make -type f \( -name "*.dmg" -o -name "*.zip" \) | sort)

if [[ "${#ARTIFACTS[@]}" -eq 0 ]]; then
  echo "No release artifacts found in out/make."
  echo "Run: VERSION=$VERSION npm run release:prepare"
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

echo "Pushing $CURRENT_BRANCH and $TAG..."
git push origin "$CURRENT_BRANCH"
git push origin "$TAG"

echo "Creating GitHub release..."
gh release create "$TAG" "${ARTIFACTS[@]}" \
  --title "Robin v$VERSION" \
  --generate-notes \
  --latest

echo "Published:"
echo "  $TAG"
