#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$ROOT_DIR/client"
SERVER_DIR="$ROOT_DIR/server"
ENV_FILE="$SERVER_DIR/.env"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required but was not found in PATH."
  exit 1
fi

PYTHON_BIN=""
PYTHON_ARG=""

detect_python() {
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
    return
  fi
  if command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
    return
  fi
  if command -v py >/dev/null 2>&1; then
    PYTHON_BIN="py"
    PYTHON_ARG="-3"
    return
  fi
}

run_python() {
  if [[ -n "$PYTHON_ARG" ]]; then
    "$PYTHON_BIN" "$PYTHON_ARG" "$@"
  else
    "$PYTHON_BIN" "$@"
  fi
}

ensure_ytdlp() {
  detect_python

  if [[ -z "$PYTHON_BIN" ]]; then
    echo "Warning: Python not found. yt-dlp may fail during processing."
    return
  fi

  if run_python -m yt_dlp --version >/dev/null 2>&1; then
    return
  fi

  echo "Installing yt-dlp into $PYTHON_BIN environment..."
  if run_python -m pip install --upgrade yt-dlp; then
    echo "yt-dlp installed."
  else
    echo "Warning: Could not auto-install yt-dlp."
    echo "Run manually: $PYTHON_BIN -m pip install --upgrade yt-dlp"
  fi
}

ensure_ffmpeg() {
  if ! command -v ffmpeg >/dev/null 2>&1 || ! command -v ffprobe >/dev/null 2>&1; then
    echo "Warning: ffmpeg/ffprobe not found in PATH. Video processing will fail until installed."
  fi
}

install_deps_if_needed() {
  local dir="$1"
  local name="$2"

  if [[ ! -d "$dir/node_modules" ]]; then
    echo "Installing $name dependencies..."
    npm --prefix "$dir" install
  fi
}

install_deps_if_needed "$SERVER_DIR" "server"
install_deps_if_needed "$CLIENT_DIR" "client"
ensure_ytdlp
ensure_ffmpeg

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Warning: server/.env not found. Create it before running the backend."
fi

cleanup() {
  echo
  echo "Stopping services..."
  local pids
  pids="$(jobs -p)"
  if [[ -n "$pids" ]]; then
    kill $pids 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting backend on http://localhost:5000"
npm --prefix "$SERVER_DIR" run dev &
SERVER_PID=$!

echo "Starting frontend on http://localhost:5173"
npm --prefix "$CLIENT_DIR" run dev &
CLIENT_PID=$!

echo
echo "Both services are running. Press Ctrl+C to stop."

set +e
wait -n "$SERVER_PID" "$CLIENT_PID"
EXIT_CODE=$?
set -e

if [[ $EXIT_CODE -ne 0 ]]; then
  echo
  echo "A service exited with code $EXIT_CODE. Shutting down the other service..."
  exit $EXIT_CODE
fi
