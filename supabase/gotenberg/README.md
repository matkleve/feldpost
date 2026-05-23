# Gotenberg (local Office preview)

Required for PPTX/DOCX/XLSX grid thumbnails when using `generate-media-preview`.

```bash
docker compose -f supabase/gotenberg/docker-compose.yml up -d
```

`GOTENBERG_URL` is set in `supabase/config.toml` → `[edge_runtime.secrets]` for local dev.

After adding `generate-media-preview`, run once:

```bash
node scripts/run-supabase-cli.mjs functions serve
```

(`npm start` runs `scripts/ensure-media-preview-dev.mjs` which starts this if the function was missing.)

Apply migration `20260523180000_media_preview_generation_status.sql`, then reload `/media`. Existing Office files with `failed` status are retried on next grid view (`failed` → `idle` → `pending` → `ready`).

See [docs/architecture/media-preview-converter.md](../../docs/architecture/media-preview-converter.md).
