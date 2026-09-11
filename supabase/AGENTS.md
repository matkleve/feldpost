# Supabase — Package Guidelines

## Database

- PostgreSQL with PostGIS extension for geospatial queries
- Row-Level Security (RLS) enforced on all tables — no exceptions
- All data access goes through `organization_id` column scoping; users only see their organization's data
- Supabase-generated TypeScript types are the single source of truth for the frontend

## Migrations

- Files in `migrations/` with timestamp-prefixed names: `YYYYMMDDHHMMSS_description.sql`
- Order matters: extensions → tables → indexes → functions/triggers → RLS → seed → storage
- Never drop columns in the same migration as code removal
- Always test rollback before merging

### Hosted migration history (mandatory — recurring failure mode)

**The migration filename timestamp is the version ID.** Remote `supabase_migrations.schema_migrations` must match committed files in `supabase/migrations/` exactly. This repo has repeatedly drifted when agents or humans applied hosted SQL without committing the file, or re-created the same change under a new timestamp.

**Agents must:**

1. Create migrations only with `supabase migration new <description>` (or an equivalent committed file) — never paste SQL in the Supabase Dashboard SQL editor for schema that belongs in git.
2. **Commit the migration file before** `supabase db push` to hosted. Uncommitted local files are invisible to other machines and cause duplicate timestamps for the same change.
3. Run `supabase migration list` after any hosted push attempt. Every row must show the same version in **Local** and **Remote**. A blank Local column means a remote-only orphan; a blank Remote column means push is still pending.

**If `db push` fails with** `Remote migration versions not found in local migrations directory`:

1. Run `supabase migration list` and note the orphan version (e.g. `20260613132632` on Remote only).
2. **Prefer aligning the filename**, not `migration repair`, when the schema is already correct on remote:
   - Confirm remote objects exist (e.g. `supabase db query --linked "SELECT …"`).
   - Add or rename the local file to use the **remote timestamp exactly**: `YYYYMMDDHHMMSS_description.sql`.
   - Do **not** add a second file with a new timestamp for the same SQL — that blocks future pushes until someone repairs history again.
3. Use `supabase migration repair --status reverted <version>` only when the remote migration record is wrong **and** you intend to re-apply from a different committed file (SQL must be idempotent: `CREATE OR REPLACE`, `DROP … IF EXISTS`).
4. Re-run `supabase migration list` until Local and Remote match, then `supabase db push` should report `Remote database is up to date`.

**Anti-patterns (forbidden):**

- Dashboard SQL / manual trigger creation for changes that should live in `supabase/migrations/`
- `supabase db push` with an uncommitted migration, then committing under a **different** timestamp
- `supabase db pull` as the first fix when only the history table is out of sync (pull creates a new diff migration; rename/repair is usually correct)

## Deploy order (migration before frontend)

**The database half must be applied to hosted before the frontend half ships.**
Both halves are individually correct; nothing about merging them together
enforces the order between them. When the frontend sends an RPC parameter the
deployed function does not have yet, PostgREST cannot resolve the function for
the parameter set it is given and the call fails — and for location writes it
fails *silently at the user level*: the upload completes and the address never
arrives. That is issue #136, which came from `p_address_precision`
(`20260910140000`, widened by `20260910160000`).

Order for any change that touches both halves:

1. `supabase db push` (after committing the migration — see the history rules above).
2. `supabase migration list` — every row shows the same version in **Local** and **Remote**.
3. Only then ship the frontend build.
4. Verify one real write end to end (for location changes: one upload with coordinates, then confirm the address persisted).

`npm run verify` runs `scripts/check-rpc-param-contract.mjs`, which compares
every `.rpc('name', {...})` call site in `apps/web` against the function
signatures parsed from `supabase/migrations/` and fails on a parameter no live
function accepts. That catches the mismatch **at commit time**, which is the
only point where a human can still act on it cheaply. It proves the two
committed halves agree — it cannot know what is applied on hosted, so step 2
is still yours.

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

**Hosted CORS:** set `ALLOWED_ORIGINS` on the cloud project (include `https://feldpost.pages.dev` and `https://*.feldpost.pages.dev` for Cloudflare previews) and redeploy `geocode`. See [`docs/playbooks/remote-photon.md`](../docs/playbooks/remote-photon.md#cors-allowed_origins).

## Photon (forward/search via `GEOCODER_FORWARD_URL`)

Forward search and `structured-forward` use **Photon** when `GEOCODER_FORWARD_URL` is set on the Edge runtime; otherwise the `geocode` function falls back to public Nominatim. **Reverse** and **`structured-search`** always use Nominatim.

Full setup (shared Hetzner default, curl gates, hosted secrets, local docker option, troubleshooting): [`docs/playbooks/remote-photon.md`](../docs/playbooks/remote-photon.md). After changing `GEOCODER_FORWARD_URL` in `config.toml`, run `npm run supabase:ensure-edge`.

## References

- Schema: `docs/architecture/database-schema.md`
- Security rules: `docs/security-boundaries.md`
- RLS policies: `migrations/20260303000005_rls.sql`
