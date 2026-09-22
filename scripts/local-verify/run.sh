#!/usr/bin/env bash
# Apply the full migration chain to a throwaway Postgres DB and run the live
# RLS / grant validation scripts (STUDY-010 F-03).
# @see scripts/local-verify/README.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB_NAME="${FELDPOST_VERIFY_DB:-feldpost_verify}"
PSQL=(psql -v ON_ERROR_STOP=1)

echo "==> recreate database ${DB_NAME}"
psql -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
psql -d postgres -c "CREATE DATABASE ${DB_NAME};"

echo "==> supabase harness"
"${PSQL[@]}" -d "${DB_NAME}" -f "${ROOT}/scripts/local-verify/supabase-harness.sql"

echo "==> apply migrations"
shopt -s nullglob
for f in "${ROOT}"/supabase/migrations/*.sql; do
  echo "    $(basename "$f")"
  psql -q -v ON_ERROR_STOP=1 -d "${DB_NAME}" -f "$f" || {
    echo "FAILED: $f" >&2
    exit 1
  }
done

echo "==> seed RLS actors"
"${PSQL[@]}" -d "${DB_NAME}" -f "${ROOT}/scripts/local-verify/seed-rls-actors.sql"

echo "==> validate-authenticated-rpc-grants"
"${PSQL[@]}" -d "${DB_NAME}" -f "${ROOT}/scripts/validate-authenticated-rpc-grants.sql"

echo "==> validate-chat-rls"
"${PSQL[@]}" -d "${DB_NAME}" -f "${ROOT}/scripts/validate-chat-rls.sql"

echo "==> validate-upload-role-rls"
"${PSQL[@]}" -d "${DB_NAME}" -f "${ROOT}/scripts/validate-upload-role-rls.sql"

echo "==> local-verify OK"
