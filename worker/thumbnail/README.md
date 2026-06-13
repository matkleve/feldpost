# Thumbnail worker

Standalone Node service for Office/PDF master-raster thumbnails (`preview_generation_status` lifecycle).

See [docs/architecture/media-preview-converter.md](../../docs/architecture/media-preview-converter.md).

## Setup

Host deps (local dev): `libreoffice-nogui` (or `soffice`), `poppler-utils` (`pdftoppm`).

```bash
cd worker/thumbnail
cp .env.example .env
# Fill SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (supabase status -o env)
npm ci
npm run build
npm start
```

PDF rasterization tries sharp first; falls back to `pdftoppm` when libvips lacks PDF support.

Health: `curl http://127.0.0.1:3001/health`

## Manual generate (local)

```bash
curl -sS -X POST http://127.0.0.1:3001/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "mediaId": "<uuid>",
    "storagePath": "<org>/<user>/<file>.pptx",
    "mimeType": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "organizationId": "<org-uuid>",
    "userId": "<user-uuid>"
  }'
```

Returns `202` immediately; check logs and `media_items.thumbnail_path`.

## Docker

```bash
docker build -t feldpost-thumbnail-worker .
docker run --rm -p 3001:3001 --env-file .env feldpost-thumbnail-worker
```

Supabase DB webhooks from Docker should use `http://host.docker.internal:3001/generate`.

**Production (Hetzner):** [docs/playbooks/remote-thumbnail-worker.md](../../docs/playbooks/remote-thumbnail-worker.md)

## Tests

```bash
node --import tsx --test src/paths.test.ts
```
