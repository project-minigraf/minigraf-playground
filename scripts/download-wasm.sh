#!/usr/bin/env bash
set -euo pipefail

CONFIG=$(cat wasm.config.json)
URL=$(echo "$CONFIG" | grep -o '"url": "[^"]*"' | cut -d'"' -f4)
OUT=$(echo "$CONFIG" | grep -o '"outputDir": "[^"]*"' | cut -d'"' -f4)

echo "Downloading Minigraf WASM from $URL..."
mkdir -p "$OUT"
curl -fsSL "$URL" | tar -xz -C "$OUT"
echo "WASM extracted to $OUT/"

echo "--- WASM API surface (.d.ts) ---"
cat "$OUT"/*.d.ts 2>/dev/null || echo "No .d.ts found — check tarball contents"