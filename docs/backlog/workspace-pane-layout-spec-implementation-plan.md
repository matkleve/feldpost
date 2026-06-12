# Plan: implement workspace-pane layout priorities in spec files

**Scope:** Updates to **`docs/specs/**/*.md` only** (normative contracts). Application code is out of scope here; align specs with the **target architecture** in [`workspace-pane-layout-and-spec-priorities.md`](./workspace-pane-layout-and-spec-priorities.md) and record **interim vs canonical** where code still lags.

**Governance:** Follow root `AGENTS.md` (spec before implementation for new behavior; feedback-to-spec sync). After substantive edits, run `node scripts/lint-specs.mjs`. If any spec gains or changes a `## Settings` section, sync `docs/settings-registry.md` per project rules.

**Template for “Terminology (symbols and product language)”:** mirror structure and table style from [`docs/specs/ui/media-marker/media-marker.md`](../specs/ui/media-marker/media-marker.md) § Terminology (opening paragraph + symbol table + prose rules).

---

## Spec updates completed (2026-04-28)

Normative spec/doc alignment for workspace layout, media delivery naming, and cross-links (this batch and prior passes) is **done in docs**. **Code:** authenticated layout hoist (`app-authenticated-app-layout` + `app.routes.ts` children) **landed 2026-04-28**; `photoPanelOpen` → `workspacePaneOpen` rename remains per [`media-photo-symbol-rename-roadmap.md`](./media-photo-symbol-rename-roadmap.md).

| Phase (this plan) | Spec / doc status |
| --- | --- |
| 0 — Preconditions | Recorded in `workspace-pane.md` (Layout host, Interim implementation, Terminology). |
| 1 — P0 layout / split | `workspace-pane`, `drag-divider`, `map-page`, `media-page`, `projects-page`, `project-details-view` — updated. |
| 2 — P0 media delivery | `media-detail-media-viewer` (+ progressive supplement), `media-download-service/*` — updated. |
| 3 — P1 address + upload footnotes | `address-resolver`, upload pipeline specs, related — updated. |
| 4 — P2 polish | `upload-manager`, `active-selection-view` — updated as listed in plan. |
| 5 — Cross-cutting | `workspace-view-system` (service vs UI stub), `media-marker`, `docs/specs/README` backlog links — updated. |

---

## 0 — Preconditions (one-time)

| Step | Action |
| --- | --- |
| 0.1 | **Record layout decision** in `docs/specs/ui/workspace/workspace-pane.md` (new short § **Layout host**): canonical = **shared authenticated layout** wrapping `router-outlet` *or* per-page split (pick one; backlog recommends **single auth layout**). This unlocks consistent wording in child specs. |
| 0.2 | Read [`docs/glossary.md`](../glossary.md) for **Workspace Pane**, **media item**, **MediaDownloadService**; avoid contradicting glossary without updating it in the same session. |
| 0.3 | Keep RPC/stream/CSS symbol renames **out of normative prose** unless shipped; link [`media-photo-symbol-rename-roadmap.md`](./media-photo-symbol-rename-roadmap.md) from symbol tables. |

---

## Phase 1 — P0 layout and split ownership (five specs)

Execute in order: parent pane contract first, then consumers that reference it.

### 1.1 `docs/specs/ui/workspace/workspace-pane.md`

| Task | Detail |
| --- | --- |
| 1.1.1 | Replace or narrow **“Parent: AppShellComponent”** / **“rendered by App Shell”** with **layout host** language: named placeholder (e.g. `AuthenticatedAppLayoutComponent` or “auth layout shell”) as **canonical** parent of the **split** (main + pane). |
| 1.1.2 | Add **§ Terminology (symbols and product language)** at top (after title block): **`photoPanelOpen`** (or post-rename `workspacePaneOpen`) = Workspace Pane visibility **until** symbol-rename backlog; **`detailMediaId`**, **`activeTab`**, observer ports as needed. |
| 1.1.3 | Fix **Actions** table **Triggers** column: use **`photoPanelOpen.set(true/false)`** (or dual column **Product / Symbol**) — align with current `MapShell` until code hoist lands; add footnote “post-hoist: signal may live on layout host.” |
| 1.1.4 | **Where It Lives:** state **pages** that host the split (`/`, `/map`, `/media`, `/projects`, `/settings/**` or explicit subset); add **§ Interim implementation** (optional one paragraph): today pane DOM mounts under `MapShellComponent`; target is layout host — remove when code matches. |
| 1.1.5 | **Component hierarchy** block: show **Layout host** → `WorkspacePaneShell` / `WorkspacePane` + `router-outlet` for route content (if auth layout is canonical). |
| 1.1.6 | Cross-links: ensure `map-page`, `media-page`, `projects-page`, `drag-divider` link back here for split ownership. |

### 1.2 `docs/specs/component/workspace/drag-divider.md`

| Task | Detail |
| --- | --- |
| 1.2.1 | **Parent / Appears when:** parent = **layout host** (same name as workspace-pane §1.1.1), not only `MapShellComponent`. |
| 1.2.2 | Replace **`workspacePaneOpen`** with **`photoPanelOpen`** in wiring **or** add symbol table: visibility flag owned by **map shell today / layout host after hoist**. |
| 1.2.3 | **Wiring** §: “Imported between Map Zone and Workspace Pane **by the layout host**” (map route is one consumer). |

### 1.3 `docs/specs/page/map-page.md`

| Task | Detail |
| --- | --- |
| 1.3.1 | Clarify **Map Shell** role: **map + map-adjacent chrome** on routes that use `MapShellComponent` (`/`, `/map`, settings… per `app.routes.ts`); **not** the sole long-term owner of **global** workspace split if auth layout is canonical. |
| 1.3.2 | **State** table: **`workspacePaneOpen`** → **`photoPanelOpen`** + terminology footnote **or** dual column. |
| 1.3.3 | **Wiring:** close/open pane targets **layout host** or interim `MapShell`; link `workspace-pane.md` § Layout host. |

### 1.4 `docs/specs/page/media-page.md`

| Task | Detail |
| --- | --- |
| 1.4.1 | Replace diagram that shows **WorkspacePane** only as sibling under AppShell next to `MediaComponent` with **canonical**: **layout host** → split → `[router-outlet → MediaComponent]` + **WorkspacePane** (same component as map). |
| 1.4.2 | **Where It Lives / Actions:** pane visibility and tab persistence per **layout host** + `WorkspacePaneObserverAdapter` (document observer as coordination, not DOM substitute). |
| 1.4.3 | Add **§ Terminology** if `setDetailImageId` / legacy **image** symbols appear — map to **media id** in prose. |

### 1.5 `docs/specs/page/projects-page.md`

| Task | Detail |
| --- | --- |
| 1.5.1 | Reconcile **state tables** (`workspacePaneOpen`, etc.) with **projects** UI: either define **project workspace chrome** signals explicitly **or** point to **layout host** pane visibility (do not imply a boolean on `ProjectsPageComponent` unless it exists). |
| 1.5.2 | Cross-link `workspace-pane.md` and `project-details-view.md` for pane vs in-page project UI. |

### 1.6 `docs/specs/component/project/project-details-view.md`

| Task | Detail |
| --- | --- |
| 1.6.1 | Same as projects-page: **`workspacePaneOpen`** / layout host / **interim** note if projects route has no pane until hoist. |

**Phase 1 gate:** `node scripts/lint-specs.mjs`; spot-check internal links from `workspace-view-system.md` / `workspace-view-system.deep-dive.md` to `workspace-pane.md` for consistency (update diagram captions if they say only MapShell).

---

## Phase 2 — P0 media delivery (facade + viewer)

### 2.1 `docs/specs/ui/media-detail/media-detail-media-viewer.md`

| Task | Detail |
| --- | --- |
| 2.1.1 | Global replace in **normative** sections: **`PhotoLoadService`** → **`MediaDownloadService`** (and where appropriate **SignedUrlCache** behavior described as “via facade / adapter”). |
| 2.1.2 | **`photoLoad`** → **`mediaDownload`** (or “orchestrator inject name”) consistent with component code. |
| 2.1.3 | **`PHOTO_NO_PHOTO_ICON`** / **`PHOTO_*`** → **`MEDIA_NO_MEDIA_ICON`** / **`MEDIA_*`** per `media-download.service.ts` exports. |
| 2.1.4 | **`PhotoLoadState`** → **`MediaLoadState`** (or document alias if types merged). |
| 2.1.5 | Add **§ Terminology (symbols):** `hasPhoto`, `imageReady`, `isImageLoading`, `imageReplaced$` — prose **media**; symbols quoted; link rename backlog. |
| 2.1.6 | FSM / acceptance criteria: **UploadManagerService** still emits **`imageReplaced$`**; describe **facade** `setLocalUrl` / `revokeLocalUrl` on **`MediaDownloadService`**, not `photoLoad`. |

### 2.2 `docs/specs/ui/media-detail/media-detail-media-viewer.progressive-loading.supplement.md`

| Task | Detail |
| --- | --- |
| 2.2.1 | Same renames as 2.1; update all Mermaid **participant** names (`PhotoLoad` → `MediaDownload` / `SignedUrlCache`). |
| 2.2.2 | Ensure tier language matches [`media-download-service.md`](../specs/service/media-download-service/media-download-service.md) (marker / thumb / full as applicable). |

### 2.3 `docs/specs/service/media-download-service/media-download-service.md`

| Task | Detail |
| --- | --- |
| 2.3.1 | **Component hierarchy** tree: remove **`PhotoLoadService`** / **`MediaOrchestratorService`** as “existing” leaves; show **`SignedUrlCacheAdapter`**, **`TierResolverAdapter`**, **`EdgeExportOrchestratorAdapter`** behind **`MediaDownloadService`**. |
| 2.3.2 | **File map** and **Phase 3 migration ledger:** remove or mark **RETIRED** rows for non-existent `photo-load.service.ts`, `photo-load.model.ts`; align “Done” rows with `apps/web/src/app/core/media-download/`. |
| 2.3.3 | **Refactoring instructions:** delete or archive steps that say **`PhotoLoadService` delegates** to adapter if no wrapper exists; replace with “facade only.” |
| 2.3.4 | Add **§ Terminology** if not present: streams / legacy names in upload payloads. |

### 2.4 `docs/specs/service/media-download-service/media-download-service.data-requirements.supplement.md`

| Task | Detail |
| --- | --- |
| 2.4.1 | Sequence diagram: **`PhotoLoadService`** participant → **`SignedUrlCacheAdapter`** (or **`MediaDownloadService`** facade). |

### 2.5 `docs/specs/service/media-download-service/adapters/signed-url-cache.adapter.md`

| Task | Detail |
| --- | --- |
| 2.5.1 | Consumer text: **no** “`PhotoLoadService` remains bridge” unless code restores it; state **facade + adapter** as contract. |

**Phase 2 gate:** `node scripts/lint-specs.mjs`; grep `docs/specs` for `PhotoLoadService` / `photoLoad` / `PHOTO_NO_PHOTO` after edits (should be zero or confined to “historical” archive notes if any remain).

---

## Phase 3 — P1 address resolver + upload stream footnotes

### 3.1 `docs/specs/service/location-resolver/address-resolver.md`

| Task | Detail |
| --- | --- |
| 3.1.1 | Normative DB references: **`media_items`** (address_label, counts); legacy **`images`** in a **footnote** or “migration” if any materialized view/RPC still reads `images`. |
| 3.1.2 | Prose / examples: “photos here” → **media items** / **records**; keep **quoted** UI strings only if they match i18n keys verbatim. |
| 3.1.3 | Diagrams / SQL snippets: table name **`media_items`** where the app queries today. |

### 3.2 `docs/specs/ui/media-detail/media-detail-actions.md`

| Task | Detail |
| --- | --- |
| 3.2.1 | Small **Terminology** block or table row: **`imageReplaced$` / `imageAttached$`** = **media** lifecycle events; ids = **media item** ids; link rename backlog. |

### 3.3 `docs/specs/service/media-upload-service/upload-manager-pipeline.md`

| Task | Detail |
| --- | --- |
| 3.3.1 | Any **`imageId` / `imageReplaced$`** in tables: add one-line **media semantics** + backlog link (same pattern as media-marker). |

### 3.4 `docs/specs/service/media-upload-service/upload-manager-pipeline.data.md`

| Task | Detail |
| --- | --- |
| 3.4.1 | Same as 3.3 for event/payload field names. |

### 3.5 `docs/specs/service/media-upload-service/README.md` (if it duplicates wiring)

| Task | Detail |
| --- | --- |
| 3.5.1 | Align links/wording with pipeline specs after edits. |

---

## Phase 4 — P2 polish

### 4.1 `docs/specs/service/media-upload-service/upload-manager.md`

| Task | Detail |
| --- | --- |
| 4.1.1 | “**Photo-only** deduplication” → accurate **media-type / hash** scoped wording (camera still vs document, etc.). |

### 4.2 `docs/specs/component/workspace/active-selection-view.md`

| Task | Detail |
| --- | --- |
| 4.2.1 | Footnote near **`rawImages`**: **`WorkspaceImage`** is a type alias of **`WorkspaceMedia`** (`workspace-view.types.ts`); prose prefers **workspace media list**. |

**Phase 4 gate:** `node scripts/lint-specs.mjs`.

---

## Phase 5 — Cross-cutting spec hygiene

| Task | Detail |
| --- | --- |
| 5.1 | **`docs/specs/service/workspace-view/workspace-view-system.md`** and **`workspace-view-system.deep-dive.md`:** align “Workspace Pane visible” steps with **layout host** + **`photoPanelOpen`** symbol table (may already be partially correct). |
| 5.2 | **`docs/specs/ui/media-marker/media-marker.md`:** update **`photoPanelOpen`** row if text still says “map route only” — clarify **layout host (interim: MapShell on map/settings routes)**. |
| 5.3 | **`docs/specs/README.md`:** if useful, one index bullet under workspace/media pointing to **layout priorities** backlog (optional; avoid duplicating normative body). |

---

## Verification checklist (specs only)

- [ ] `node scripts/lint-specs.mjs` passes after each phase (or after each large file).
- [ ] No contradictory “pane parent is AppShell only” vs “layout host” without **Interim** / **Target** labels.
- [ ] `grep -r "PhotoLoadService\\|photoLoad\\|PHOTO_NO_PHOTO" docs/specs` — only allowed in archived paths or explicit historical notes (prefer zero in active specs).
- [ ] `grep "workspacePaneOpen" docs/specs` — either removed, aliased in terminology tables, or matched to shipped code.
- [ ] Glossary updated if any **canonical** term definitions changed (`docs/glossary.md`).

---

## Order summary (execution sequence)

1. **Phase 0** — layout host decision paragraph in `workspace-pane.md`.  
2. **Phase 1** — `workspace-pane.md` → `drag-divider.md` → `map-page.md` → `media-page.md` → `projects-page.md` → `project-details-view.md`.  
3. **Phase 2** — media-detail viewer (+ supplement) → media-download parent → data supplement → signed-url-cache adapter.  
4. **Phase 3** — address-resolver → media-detail-actions → upload pipeline specs (+ README if needed).  
5. **Phase 4** — upload-manager.md → active-selection-view.md.  
6. **Phase 5** — workspace-view deep specs + media-marker tweak + optional specs README.

---

## Out of scope (this plan document)

- Angular routing/refactor (`app.routes.ts`, new layout component): tracked under implementation row in [`workspace-pane-layout-and-spec-priorities.md`](./workspace-pane-layout-and-spec-priorities.md).
- Renaming **`photoPanelOpen`** / **`.map-photo-marker*`** in code: [`media-photo-symbol-rename-roadmap.md`](./media-photo-symbol-rename-roadmap.md).

When **code** implements the hoist, remove **§ Interim implementation** (or shrink to changelog) in `workspace-pane.md` in the **same** PR as the layout change.
