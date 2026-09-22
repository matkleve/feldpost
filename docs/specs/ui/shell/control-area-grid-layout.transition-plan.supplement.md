# Control-area grid — transition plan

> **Parent:** [control-area-grid-layout.md](./control-area-grid-layout.md)  
> **Prerequisite:** 🔴 open questions in [open questions supplement](./control-area-grid-layout.open-questions.supplement.md) answered.

## Principles

1. **No dual permanent geometry** — each control option has one owner surface after cutover ([change-completeness rule](../../../AGENTS.md)).
2. **Height chain preserved** — map fill regression is a hard gate ([`workspace-pane.md`](../workspace/workspace-pane.md) § Height chain).
3. **Spec before HTML** — ownership matrix + FSM per new shell component.
4. **Flagged rollout** — default until Phase 7 (unless OQ-20 chooses otherwise).

## Phase 0 — Spec lock and studies (no product code)

| Step | Output | Gate |
| --- | --- | --- |
| 0.1 | Owner decisions on 🔴 OQs recorded in decision log | You confirm |
| 0.2 | STUDY-007 … 011 filed under `docs/study/` | Studies indexed |
| 0.3 | Glossary patch for chosen terms | `docs/glossary.md` |
| 0.4 | Update [`layout.md`](../../../design/layout.md) desktop § to reference shell spec or mark deprecated paragraphs | Doc lint |
| 0.5 | Visual Behavior Contract matrices for `app-control-area-*` | Review |

**Exit:** Implementation checklist signed for Phase 1.

---

## Phase 1 — Grid scaffold (invisible parity)

**Goal:** Replace flex shell with CSS grid **without moving** user-visible chrome.

| Work | Files (expected) |
| --- | --- |
| Add `.shell-grid` to `AuthenticatedAppLayoutComponent` | `authenticated-app-layout.component.scss/html` |
| Define track tokens on layout `:host` (no `--shell-*` globals — per [shell-layout-tokens.md](../../../design/shell-layout-tokens.md)) | Same + token proposal in `layout-width-breakpoint-scale.md` |
| Mirror current widths: nav spacer + main + workspace | Temporary grid areas matching today's flex |
| Feature flag wraps grid vs legacy flex | env or `ShellLayoutService` |

**Verify:** `npm run verify`; Playwright map-shell + projects screenshots unchanged with flag off **and** on.

**Rollback:** Flag off → legacy flex path.

---

## Phase 2 — Left control area

**Goal:** Restructure nav into **top / bottom containers** with **44px options**.

| Work | Notes |
| --- | --- |
| Introduce `app-control-area-left` OR refactor `app-nav` innards | Prefer evolution of `app-nav` to limit route churn |
| Top container: logo + route options per OQ-04/05 | Fixed icon track; **~1 s hover horizontal label expansion** (OQ-02) |
| Bottom container: **Settings + Profile** as separate options (OQ-07) | Remove combined account row |
| **Remove theme row from nav** | Theme moves to map zone (OQ-15) |
| Deprecate frosted full-height sidebar + pinned collapse | [`sidebar.collapse.supplement.md`](../../component/workspace/sidebar.collapse.supplement.md) |
| Fix settings overlay `left` offset once track width stable | [`settings-overlay.md`](../settings-overlay/settings-overlay.md) |
| Reposition search bar to **top-left** on map | [`search-bar.md`](../search-bar/search-bar.md) (OQ-18) |

**Verify:** Nav e2e / vitest; settings overlay alignment LIVE CHECK; keyboard focus order top→bottom containers.

**User-visible:** Left strip matches baseline sketch; expand/collapse behavior per your OQ-02 answer.

---

## Phase 3 — Right control area scaffold

**Goal:** Mount containers + **gap**; wire **existing** actions only.

| Slot | Phase 3 scope |
| --- | --- |
| Notifications | Placeholder/disabled unless OQ-08 = B/C |
| Upload | Wire to existing `UploadShellUiService` / panel |
| Download | Wire to existing export entry if OQ-10 ≠ C |
| Shared items | Stub until STUDY-010 |
| Undo / History / Redo | Stub until STUDY-009 |
| Tips / Help | Stub until STUDY-011 |

| Work | Notes |
| --- | --- |
| New `app-control-area-right` in layout template | Sibling of nav + main |
| Implement inter-container gap per OQ-17 | Must be visually distinct from icon spacing |
| Move `app-upload-shell` anchor from `__main` absolute to right container | Resolves overlap with workspace per [`upload-shell.md`](../../component/upload/upload-shell.md) |

**Verify:** Upload panel open/close; pane open + upload does not clip; z-index ladder documented.

---

## Phase 4 — Workspace pane and canvas relationship

**Goal:** Implement OQ-06 decision; consolidate upload entry (OQ-09).

| If OQ-06 = A (canvas split) | Migrate drag divider + pane into grid center area; control options toggle pane |
| If OQ-06 = C (fourth track) | Add workspace track; update golden-ratio width logic to grid column |
| If OQ-06 = D (dock to right area) | Pane attaches to inner edge of right control column |

| Work | Notes |
| --- | --- |
| Remove duplicate upload tab if OQ-09 = A | Grep `data-workspace-upload-tab`, embedded panel |
| Update [`upload-panel-system.md`](../upload/upload-panel-system.md) | Single orchestration diagram |
| Reconcile workspace width tokens | [`layout-width-breakpoint-scale.md`](../../../design/design-system/layout-width-breakpoint-scale.md) Target A |

**Verify:** STUDY-005/006 unaffected upload pipeline tests; share-link restore; media detail FSM LIVE CHECK.

---

## Phase 5 — Page routes and `app-page-grid`

**Goal:** Ensure non-map routes respect new shell tracks.

| Route | Action |
| --- | --- |
| `/media`, `/projects` | Confirm `app-page-grid` padding-inline-start accounts for **control track** not legacy `4.5rem` nav offset ([`page-rail-grid.md`](../../../design/page-rail-grid.md)) |
| `/colleagues`, `/organization` | Same clearance; chat full-height flush mode |
| `/settings/**` | Overlay positioning vs left track |

**Verify:** Page-grid alignment regression (center column still `52rem`).

---

## Phase 6 — Tablet breakpoint

**Goal:** Implement OQ-16 tablet row.

**Verify:** Breakpoint audit ([`breakpoint-audit-wave2.md`](../../../design/design-system/breakpoint-audit-wave2.md)); touch targets ≥44px on tablet.

---

## Phase 7 — Mobile (if in scope)

**Deferred unless OQ-16 locks mobile in v1.**

Options documented in open questions — likely preserve bottom bar or merge control areas.

---

## Phase 8 — Legacy removal

| Remove | After |
| --- | --- |
| Flex-only shell path + feature flag | 2 weeks stable on flag default-on |
| Absolute `app-upload-shell` positioning in `__main` | Phase 3 verified |
| Obsolete sidebar width transitions (if OQ-02 = A) | Phase 2 verified |
| Dead spec paragraphs in `layout.md` / glossary “Sidebar Pill” if obsolete | Glossary sweep |

**Verify:** `grep` legacy selectors; `npm run verify` green; change-completeness grep for removed concepts.

---

## Testing strategy

| Layer | Tool |
| --- | --- |
| Shell grid geometry | Playwright phase-10 matrix + new `shell-grid` snapshot spec |
| Hit targets | axe or custom vitest DOM assertions ≥44px |
| Upload + pane | Existing map-shell specs + LIVE CHECK block |
| Regression | Theme matrix ([`theme-regression-matrix.md`](../../../design/components/theme-regression-matrix.md)) |

---

## Risk register

| Risk | Mitigation |
| --- | --- |
| Height chain break (map blank) | Phase 1 parity screenshots; fix weakest link only |
| Settings overlay misalignment | Update calc in same PR as track width |
| Dual upload paths | Phase 4 grep gate |
| Z-index wars (map floats vs control areas) | Single ladder in component spec |
| Scope creep (notifications, undo) | Stubs until studies accepted |

---

## Suggested PR sequence

1. `docs: control-area grid shell spec` (this change)
2. `feat(shell): grid scaffold behind flag`
3. `feat(nav): left control containers`
4. `feat(shell): right control area + upload re-anchor`
5. `feat(workspace): pane placement per OQ-06`
6. `chore(shell): remove legacy flex layout`

Each PR: `npm run verify` + targeted screenshots.
