#!/usr/bin/env bash
# Lightweight post-deploy smoke checks for frontend environments.
set -euo pipefail

BASE_URL="${1:?Usage: smoke-check.sh <base_url> [api_url]}"
API_URL="${2:-}"

echo "Smoke: homepage ${BASE_URL}"
curl --fail --silent --show-error --max-time 30 "${BASE_URL}/" | head -c 200 >/dev/null

if [[ -n "$API_URL" ]]; then
  echo "Smoke: API health ${API_URL}/health/ready"
  curl --fail --silent --show-error --max-time 30 "${API_URL}/health/ready"
  echo ""
fi

echo "Smoke: organizer tournaments page shell (no 5xx)"
status="$(curl --silent --max-time 30 -o /dev/null -w '%{http_code}' "${BASE_URL}/organizer/tournaments")"
if [[ "$status" -ge 500 ]]; then
  echo "Expected non-5xx for /organizer/tournaments, got ${status}" >&2
  exit 1
fi

echo "Smoke checks passed for ${BASE_URL}"
