#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PID=""
FRONTEND_PID=""

backend_start_cmd() {
  if command -v uv >/dev/null 2>&1; then
    echo "uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000"
  elif [ -x "$ROOT/backend/.venv/bin/python" ]; then
    echo "./.venv/bin/python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
  else
    echo ""
  fi
}

frontend_dev_cmd() {
  if command -v bun >/dev/null 2>&1; then
    echo "bun dev"
  elif command -v npm >/dev/null 2>&1; then
    echo "npm run dev"
  else
    echo ""
  fi
}

cleanup() {
  trap - EXIT INT TERM HUP
  echo ""
  echo "Shutting down…"
  # Gracefully stop tracked children
  for pid in $BACKEND_PID $FRONTEND_PID; do
    [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
  done
  # Brief wait for graceful shutdown
  sleep 1
  # Force-kill anything still holding our ports
  for port in 3000 8000; do
    pids=$(lsof -ti :"$port" 2>/dev/null) || true
    if [ -n "$pids" ]; then
      echo "Killing leftover processes on :$port (PIDs: $pids)"
      echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
  done
  exit 0
}
trap cleanup EXIT INT TERM HUP

echo "Starting backend on :8000 …"
BACKEND_CMD="$(backend_start_cmd)"
if [ -z "$BACKEND_CMD" ]; then
  echo "Could not find uv or backend/.venv/bin/python for the backend."
  exit 1
fi
(cd "$ROOT/backend" && eval "$BACKEND_CMD") &
BACKEND_PID=$!

echo "Starting frontend on :3000 …"
FRONTEND_CMD="$(frontend_dev_cmd)"
if [ -z "$FRONTEND_CMD" ]; then
  echo "Could not find bun or npm for the frontend."
  exit 1
fi
(cd "$ROOT/frontend" && eval "$FRONTEND_CMD") &
FRONTEND_PID=$!

# Wait for either to exit — cleanup handles the rest
wait
