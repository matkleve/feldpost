#!/usr/bin/env bash
# Runs scripts/verify-locations-nn-migration.sql statement-by-statement.
# Usage: scripts/run-verify-locations-nn-migration.sh [--local|--linked]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:---local}"
SQL_FILE="$ROOT/scripts/verify-locations-nn-migration.sql"

if [[ "$MODE" != "--local" && "$MODE" != "--linked" ]]; then
  echo "Usage: $0 [--local|--linked]" >&2
  exit 1
fi

# Split on blank lines between SELECT statements.
awk '
  /^[[:space:]]*$/ { if (stmt != "") { print stmt; stmt = "" }; next }
  { stmt = (stmt == "" ? $0 : stmt "\n" $0) }
  END { if (stmt != "") print stmt }
' "$SQL_FILE" | while IFS= read -r -d '' block || true; do
  [[ -z "${block//[[:space:]]/}" ]] && continue
  echo "---"
  echo "$block" | head -1
  supabase db query "$MODE" "$block" --agent=no -o table
done

echo "---"
echo "Done ($MODE). Expect resolve_media_location_overloads detail: ok: exactly 1 signature"
