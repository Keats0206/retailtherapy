#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env.local"
KEYS=(
  LIVEKIT_URL
  LIVEKIT_API_KEY
  LIVEKIT_API_SECRET
  MUX_TOKEN_ID
  MUX_TOKEN_SECRET
  DATABASE_URL
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  CLERK_SECRET_KEY
  NEXT_PUBLIC_CLERK_SIGN_IN_URL
  NEXT_PUBLIC_CLERK_SIGN_UP_URL
  CHANNEL3_API_KEY
  HOST_ALLOWLIST
  CRON_SECRET
  SENTRY_DSN
)

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

get_env() {
  local key="$1"
  local line
  line=$(grep -E "^${key}=" "$ENV_FILE" | tail -1 || true)
  if [[ -z "$line" ]]; then
    return 1
  fi
  local value="${line#${key}=}"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

for key in "${KEYS[@]}"; do
  if ! value="$(get_env "$key")"; then
    echo "Skipping $key (not set in $ENV_FILE)"
    continue
  fi
  if [[ -z "$value" ]]; then
    echo "Skipping $key (empty)"
    continue
  fi
  for env in production preview; do
    printf '%s' "$value" | vercel env add "$key" "$env" --force --sensitive >/dev/null
  done
  if [[ "$key" == NEXT_PUBLIC_* ]]; then
    printf '%s' "$value" | vercel env add "$key" development --force >/dev/null
  fi
  echo "Synced $key"
done

echo "Done syncing env vars to Vercel."
