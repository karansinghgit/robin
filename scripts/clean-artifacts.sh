#!/bin/bash

set -euo pipefail

echo "Cleaning build artifacts..."

rm -rf .webpack out dist

echo "Done."
