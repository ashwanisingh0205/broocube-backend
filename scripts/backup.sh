#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUT_DIR="backups/$TIMESTAMP"
mkdir -p "$OUT_DIR"

echo "Backing up MongoDB to $OUT_DIR"
mongodump --uri "$MONGODB_URI" --out "$OUT_DIR/mongo"

echo "Backup complete"


