# Media file identity helper

> Parent: [media-download-service.md](./media-download-service.md)

## Contract (`mediaFileIdentityFromRecord`)

Implementation: `apps/web/src/app/core/media/media-file-identity.helpers.ts`

| Field | Type | Rule |
| --- | --- | --- |
| **Inputs** | `Pick<MediaRecord, 'storage_path' \| 'original_filename'>` or `{ storagePath; originalFilename }` | Both may be null/empty |
| **Output** | `MediaFileIdentity` | Always valid for `resolveFileType()` |
| `extension` | `string \| undefined` | Lowercase, no dot; `storage_path` basename first, else `original_filename`; else `undefined` |
| `fileName` | `string \| undefined` | Trimmed `original_filename`, or basename of `storage_path` |
| **No throw** | — | Missing paths → `unknown` via registry |
| **Precedence** | — | If extensions disagree, **`storage_path` wins** |

All callsites (`MediaItem`, `MediaDownloadService`, upload persist) MUST import this helper — no duplicate extension parsing.

## Tests (required)

1. `report.pdf` storage + `notes.docx` filename → `pdf`
2. Path only
3. Filename only
4. Both missing → `unknown`
