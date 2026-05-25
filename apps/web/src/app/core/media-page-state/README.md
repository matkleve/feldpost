# media-page-state

Session-scoped cache for the `/media` gallery (`WorkspaceMedia[]` per `querySignature`).

- Facade: `media-page-state.service.ts`
- Types: `media-page-state.types.ts`
- Signature: `media-page-state.helpers.ts`

If signature at route enter differs from the cached entry, treat as a **cache miss** (never serve stale rows).

Upload invalidation is root-scoped via `UploadManagerService` so uploads on `/map` update cache before return to `/media`.
