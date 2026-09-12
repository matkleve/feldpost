# Scripts

## Upload pipeline trace

Pushes a synthetic batch through the real upload pipeline (headless, no Supabase, no network) and
prints every step: intake, Search Object creation and filling, grouping, dedup, geocode, resolver
trays, storage key and `media_items` payload — with a real-vs-mock legend at the end.

```bash
# From repo root
npm run trace:upload                                      # 15 curated files
npm run trace:upload -- --count=150 --seed=7 --detail=5    # generated corpus
npm run trace:upload -- --answer-trays                     # continue past the user gate
npm run trace:upload -- --scale=100000                     # database-scale cost measurement
npm run trace:upload -- --out=trace.txt                    # keep the report
```

`--scale=N` answers the company-migration question instead of tracing a batch: it streams N
generated paths through the real Search Object builder and measures the real job store, then
projects to 10 000 / 100 000 / 1 000 000 files. The full end-to-end run tops out around 5 000
files (~3.5 min); the scale tier handles 100 000+ because it materialises nothing.

The harness itself is a Vitest spec (`apps/web/src/app/core/upload/trace/upload-pipeline-trace.spec.ts`)
so it drives the real Angular services; this wrapper only maps flags to env vars and prints the
report. Without `UPLOAD_TRACE=1` the same spec prints nothing and only asserts, so it doubles as a
regression test — see the playbook for why `npm run verify` does not reach it yet.

Full walkthrough, including what is real and what is stubbed: [`docs/playbooks/upload-pipeline-trace.md`](../docs/playbooks/upload-pipeline-trace.md).

## Geocoder pipeline diagnostic

Traces Internet search for a query: Supabase clusters → direct Nominatim → app filter gates → UI count.

```bash
# From repo root; requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env or `supabase status -o env`)
npm run diagnose:geocoder -- --query "Denis"

node --experimental-strip-types scripts/diagnose-geocoder.ts --query "Denis" --project-id <uuid>
node --experimental-strip-types scripts/diagnose-geocoder.ts --query "Denis" --unbounded
node --experimental-strip-types scripts/diagnose-geocoder.ts --query "Denis" --global
```

Optional env: `NOMINATIM_URL` (default `https://nominatim.openstreetmap.org`).

**Note:** `get_media_clusters` uses `user_org_id()` from `auth.uid()`. The service role often returns **0 clusters**; the script then builds a **fallback** project bounding box from `media_items` GPS (labeled in output). For real DBSCAN clusters, run against a stack where the RPC is populated or inspect clusters in the app session.

Respect Nominatim usage policy (1 req/s); the script sleeps 1.1s between cluster calls.
