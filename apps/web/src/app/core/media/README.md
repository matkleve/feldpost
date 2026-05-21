# media core module

Canonical **file-type registry** and **renderer types** (no `media.service.ts` in this folder).

- **Registry / lookup:** `./file-type-registry.ts` — `resolveFileType()`, `fileTypeBadge()`
- **Chip variant mapping:** `./file-type-chip-variant.ts` — `chipVariantForFileType()` → `app-chip` (see spec § Agent entry points)
- **Types:** `./media.types.ts`, `./media-renderer.types.ts`
- **Helpers:** `./media.helpers.ts`
- **Adapters:** `./adapters/`

**Specs:** [`media-types-and-file-registry.md`](../../../../../../docs/specs/service/media/media-types-and-file-registry.md) (service) · [`file-type-chips.md`](../../../../../../docs/specs/component/media/file-type-chips.md) (UI + **Agent entry points**)

This module follows the service symmetry standard.
