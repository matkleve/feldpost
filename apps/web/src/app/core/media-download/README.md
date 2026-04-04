# Media Download Module

## Purpose

This module is the single orchestration boundary for preview signing, media downloads, and export flows.
The UI must enter through `media-download.service.ts` only.

## Structure

- `media-download.service.ts`: Facade and only UI entrypoint
- `media-download.types.ts`: Central module types and contracts
- `media-download.helpers.ts`: Pure mappers and helper functions
- `adapters/signed-url-cache.adapter.ts`: Cache lifecycle and signed URL orchestration
- `adapters/supabase-storage.adapter.ts`: Supabase storage signing fallback calls
- `adapters/tier-resolver.adapter.ts`: Tier policy and fallback resolution
- `adapters/edge-export-orchestrator.adapter.ts`: Edge-first export with local fallback

## Rules

- Keep shared contracts centralized in `media-download.types.ts`.
- Keep facade slim by delegating technical work to `adapters/`.
- Do not add module-external global adapters for media-download logic.
