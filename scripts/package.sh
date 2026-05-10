#!/bin/bash

set -e

echo "Building Grab Context Firefox extension..."

cd "$(dirname "$0")/.."

echo "Installing dependencies..."
pnpm install

echo "Building extension..."
pnpm run build

echo "Creating XPI package..."
cd dist
zip -r ../grab-context.xpi . -x "*.DS_Store"
cd ..

echo "Extension packaged successfully!"
echo "Package location: grab-context.xpi"
echo ""
echo "Sideload (temporary):"
echo "  1. Open about:debugging#/runtime/this-firefox"
echo "  2. Click 'Load Temporary Add-on...'"
echo "  3. Select dist/manifest.json"
echo ""
echo "AMO submission:"
echo "  https://addons.mozilla.org/developers/"
