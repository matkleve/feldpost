# Supabase — Package Guidelines

## Database

- PostgreSQL with PostGIS extension for geospatial queries
- Row-Level Security (RLS) enforced on all tables — no exceptions
- All data access goes through `org_id` scoping; users only see their organization's data
- Supabase-generated TypeScript types are the single source of truth for the frontend

## Migrations

- Files in `migrations/` with timestamp-prefixed names: `YYYYMMDDHHMMSS_description.sql`
- Order matters: extensions → tables → indexes → functions/triggers → RLS → seed → storage
- Never drop columns in the same migration as code removal
- Always test rollback before merging

## Storage

- Private `images/` bucket
- Paths are relative: `{org_id}/{user_id}/{uuid}.jpg`
- Use signed URLs at runtime — never store or expose absolute URLs

## Local Edge Functions

Geocoding uses the `geocode` Edge Function. If the browser gets **503** on `http://127.0.0.1:54321/functions/v1/geocode`, the Edge Runtime container is usually stopped (`supabase status` lists `supabase_edge_runtime_*` under stopped services).

From repo root:

```bash
npm run supabase:ensure-edge
```

`npm start` in `apps/web` runs this automatically before `ng serve`.

## References

- Schema: `docs/architecture/database-schema.md`
- Security rules: `docs/security-boundaries.md`
- RLS policies: `migrations/20260303000005_rls.sql`
