#!/bin/bash
# Produce the reviewable source archive AMO requires when a build contains
# bundled or minified JavaScript. Mirrors the working tree but excludes
# everything not needed to reproduce the dist (node_modules, dist, signing
# artifacts, hidden files, the icon-source PNG renders).

set -e
cd "$(dirname "$0")/.."

OUTPUT="grab-context-source.zip"
rm -f "$OUTPUT"

zip -r "$OUTPUT" \
  src \
  public \
  scripts \
  docs \
  icon-source/icon.svg \
  package.json \
  pnpm-lock.yaml \
  tsconfig.json \
  vite.config.ts \
  README.md \
  LICENSE \
  NOTICE \
  STORE_LISTING.md \
  -x "*.DS_Store" "*/node_modules/*"

echo
echo "Wrote $OUTPUT"
echo
echo "Reviewer build steps for AMO:"
echo "  1. unzip $OUTPUT"
echo "  2. pnpm install"
echo "  3. pnpm build"
echo "  4. dist/ matches the submitted XPI."
