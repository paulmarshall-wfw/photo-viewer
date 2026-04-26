#!/usr/bin/env bash
# Photo Viewer — one-shot installer for macOS / Linux.
# Run from the directory containing docker-compose.yml.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: 'docker' is not on PATH. Install Docker Desktop (macOS/Windows) or Docker Engine (Linux), then re-run." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Error: 'docker compose' is unavailable. Update Docker to a version that includes the Compose plugin." >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example."
fi

prompt_var() {
  local var="$1" label="$2" default="${3:-}"
  local current
  current="$(grep -E "^${var}=" .env | head -n1 | cut -d= -f2- || true)"
  if [ -z "${current}" ]; then
    local suffix=""
    [ -n "${default}" ] && suffix=" [${default}]"
    read -r -p "${label}${suffix}: " value
    value="${value:-${default}}"
    if [ -n "${value}" ]; then
      # Replace the line in .env
      if grep -qE "^${var}=" .env; then
        # Use a temp file for cross-platform sed
        awk -v k="${var}" -v v="${value}" 'BEGIN{FS=OFS="="} $1==k{$0=k"="v} 1' .env > .env.tmp && mv .env.tmp .env
      else
        echo "${var}=${value}" >> .env
      fi
    fi
  fi
}

prompt_var LIBRARY_PATH "Absolute path to your photo library"
prompt_var PORT "Port (LAN-visible)" "3000"

# Auto-generate SESSION_SECRET if blank
if grep -qE "^SESSION_SECRET=$" .env || ! grep -qE "^SESSION_SECRET=" .env; then
  secret="$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | base64 | tr -d '\n/+=' | head -c 48)"
  awk -v v="${secret}" 'BEGIN{FS=OFS="="} $1=="SESSION_SECRET"{$0="SESSION_SECRET="v; found=1} 1; END{if(!found) print "SESSION_SECRET="v}' .env > .env.tmp && mv .env.tmp .env
  echo "Generated SESSION_SECRET."
fi

mkdir -p data

echo "Pulling image…"
docker compose pull
echo "Starting…"
docker compose up -d

echo "Waiting for the server to become ready…"
port="$(grep -E '^PORT=' .env | cut -d= -f2)"
for i in $(seq 1 30); do
  if curl -fsS "http://localhost:${port}/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo ""
echo "Running first-time admin setup…"
docker compose exec photo-viewer node /app/scripts/create-admin.mjs

lan_ip="$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo localhost)"
echo ""
echo "============================================================"
echo " Photo Viewer is running."
echo "   On this machine: http://localhost:${port}/"
echo "   On your LAN:     http://${lan_ip}:${port}/"
echo "============================================================"
