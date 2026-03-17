#!/bin/bash

set -euo pipefail

DATA_DIR="$HOME/Library/Application Support/Robin"
mkdir -p "$DATA_DIR"
open "$DATA_DIR"
