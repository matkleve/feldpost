# Local migration verification

Applies the whole `supabase/migrations/` chain to a throwaway PostgreSQL 16 +
PostGIS instance and runs the SQL validation scripts against it. This is what
turns "static analysis only" — the caveat on issues #136, #193 and #201 — into
an actual result, without needing the hosted database.

`supabase-harness.sql` stubs the parts of a Supabase instance the migrations
assume: the `anon` / `authenticated` / `service_role` / `authenticator` roles,
the `auth` schema (`auth.uid()` reading the `request.jwt.claim.sub` GUC, and
`auth.users` so the signup trigger fires), a `storage` schema, the
`supabase_realtime` publication, and a `net.http_post` stub.

The load-bearing line is this one:

```sql
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
```

That is Supabase's own default-privilege grant, and it is the whole cause of
#193/#201. Without it the bug cannot reproduce and a validation run would pass
vacuously.

## Run

```bash
apt-get install -y postgresql-16 postgresql-16-postgis-3   # once
pg_ctlcluster 16 main start

psql -d postgres -c 'DROP DATABASE IF EXISTS feldpost; CREATE DATABASE feldpost;'
psql -v ON_ERROR_STOP=1 -d feldpost -f scripts/local-verify/supabase-harness.sql
for f in supabase/migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d feldpost -f "$f" || { echo "FAILED: $f"; break; }
done

psql -v ON_ERROR_STOP=1 -d feldpost -f scripts/validate-authenticated-rpc-grants.sql
```

To confirm a validation script still *detects* its bug, re-run the chain while
skipping the fix migration and check that it fails. Omitting
`20260911120000` and `20260911130000` should produce 49 failed checks.

## What this does not prove

Only that the committed migrations agree with each other. It says nothing
about what is applied on hosted — that is still `supabase migration list`.
See `supabase/AGENTS.md` § Deploy order.
