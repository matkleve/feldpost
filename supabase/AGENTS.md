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

## Local Photon (forward/search only)

For fuzzy forward geocoding in local dev (e.g. typo-tolerant Austrian addresses), run Austria Photon on the host:

```bash
docker compose -f docker-compose.photon.yml up -d
docker compose -f docker-compose.photon.yml logs -f   # first run: index download ~10–20 min
```

Until logs show the index import finished and Photon is listening, `curl http://localhost:2322/...` may fail with **connection reset** and `docker ps` may show **unhealthy** — that is normal during the first-run download/extract, not a broken port mapping.

**Curl gate** (required before relying on Photon in the edge function):

```bash
curl "http://localhost:2322/api?q=Fuchsthalergasse+4&lang=de&limit=3"
```

Expect GeoJSON `FeatureCollection` with **Fuchsthallergasse**, house **4**, **Wien** / **1090** in the top hit.

**Edge wiring:** `supabase/config.toml` sets `GEOCODER_FORWARD_URL = "http://host.docker.internal:2322"` under `[edge_runtime.secrets]` (dev only — never hosted/production). After changing secrets, restart edge runtime:

```bash
npm run supabase:ensure-edge
```

**Linux:** `docker-compose.photon.yml` includes `extra_hosts: host.docker.internal:host-gateway` so the Supabase edge container can reach host Photon.

**Reverse** and **structured-search** stay on public Nominatim regardless of Photon.

## References

- Schema: `docs/architecture/database-schema.md`
- Security rules: `docs/security-boundaries.md`
- RLS policies: `migrations/20260303000005_rls.sql`
