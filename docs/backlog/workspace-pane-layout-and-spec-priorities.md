# Workspace pane layout + spec priorities (updated)

**Status:** Planning — backlog, not a normative spec. When executing, update `docs/specs/` contracts in the same change set as behavior.

**Related:** [`media-photo-symbol-rename-roadmap.md`](./media-photo-symbol-rename-roadmap.md) (identifier renames; separate from layout hoist).

**Spec authoring plan (execute in `docs/specs/`):** [`workspace-pane-layout-spec-implementation-plan.md`](./workspace-pane-layout-spec-implementation-plan.md) — phased checklist, per-file tasks, gates, and ordering.

---

## Target architecture (product + engineering)

- **One `WorkspacePane` (same component tree)** everywhere it is shown: consistent chrome, split behavior, drag divider, and state wiring.
- **Renders from the active experience**, not only from map-specific code: each **page** (or a **single authenticated layout** parent) composes the **split** — main content + optional pane — when the pane is open.
- **Split is owned at layout level** (page or shared `AppShell`/auth layout): map zone / media list / projects list shares width with the pane; not “map shell happens to include a pane.”

**Current implementation:** `app-authenticated-app-layout` hosts **`app-workspace-pane`** + split for **`/`**, **`/map`**, **`/media`**, **`/projects`**, and **`/settings/**`**; **`MapShellComponent`** is map-only inside the layout main column. `WorkspacePaneObserverAdapter` coordinates selected-items context per route.

**Direction:** Hoist the pane (and split chrome) to a **shared authenticated layout** *or* repeat the same split + `WorkspacePane` composition on each route — prefer **one layout** to avoid drift. Then align specs to that as the **canonical** story; keep a short “migration / interim” note only if needed.

---

## Executive summary (re-prioritized)

1. **P0 — Implementation:** Introduce a **route-level or auth-layout host** that renders the **same** workspace pane + split on `/`, `/map`, `/media`, `/projects`, and settings (or document an explicit subset), so DOM matches glossary/spec intent (“pane can appear on any page”).
2. **P0 — Specs:** Rewrite **workspace-pane**, **map-page**, **media-page**, **projects-page**, and **drag-divider** ownership so the **layout host** (not `MapShellComponent` alone) owns the split; document **`photoPanelOpen`** (or renamed signal) as **implementation symbol** vs product term **Workspace Pane** until rename backlog is executed.
3. **P0 — Specs:** Retire normative **`PhotoLoadService` / `photoLoad` / `PHOTO_*`** language in **media-detail-media-viewer** (+ supplement) and **media-download-service** hierarchy/ledger in favor of **`MediaDownloadService`** + adapters; align file map with files that exist.
4. **P1 — Specs:** **address-resolver**: `media_items` vs legacy `images` in prose and diagrams; media count wording.
5. **P1 — Specs:** **signed-url-cache.adapter** and upload specs: footnote **`imageReplaced$` / `imageId`** = media semantics; pointer to symbol-rename roadmap for RPC/streams.
6. **P2:** Terminology polish (**upload-manager** “photo-only” dedup → media-scoped wording); **`rawImages`** footnote (`WorkspaceImage` alias of `WorkspaceMedia`).
7. **Naming cleanup** (optional, separate PRs): `photoPanelOpen` → `workspacePaneOpen` etc. per **media-photo-symbol-rename-roadmap** after layout is stable.

---

## Priority table (spec + engineering)

| Priority | Area | Spec / code focus | Action |
|----------|------|-------------------|--------|
| P0 | Layout | `docs/specs/ui/workspace/workspace-pane.md`, `page/map-page.md`, `page/media-page.md`, `page/projects-page.md`, `component/workspace/drag-divider.md` | Define **canonical host**: shared auth layout or per-page composition; **split** and pane width owned there. Remove or qualify “AppShell-only” / “MapShell-only” as **interim** once code moves. |
| P0 | Layout | `apps/web` routing + templates | Implement **hoisted** `WorkspacePane` + split (layout component wrapping `router-outlet` or equivalent); keep **one** pane implementation. |
| P0 | Signals / naming | Same specs + `map-shell.state.ts` / template | Until rename: tables use **`photoPanelOpen`** with footnote **Workspace Pane**, or dual column **prose / symbol**. |
| P0 | Media delivery | `docs/specs/ui/media-detail/media-detail-media-viewer.md`, `.progressive-loading.supplement.md` | Replace **`PhotoLoadService`** / **`photoLoad`** / **`PHOTO_*`** with **`MediaDownloadService`** + **`MEDIA_*`**; add **Terminology (symbols)** for viewer inputs (`hasPhoto`, `imageReady`, streams). |
| P0 | Media delivery | `docs/specs/service/media-download-service/media-download-service.md` (+ data supplement, signed-url-cache adapter) | Hierarchy + file map + migration ledger match **adapters + facade** only; remove dead **`photo-load.service.ts`** / **`PhotoLoadService` wrapper** claims. |
| P1 | DB / resolver | `docs/specs/service/location-resolver/address-resolver.md` | **`media_items`** in normative paths; legacy **`images`** footnote if any RPC still references it. |
| P1 | Upload streams | `docs/specs/ui/media-detail/media-detail-actions.md`, `service/media-upload-service/*.md` | Quote **`imageReplaced$`** etc.; prose = **media item**; link symbol-rename roadmap. |
| P2 | Copy | `docs/specs/service/media-upload-service/upload-manager.md` | “Photo-only” → **media-type / hash** scoped wording where accurate. |
| P2 | Workspace view | `docs/specs/component/workspace/active-selection-view.md` | Footnote **`rawImages`** / **`WorkspaceImage`**. |

---

## Appendix: specs that need a **Terminology / implementation symbols** subsection

After layout work, ensure these explicitly separate **product language** from **symbols**:

- `docs/specs/ui/workspace/workspace-pane.md` (host + `photoPanelOpen` / future `workspacePaneOpen`)
- `docs/specs/page/media-page.md`, `projects-page.md`, `map-page.md`
- `docs/specs/ui/media-detail/media-detail-media-viewer.md` (+ progressive supplement)
- `docs/specs/service/media-download-service/media-download-service.md`
- `docs/specs/service/location-resolver/address-resolver.md`
- `docs/specs/service/media-upload-service/upload-manager.md` (and pipeline child specs)

**Template:** `docs/specs/ui/media-marker/media-marker.md` § Terminology.

---

## Human decisions / other backlogs

- **RPC / CSS / TS renames** (`cluster_images`, `.map-photo-marker*`, `imageReplaced$`): `docs/backlog/media-photo-symbol-rename-roadmap.md` — do not assume renames in normative spec prose until shipped.
- **Layout host choice:** single **auth layout** vs **per-page** duplicate split — pick one to avoid two pane behaviors; default recommendation **auth layout + outlet**.

---

## Verification (when implementing layout)

- `ng build`, map + workspace smoke, then **`/media`** and **`/projects`** with pane open/closed and drag resize.
- Cold navigation: `/media` → `/map` (or reverse) with pane state if still coordinated via observer.

---

## Supersedes

This document **replaces** the informal “prioritized inventory” from the 2026-04 workspace-pane / spec-drift chat: priorities are now ordered **implementation (universal pane + split) first**, then **spec alignment** to that architecture, then **media-download naming** cleanup.
