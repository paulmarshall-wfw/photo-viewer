#!/usr/bin/env bash
# Photo Viewer — upgrade to a newer image.
# Bump IMAGE_TAG in .env first (or pass --tag X.Y.Z), then run.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ "${1:-}" = "--tag" ] && [ -n "${2:-}" ]; then
  awk -v v="$2" 'BEGIN{FS=OFS="="} $1=="IMAGE_TAG"{$0="IMAGE_TAG="v} 1' .env > .env.tmp && mv .env.tmp .env
  echo "Set IMAGE_TAG=$2"
fi

docker compose pull
docker compose up -d

current="$(grep -E '^IMAGE_TAG=' .env | cut -d= -f2)"
echo "Photo Viewer is now running version: ${current}"
echo "Your data (./data) and photo library mount are unchanged."
