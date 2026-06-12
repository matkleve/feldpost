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

## Photon (forward/search via `GEOCODER_FORWARD_URL`)

Forward search and `structured-forward` use **Photon** when `GEOCODER_FORWARD_URL` is set on the Edge runtime; otherwise the `geocode` function falls back to public Nominatim. **Reverse** and **`structured-search`** always use Nominatim.

### Default: shared remote Photon (Hetzner)

Team dev uses Austria Photon on a Hetzner Cloud VM, exposed over HTTPS via [sslip.io](https://sslip.io) (no purchased domain). Canonical URL is in `supabase/config.toml` → `[edge_runtime.secrets]` → `GEOCODER_FORWARD_URL` (currently `https://178-105-242-74.sslip.io`).

Full setup, curl gates, hosted secrets, and troubleshooting: [`docs/playbooks/remote-photon.md`](../docs/playbooks/remote-photon.md).

**Curl gate** (from your laptop):

```bash
curl "https://178-105-242-74.sslip.io/api?q=Fuchsthalergasse+4&lang=de&limit=3"
```

Expect GeoJSON with **Fuchsthallergasse**, house **4**, **Wien** / **1090**.

After changing `GEOCODER_FORWARD_URL` in `config.toml`, reload local edge secrets:

```bash
npm run supabase:ensure-edge
```

(`supabase stop && supabase start` if secrets do not apply.)

**Hosted Supabase:** set the same URL with `supabase secrets set GEOCODER_FORWARD_URL=...` and `supabase functions deploy geocode` when cloud environments should use Photon. Omit the secret to keep Nominatim-only forward geocoding in production.

### Optional: local Photon on the host

For offline or isolated experiments only — loads RAM/CPU on the developer machine:

```bash
docker compose -f docker-compose.photon.yml up -d
docker compose -f docker-compose.photon.yml logs -f   # first run: index download ~10–20 min
```

Set `GEOCODER_FORWARD_URL = "http://host.docker.internal:2322"` in `config.toml`, then `npm run supabase:ensure-edge`. **Linux:** `docker-compose.photon.yml` includes `extra_hosts: host.docker.internal:host-gateway`.

Local curl gate: `curl "http://localhost:2322/api?q=Fuchsthalergasse+4&lang=de&limit=3"`.

## References

- Schema: `docs/architecture/database-schema.md`
- Security rules: `docs/security-boundaries.md`
- RLS policies: `migrations/20260303000005_rls.sql`
