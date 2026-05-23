# Gotenberg (local Office preview)

Required for PPTX/DOCX/XLSX grid thumbnails when using `generate-media-preview`.

```bash
docker compose -f supabase/gotenberg/docker-compose.yml up -d
supabase secrets set GOTENBERG_URL=http://host.docker.internal:3000
```

Apply migration `20260523180000_media_preview_generation_status.sql`, then reload `/media`. Existing Office files enqueue on first paint (`idle` → `pending` → `ready`).

See [docs/architecture/media-preview-converter.md](../../docs/architecture/media-preview-converter.md).
