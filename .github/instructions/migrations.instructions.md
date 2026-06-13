---
name: "Database Migrations"
description: "Use when writing database migrations, schema changes, RLS policies, or SQL functions."
applyTo: "supabase/migrations/**"
---

# Migration Conventions

- Timestamp-prefixed filenames: `YYYYMMDDHHMMSS_description.sql`
- Execution order: extensions → tables → indexes → functions/triggers → RLS → seed → storage
- PostGIS is available — use `geometry` and `geography` types for spatial data
- RLS must be enabled on every new table — no exceptions

## Safety

- Always create reversible migrations
- Never drop columns in the same migration as code removal
- Test rollback before merging
- Use `IF NOT EXISTS` / `IF EXISTS` guards where appropriate

## Hosted push and history sync

Migration **filename timestamps are version IDs**. Local `supabase/migrations/` must stay aligned with remote `schema_migrations`.

**Workflow:**

1. `supabase migration new <description>` → edit SQL → **commit** → `supabase db push`
2. Gate: `supabase migration list` — every applied version must appear in both Local and Remote columns

**`Remote migration versions not found in local migrations directory`:**

| Situation | Fix |
| --- | --- |
| Remote has version, local file missing (schema already applied) | Add/rename local file to **that exact timestamp**; verify with `migration list` |
| Same SQL re-authored under a new timestamp | Rename local file to remote timestamp; delete the duplicate timestamp file |
| Remote record is a mistake | `supabase migration repair --status reverted <version>`, then push idempotent migration |

Do **not** apply hosted schema via Dashboard SQL for git-tracked changes. Do **not** use `db pull` as the default fix for a history-table mismatch.

Full playbook: [supabase/AGENTS.md](../../supabase/AGENTS.md) § Hosted migration history.

## References

- Schema: [docs/architecture/database-schema.md](../../docs/architecture/database-schema.md)
- Security: [docs/security-boundaries.md](../../docs/security-boundaries.md)
- Existing RLS: [supabase/migrations/20260303000005_rls.sql](../../supabase/migrations/20260303000005_rls.sql)
