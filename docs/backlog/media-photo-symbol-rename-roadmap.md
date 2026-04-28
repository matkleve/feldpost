# Roadmap: photo / image → media naming (code + CSS)

**Status:** Deferred — no obligation to execute as a single project.

**Goal:** Align identifiers with the **media** domain where it reduces confusion, without pretending historical RPC/column names disappear overnight.

## Principles

- **Product language** first (docs, UI copy, new public APIs): **media**, **Workspace Pane**.
- **Slice work** into reviewable PRs; optional **aliases** at boundaries (`newName` delegates to old until callers migrate).
- **Database/RPC** renames are costly; **canonical `media_item_id` in app layers**, compatibility fields (`image_id`, `cluster_images`) until a dedicated migration.

---

## Slice 0 — Policy (no mass rename)

- New code uses target vocabulary only.
- Rename existing symbols only when touching that module—or when a name is actively misleading.

---

## Slice 1 — Map feature TypeScript (contained blast radius)

Primary paths: `apps/web/src/app/features/map/map-shell/`, `apps/web/src/app/core/map/marker-factory.ts`.

| Area | Current examples | Rename direction (example) |
| --- | --- | --- |
| Workspace visibility signal | `photoPanelOpen` (`map-shell.state.ts`, component, template, spec) | `workspacePaneOpen` or similar |
| Marker HTML builder | `buildPhotoMarkerHtml` | `buildMediaMarkerHtml` |
| Handlers | `handlePhotoMarkerClick`, `refreshPhotoMarker` | `handleMediaMarkerClick`, `refreshMediaMarker` |
| In-memory map | `uploadedPhotoMarkers` | e.g. `markersByKey` / `onMapMediaMarkers` (pick one) |
| Types / services | `PhotoMarkerState`, `PhotoMarkerIconStateService`, `photo-marker-icon-state.service.ts` | `MediaMarker*` naming |

**Gate:** `ng build`, map-related tests green — **before** CSS-wide class churn.

---

## Slice 2 — CSS + Leaflet HTML strings

Mechanical rename of marker chrome:

- Classes: `map-photo-marker*` → e.g. `map-media-marker*` (confirm prefix once).
- Tokens: `--photo-marker-*` in `apps/web/src/styles/tokens.scss`, `map-shell.component.scss`.
- String emission: `marker-factory.ts`; selectors in `detail-zoom-highlight.service.ts`, `marker-interaction.service.ts`, `map-shell-helpers.ts`, `map-shell.component.ts` (`closest`, spotlight).

**Gate:** Full UI smoke (single/cluster marker, placeholder, selection, spotlight, long-press cone). Global replace without a checklist is high-risk.

---

## Slice 3 — Upload pipeline observables (cross-cutting)

`UploadManagerService` streams and payloads: `imageReplaced$`, `imageAttached$`, `ImageUploadedEvent`, `event.imageId`, etc.

Prefer **alias + migrate callers** over one mega-diff across subscribers (`MapShellComponent`, media detail, upload specs).

---

## Slice 4 — Supabase / RPC / columns (last or selective)

Migrations already reference compatibility (e.g. `cluster_images`, `image_id` vs `media_item_id`). Wholesale rename of `cluster_images` or dropping `image_id` requires migrations, RLS, and **all** RPC clients—schedule as its own project.

---

## Suggested execution order

1. Slice 1 (map TS) — largest clarity win for engineers working on the shell.
2. Slice 2 (CSS/HTML) — after Slice 1 when QA bandwidth exists.
3. Slice 3 (upload) — aliases then phased migration.
4. Slice 4 (DB) — only with an explicit migration plan and compat window.

---

## Verification aids (when executing)

- Ripgrep before/after scoped directories (`features/map`, `core/map`, `core/upload`, …).
- IDE **rename symbol** for TS; avoid blind multi-file string replace on unrelated `"photo"` matches.
