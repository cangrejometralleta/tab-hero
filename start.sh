#!/bin/sh
# Launches Tab Hero with live reload and opens it in the browser.
set -e
cd "$(dirname "$0")"
port="${PORT:-5173}"
command -v node >/dev/null || { echo "Node 20.11 or newer is required: https://nodejs.org" >&2; exit 1; }
(sleep 1; xdg-open "http://localhost:$port" >/dev/null 2>&1 || open "http://localhost:$port" >/dev/null 2>&1 || true) &
PORT="$port" exec node dev.js
