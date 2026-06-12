# Remote Photon (Hetzner + sslip.io)

Photon provides typo-tolerant forward geocoding for upload and search. The team default is a **shared Austria Photon** on Hetzner so developers do not run `docker-compose.photon.yml` on their laptops.

The Angular app never calls Photon directly. Traffic flows:

```text
Browser → Supabase Edge `geocode` → GEOCODER_FORWARD_URL (HTTPS) → Photon /api and /structured
```

Reverse geocoding stays on public Nominatim regardless of Photon.

## Current dev URL

Set in `supabase/config.toml` → `[edge_runtime.secrets]`:

```toml
GEOCODER_FORWARD_URL = "https://178-105-242-74.sslip.io"
```

That hostname is [sslip.io](https://sslip.io): `178-105-242-74` maps to server IPv4 `178.105.242.74`. No purchased domain required. If the VPS IP changes, update Caddy on the server, this config value, and hosted secrets (see below).

## Prerequisites

- SSH access to the Hetzner Cloud server (see server credentials in your team password manager — not committed to git).
- Local Supabase running for dev: `supabase start`, then `npm run supabase:ensure-edge` after any `config.toml` secret change.

## Verify Photon (from your laptop)

```bash
curl -s "https://178-105-242-74.sslip.io/api?q=Fuchsthalergasse+4&lang=de&limit=3"
```

Expect GeoJSON with **Fuchsthallergasse**, house **4**, **Wien**, **1090**.

Verify via local Edge (after `supabase start`):

```bash
curl -s "http://127.0.0.1:54321/functions/v1/geocode" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -d '{"action":"forward","q":"Fuchsthalergasse 4 Wien","limit":3}'
```

## Server layout (Hetzner)

- **VM:** Ubuntu 24.04, CPX22 or larger (4 GB+ RAM for `REGION=austria`).
- **Docker:** `/opt/feldpost/docker-compose.yml` — `rtuszik/photon-docker:latest`, `REGION=austria`, port `127.0.0.1:2322:2322`.
- **Caddy:** TLS reverse proxy to Photon; site block hostname matches sslip name.

First index import on a new volume takes ~15–20 minutes.

## Hosted Supabase (production / cloud dev)

When the cloud project should use the same Photon:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set GEOCODER_FORWARD_URL=https://178-105-242-74.sslip.io
supabase functions deploy geocode
```

Unset `GEOCODER_FORWARD_URL` on hosted to fall back to Nominatim for forward search only.

## Optional: local Photon on your PC

For offline work or isolated experiments:

```bash
docker compose -f docker-compose.photon.yml up -d
```

Temporarily set in `supabase/config.toml`:

```toml
GEOCODER_FORWARD_URL = "http://host.docker.internal:2322"
```

On Linux, `docker-compose.photon.yml` includes `extra_hosts: host.docker.internal:host-gateway`. Run `npm run supabase:ensure-edge` after switching URLs. Do not run local and remote Photon unless you enjoy high RAM use.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Upload typos return `[]` in dev | `GEOCODER_FORWARD_URL` in edge container; `npm run supabase:ensure-edge` |
| Edge 503 on `/geocode` | `supabase status` — edge runtime running |
| sslip curl fails | Photon container on server: `docker compose -f /opt/feldpost/docker-compose.yml ps` |
| Wrong street after IP change | Update Caddy site name, `config.toml`, and hosted secret to new `X-X-X-X.sslip.io` |

## References

- [`supabase/AGENTS.md`](../../supabase/AGENTS.md#photon-forwardsearch-via-geocoder_forward_url)
- [`docs/specs/service/geocoding/geocoding-service.md`](../specs/service/geocoding/geocoding-service.md)
- [`docker-compose.photon.yml`](../../docker-compose.photon.yml) (optional local fallback)
