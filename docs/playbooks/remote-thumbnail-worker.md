# Remote thumbnail worker (Hetzner)

Generates **PDF + Office** master-raster thumbnails (`thumbnail_path` WebP) for `media_items`. Same Hetzner box as Photon is fine (CPX22 / 4 GB); run backfills **one job at a time** to avoid RAM spikes with LibreOffice.

**Eligible types (spec):** PDF, Word, Excel, PowerPoint (+ odt/ods/odp/txt/csv). **Not** images (client/upload path), **not** video (v1 icon-only). See [media-preview-converter ADR](../architecture/media-preview-converter.md).

## Architecture

```text
Supabase DB webhook (INSERT) ──POST──► https://<hetzner>/generate
Backfill script (laptop)      ──POST──► same URL
Worker ──► Supabase Storage (media bucket) + media_items.thumbnail_path
Browser grid ◄── realtime / signed URL (no direct worker call)
```

## Prerequisites

- SSH to Hetzner (`feldpost-services`, same VM as [remote-photon](./remote-photon.md))
- Docker + Caddy already installed
- **Hosted** Supabase project URL + **service role key** (Dashboard → Settings → API — never commit)
- Repo on server (git clone) or rsync `worker/thumbnail` + compose file

## 1. Clone / update repo on server

```bash
ssh root@178.105.242.74   # or your SSH user/host

sudo mkdir -p /opt/feldpost
cd /opt/feldpost

# First time:
sudo git clone https://github.com/matkleve/feldpost.git repo
cd repo

# Updates:
# cd /opt/feldpost/repo && sudo git pull
```

## 2. Configure environment

```bash
cd /opt/feldpost/repo
sudo cp worker/thumbnail/.env.example /opt/feldpost/.env.thumbnail-worker
sudo chmod 600 /opt/feldpost/.env.thumbnail-worker
sudo nano /opt/feldpost/.env.thumbnail-worker
```

Set **hosted** values (not local `127.0.0.1:54321`):

```env
SUPABASE_URL=https://yvvzbpnoesxlzlbomlkv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-dashboard>
MEDIA_BUCKET_NAME=media
PORT=3001
```

Point compose at the env file:

```bash
cd /opt/feldpost/repo
ln -sf /opt/feldpost/.env.thumbnail-worker .env.thumbnail-worker
```

## 3. Build and start

```bash
cd /opt/feldpost/repo
docker compose -f docker-compose.thumbnail-worker.yml up -d --build
docker compose -f docker-compose.thumbnail-worker.yml ps
docker compose -f docker-compose.thumbnail-worker.yml logs -f thumbnail-worker
```

Local health (on server):

```bash
curl -s http://127.0.0.1:3001/health
# OK
```

## 4. Caddy (public HTTPS)

Photon already uses `https://178-105-242-74.sslip.io`. Add routes for the worker **before** the Photon catch-all.

Edit your Caddyfile (path varies; often `/etc/caddy/Caddyfile`). Example:

```caddy
178-105-242-74.sslip.io {
	handle /generate* {
		reverse_proxy 127.0.0.1:3001
	}
	handle /health {
		reverse_proxy 127.0.0.1:3001
	}
	reverse_proxy 127.0.0.1:2322
}
```

Reload:

```bash
sudo systemctl reload caddy
```

Verify from your laptop:

```bash
curl -s https://178-105-242-74.sslip.io/health
# OK
```

Webhook / backfill URL: `https://178-105-242-74.sslip.io/generate`

## 5. Supabase Database Webhook (new uploads)

Dashboard → **Database** → **Webhooks** → Create hook:

| Field | Value |
| --- | --- |
| Table | `media_items` |
| Events | `INSERT` |
| HTTP method | `POST` |
| URL | `https://178-105-242-74.sslip.io/generate` |
| Headers | `Content-Type: application/json` |

**Filter** (SQL):

```sql
thumbnail_path IS NULL
AND storage_path IS NOT NULL
AND mime_type IS NOT NULL
AND mime_type NOT LIKE 'image/%'
AND mime_type NOT LIKE 'video/%'
```

**Body** (JSON):

```json
{
  "mediaId": "{{ record.id }}",
  "storagePath": "{{ record.storage_path }}",
  "mimeType": "{{ record.mime_type }}",
  "organizationId": "{{ record.organization_id }}",
  "userId": "{{ record.created_by }}"
}
```

Worker returns `202` immediately; check `media_items.thumbnail_path` and `preview_generation_status = ready`.

## 6. Backfill existing PDF / Office rows

From your laptop (repo root), with service role key:

```bash
export SUPABASE_URL=https://yvvzbpnoesxlzlbomlkv.supabase.co
export SUPABASE_SERVICE_ROLE_KEY='<service-role-key>'
export THUMBNAIL_WORKER_URL=https://178-105-242-74.sslip.io/generate

node scripts/backfill-media-thumbnails.mjs
# Dry run first:
node scripts/backfill-media-thumbnails.mjs --dry-run
```

Processes only worker-eligible rows (no thumb, not image/video). Default: one request every 2s.

## 7. Stop calling the deprecated Edge Function from the browser

Production still invokes `generate-media-preview` from the SPA — that function is **not deployed** on hosted Supabase (CORS/502). After the worker is live:

- New uploads: webhook handles generation
- Old rows: backfill script
- Grid UI: shows icon-only until `thumbnail_path` exists (realtime refresh)

Optional follow-up: remove client `enqueue` → edge in `MediaPreviewGenerationService`.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `curl localhost:3001/health` fails | `docker compose … logs thumbnail-worker` — missing env vars? |
| Public `/health` 404 | Caddy routes; reload Caddy |
| `preview_generation_status` stuck `pending` | Worker logs; LibreOffice timeout (120s) |
| `failed` after job | `docker compose … logs` — corrupt file, unsupported mime, storage RLS (worker uses service role) |
| OOM on server | Run backfill slower; upgrade to CPX31 (8 GB); don’t run many LibreOffice jobs in parallel |
| Grid still icon-only after `ready` | Hard refresh; check `thumbnail_path` in DB; signed URL cache |

## References

- [worker/thumbnail/README.md](../../worker/thumbnail/README.md)
- [media-preview-converter ADR](../architecture/media-preview-converter.md)
- [remote-photon.md](./remote-photon.md) (same Hetzner VM)
