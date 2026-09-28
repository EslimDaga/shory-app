#!/usr/bin/env bash
# Hardens Supabase Auth for release and deploys the delete-account function.
#
#   SUPABASE_ACCESS_TOKEN=<token> scripts/supabase/harden-auth.sh
#
# The token is a personal access token from https://supabase.com/dashboard/account/tokens.
# Only the fields listed below are changed; every other auth setting (site URL, redirect URLs,
# providers, SMTP) is left exactly as it is.
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-fqkkiehcjekogizwsayw}"
API="https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Set SUPABASE_ACCESS_TOKEN first (https://supabase.com/dashboard/account/tokens)." >&2
  exit 1
fi

auth=(-H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" -H "Content-Type: application/json")

echo "Current values:"
curl -fsS "${auth[@]}" "$API" | python3 -c '
import json, sys
config = json.load(sys.stdin)
for key in sorted(config):
    if key.startswith(("rate_limit_", "password_", "security_", "mailer_secure")):
        print(f"  {key} = {config[key]}")
'

# Sign-in and sign-up attempts per IP are capped by Supabase itself (not configurable here).
# Passwords: at least 8 characters with lower- and uppercase letters and digits, the same rule the
# app checks (src/utils/passwordStrength.ts). Rate limits: per IP, per 5 minutes, except emails
# (per hour, and only meaningful with a custom SMTP).
curl -fsS -X PATCH "${auth[@]}" "$API" -d @- > /dev/null <<'JSON'
{
  "password_min_length": 8,
  "password_required_characters": "abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789",
  "security_update_password_require_reauthentication": true,
  "mailer_secure_email_change_enabled": true,
  "rate_limit_verify": 30,
  "rate_limit_token_refresh": 150,
  "rate_limit_otp": 30
}
JSON
echo "Auth settings updated."

npx supabase functions deploy delete-account --project-ref "$PROJECT_REF"
echo "delete-account deployed."
