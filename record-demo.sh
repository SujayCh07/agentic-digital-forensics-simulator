#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Checking Playwright..."
cd "$ROOT/frontend"
if ! node -e "require('playwright')" 2>/dev/null; then
  echo "Installing Playwright..."
  if command -v bun >/dev/null 2>&1; then
    bun add -d playwright
  elif command -v npm >/dev/null 2>&1; then
    npm install --save-dev playwright
  else
    echo "Could not find bun or npm to install Playwright."
    exit 1
  fi
  npx playwright install chromium
fi

echo "Starting recording... (make sure ./run-start.sh is already running)"
node "$ROOT/scripts/record-demo.js" "$@"
