# Media types and file registry

## What It Is

**File-type registry** and shared **renderer types** for mixed media (image, video, PDF, office docs): MIME/extension matching, aspect ratio hints, icon tokens, and lookup helpers consumed by upload lanes and file-type chips. Not a network service — pure data + functions in `core/media/`.

## What It Looks Like

Upload rows and metadata surfaces show consistent **file type chips** and aspect behavior per registry entry.

## Where It Lives

- **Runtime module:** `apps/web/src/app/core/media/`
- **UI:** [file-type-chips](../../component/file-type-chips.md) (component spec)

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | Resolve type from file | Matching `FileTypeDefinition` | lookup helpers on registry |
| 2 | Read aspect policy | native vs fixed ratio | `FileTypeDefinition.aspectRatio` |

## Component Hierarchy

```text
file-type-registry.ts + media.types.ts + media-renderer.types.ts
`- media.helpers.ts
`- adapters/ (reserved)
```

## Data

| Source | Notes |
| --- | --- |
| `FILE_TYPE_DEFINITIONS` | Canonical table in `file-type-registry.ts` |

## State

None (immutable definitions).

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/media/file-type-registry.ts` | Definitions + lookup |
| `apps/web/src/app/core/media/media-renderer.types.ts` | Renderer contracts |
| `docs/specs/service/media/media-types-and-file-registry.md` | This contract |

## Wiring

### Consumers

- Upload pipeline, item renderers, file-type chips.

## Acceptance Criteria

- [ ] New MIME/extension sets require updating this spec + registry in one change set.
- [ ] Color tokens reference design system token names only.
- [ ] No storage paths in this module.
