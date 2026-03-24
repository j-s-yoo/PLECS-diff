#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/build_extension"

# Clean output directory
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Install dependencies
echo "Installing dependencies..."
npm --prefix "$SCRIPT_DIR" install

# Bundle TypeScript with esbuild
echo "Building extension..."
npm --prefix "$SCRIPT_DIR" run build -- --minify

# Package as VSIX
echo "Packaging VSIX..."
npx @vscode/vsce package --allow-missing-repository --out "$OUTPUT_DIR/"

VSIX_FILE=$(ls "$OUTPUT_DIR"/*.vsix 2>/dev/null | head -1)
echo ""
echo "Build complete: $VSIX_FILE"
echo "Install with: code --install-extension $VSIX_FILE"
