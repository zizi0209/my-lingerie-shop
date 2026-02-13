#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]]; then
  cloudflared tunnel --no-autoupdate run --token "$CLOUDFLARE_TUNNEL_TOKEN" &
fi

UVICORN_WORKERS=${UVICORN_WORKERS:-1}
UVICORN_HOST=${UVICORN_HOST:-0.0.0.0}
UVICORN_PORT=${PORT:-8000}

exec uvicorn app.main:app --host "$UVICORN_HOST" --port "$UVICORN_PORT" --workers "$UVICORN_WORKERS"
