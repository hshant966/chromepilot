#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/chromepilot/controller"
npm install >/dev/null
exec node src/index.js --mcp
