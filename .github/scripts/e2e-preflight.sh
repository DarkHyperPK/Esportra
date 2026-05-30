#!/usr/bin/env bash
# Validate E2E secrets and auth before Playwright runs.
# Exits 1 with actionable messages for misconfiguration (not cryptic test timeouts).
set -euo pipefail

require() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "::error title=Missing secret::${name} is not set in GitHub repository secrets."
    missing+=("$name")
  fi
}

missing=()

require E2E_API_URL
require E2E_SUPABASE_URL
require E2E_SUPABASE_ANON_KEY
require E2E_ORGANIZER_EMAIL
require E2E_ORGANIZER_PASSWORD
require E2E_PLAYER1_EMAIL
require E2E_PLAYER1_PASSWORD
require E2E_PLAYER2_EMAIL
require E2E_PLAYER2_PASSWORD

if [[ "${PREFLIGHT_REQUIRE_VITE:-false}" == "true" ]]; then
  require VITE_SUPABASE_URL
  require VITE_SUPABASE_ANON_KEY
  require VITE_API_URL
fi

if ((${#missing[@]} > 0)); then
  echo ""
  echo "Configure these in GitHub → Settings → Secrets and variables → Actions:"
  printf '  - %s\n' "${missing[@]}"
  echo "See docs/ci-cd-setup.md and e2e/.env.example"
  exit 1
fi

API_URL="${E2E_API_URL%/}"
SUPABASE_URL="${E2E_SUPABASE_URL%/}"

echo "Preflight: checking API health at ${API_URL}/health/ready"
if ! curl --fail --silent --show-error --max-time 30 "${API_URL}/health/ready" >/dev/null; then
  echo "::error title=API unreachable::${API_URL}/health/ready did not respond. Is staging API up?"
  exit 1
fi

echo "Preflight: Supabase sign-in for organizer (${E2E_ORGANIZER_EMAIL})"
auth_response="$(curl --silent --show-error --max-time 30 \
  -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${E2E_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${E2E_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${E2E_ORGANIZER_EMAIL}\",\"password\":\"${E2E_ORGANIZER_PASSWORD}\"}" \
  -w "\n__HTTP__%{http_code}")"

auth_body="${auth_response%%__HTTP__*}"
auth_status="${auth_response##*__HTTP__}"

if [[ "$auth_status" != "200" ]]; then
  echo "::error title=Organizer login failed::Supabase rejected organizer credentials (HTTP ${auth_status}). Check E2E_ORGANIZER_PASSWORD and that the account exists on ${SUPABASE_URL}."
  echo "$auth_body" | head -c 500
  exit 1
fi

access_token="$(echo "$auth_body" | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")"

echo "Preflight: API accepts organizer JWT"
api_status="$(curl --silent --max-time 30 -o /tmp/e2e-preflight-body.txt -w '%{http_code}' \
  -H "Authorization: Bearer ${access_token}" \
  "${API_URL}/api/tournaments?page=1&page_size=1")"

if [[ "$api_status" == "401" || "$api_status" == "403" ]]; then
  echo "::error title=Supabase/API mismatch::API returned ${api_status} for organizer token. E2E_SUPABASE_URL must match the Supabase instance that ${API_URL} validates."
  cat /tmp/e2e-preflight-body.txt | head -c 500 || true
  exit 1
fi

if [[ "$api_status" -ge 500 ]]; then
  echo "::error title=API error::GET /api/tournaments returned ${api_status} during preflight."
  cat /tmp/e2e-preflight-body.txt | head -c 500 || true
  exit 1
fi

if [[ "${PREFLIGHT_REQUIRE_VITE:-false}" == "true" ]]; then
  if [[ "${VITE_SUPABASE_URL%/}" != "${SUPABASE_URL}" ]]; then
    echo "::error title=Vite/Supabase mismatch::VITE_SUPABASE_URL (${VITE_SUPABASE_URL}) must match E2E_SUPABASE_URL (${E2E_SUPABASE_URL}) so UI login tests use the same Supabase project as API auth."
    exit 1
  fi
  if [[ "${VITE_API_URL%/}" != "${API_URL}" ]]; then
    echo "::warning title=Vite/API URL differs::VITE_API_URL (${VITE_API_URL}) differs from E2E_API_URL (${API_URL}). UI may call a different API than E2E helpers."
  fi
fi

echo "E2E preflight passed — credentials and API auth are aligned."
