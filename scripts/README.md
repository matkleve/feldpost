# Scripts

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
