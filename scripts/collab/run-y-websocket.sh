#!/usr/bin/env bash
set -eu
# Simple wrapper to run y-websocket via pnpm dlx which works in pnpm-managed workspaces
PORT=${1:-1234}
echo "Starting y-websocket on port ${PORT} via pnpm dlx"
pnpm dlx y-websocket --port "${PORT}"
