# File preview prerequisite gate — 2026-05-23

`file-preview-prereq: PASS`

| # | Check | Evidence |
| --- | --- | --- |
| G1 | `registerPreviewPaths` + `getState` → loaded + URL | `media-download.service.spec.ts` (thumbnail_path matrix tests) |
| G2 | No false `icon-only` with warm cache | Covered by loaded + cached URL matrix row tests |
| G3 | `resolvePreview` never called when target null | `media-download.service.spec.ts` — G3 suppression test |
| G4 | Display FSM | `icon-only` terminal for Office-without-thumb; image thumb uses loading → loaded path |
| G5 | Slot geometry | `media-item.component.scss` — shrink + `margin-inline: auto` |

Phase 3 Realtime enabled after this gate.
