# Phase 3 — Component Migration

**Status:** Done

- [x] **Phase 3** — Component Migration (complete for planned Phase 3 dialog + shim scope — 2026-05-13; SCSS removal / primitive barrel teardown blocked pending callsite-by-callsite migration — see checklist)
  - [x] **spartan/ui packages installed** (baseline: `@spartan-ng/brain` + CVA stack; see Gap Analysis correction for full helm set)
  - [ ] **Atoms** (recommended first — maximum leverage for Phase 3)
    - [x] `button[uiButton*]` → `buttonVariants` / `hlmBtn` — **shim:** `UiButtonDirective` now applies `buttonVariants` from DOM attributes; marker directives retained; `.ui-button--loading` kept for SCSS spinner
    - [x] **`hlmBadge` / `badgeVariants`** — generic badge atom (no legacy `uiBadge`; `[uiStatusBadge]` / `[uiChip]` **shim** merges `badgeVariants` + legacy `.ui-status-badge*` / `.ui-chip*` SCSS hooks — 2026-05-13)
    - [x] `input[uiInputControl]` + modifiers → `inputVariants` / `hlmInput` — **shim:** `UiInputControlDirective` merges CVA + legacy `ui-input-control--*` SCSS hooks (size / loading / compact); marker directives for modifiers
    - [x] `label[uiFieldLabel]` / `[hlmLabel]` → `labelVariants` — **shim:** `UiFieldLabelDirective` merges CVA + `ui-field-label` SCSS hook; no `BrnLabel` in current `@spartan-ng/brain` pin
    - [x] `hlm-form-field` composition (wrap label+control+hint) — **molecule / layout**; `apps/web/src/app/shared/ui/form-field/`
    - [x] `select[uiSelectControl]` + modifiers → `selectVariants` / `hlmSelect` — **shim:** `UiSelectControlDirective` merges CVA + legacy `ui-select-control` / `ui-select-control--*` SCSS hooks; marker directives for modifiers (native `<select>` only; `BrnSelect` deferred)
    - [x] **`hlmSwitch` / `HLM_SWITCH_IMPORTS`** — local CVA (`switchVariants` + `switchThumbVariants`) in `apps/web/src/app/shared/ui/switch/`; **shim:** `UiToggleSwitchDirective` / `UiToggleRowDirective` merge CVA + legacy `.ui-toggle-*` hooks (`BrnSwitch` not in current `@spartan-ng/brain` pin) — 2026-05-13
    - [x] `[uiChip]` / `[uiStatusBadge]` → **`badgeVariants` shim** (semantic `info` / `success` / `warning` / `neutral` + `muted` default); retire `badge.scss` / `chip.scss` hooks deferred until callsites use `[hlmBadge]` only — 2026-05-13
    - [x] Skeleton CSS in `item-state-frame` → **`[hlmSkeleton]`** — `HLM_SKELETON_IMPORTS` in `apps/web/src/app/shared/ui/skeleton/` (2026-05-13)
    - [x] Loading spinner (`::after`) in buttons → **`hlm-spinner` atom** — `HLM_SPINNER_IMPORTS` in `apps/web/src/app/shared/ui/spinner/`; `.ui-button--loading::after` retained until `HlmButtonDirective` callsite migration (2026-05-13)
    - [x] Remove `styles/primitives/button.scss`, `field.scss`, `badge.scss`, `chip.scss`, `toggle.scss` — **done in Phase 5 (2026-05-14)**; see Phase 5 checklist
  - [ ] **Molecules**
    - [x] **`hlmCard` molecule** — `HLM_CARD_IMPORTS` in `apps/web/src/app/shared/ui/card/` (local CVA; no published `@spartan-ng/ui-card-helm` until Tailwind v4 peers); legacy `[uiCardShell]` / `.ui-card-shell` unchanged until callsite migration
    - [x] **`hlmSelect` molecule (native)** — `HLM_SELECT_IMPORTS` in `apps/web/src/app/shared/ui/select/` (local CVA; overlay `BrnSelect` deferred); legacy `select[uiSelectControl*]` unchanged at callsites
    - [x] **`app-dropdown-shell` (DropdownShell)** — local **`hlmMenuContent`** / `HlmMenuContentDirective` on host (`shared/ui/menu/`); manual `top`/`left` + document dismiss unchanged; **`hlmPopover` removed from shell** (popover CVA remains for `app-popover` and other surfaces). Rename to `app-popover-shell` + CDK Overlay deferred (2026-05-13)
    - [x] `app-dropdown-shell` + `app-standard-dropdown` → **`brn-menu`** — **blocked / shim (2026-05-13):** `@spartan-ng/brain` alpha.691 has **no** `./menu` export (`BrnMenu` unavailable); **`HLM_MENU_IMPORTS`** + `[hlmMenuItem]` / `[hlmMenuLabel]` / `[hlmMenuSeparator]` at callsites. Full `BrnMenu` + CDK anchor migration remains.
    - [x] **`app-popover` → `brn-popover`** — `BrnPopoverContent` + `hlmPopover` on panel; `BrnPopover` / `BrnPopoverTrigger` wiring deferred until callsites adopt the brain popover tree (2026-05-13)
    - [x] `app-segmented-switch` → **`BrnToggleGroup`** — **done (2026-05-13):** `apps/web/src/app/shared/ui/toggle-group/` (`HLM_TOGGLE_GROUP_IMPORTS`) + `BrnToggleGroupImports`; roving tabindex / manual keydown removed (brain handles keyboard nav)
    - [x] `button[uiTab]` tabs → `hlm-tabs` — **shim (2026-05-13):** `UiTabListDirective` / `UiTabDirective` merge CVA + `.ui-tab*` hooks; `app-group-tab-bar` fully on `BrnTabs` + `HLM_TABS_IMPORTS`
    - [x] Sort/filter/grouping dropdowns → **`brn-menu`** — **shim only (2026-05-13):** inherit `hlmMenuContent` via shell + `[hlmMenuItem]` on rows; **`app-grouping-dropdown`** keeps **`CdkDragDrop`** + `outsideCloseEnabled` / drag lifecycle unchanged
    - [x] Toast system → **partial (2026-05-13):** local **`hlmToast`** / `toastVariants` / `HLM_TOAST_IMPORTS` in `apps/web/src/app/shared/ui/toast/`; **`ToastService`** (`items()` signal API) + **`ss-toast-container`** unchanged. **`@spartan-ng/brain` has no `./toast` export**; **`sonner` / `ng-sonner` not installed** — Sonner imperative bridge deferred.
    - [x] Remove `styles/primitives/tab.scss`, `styles/patterns/toolbar.scss` — **done in Phase 5 (2026-05-14)**; `styles/patterns/dropdown.scss` removed earlier — see Phase 5 checklist
  - [ ] **Organisms**
    - [x] `app-confirm-dialog` → **`BrnDialog` + `HLM_DIALOG_IMPORTS`** (pilot: CDK dialog under `@spartan-ng/brain/dialog`; focus trap + scroll block via CDK defaults; `text-input-dialog` / `project-select-dialog` reuse the same pattern)
    - [x] `app-text-input-dialog` → **`BrnDialog`** (same stack as confirm-dialog)
    - [x] `app-project-select-dialog` → **`BrnDialog`** (same stack as confirm-dialog)
    - [x] `app-share-link-audience-dialog` → **`BrnDialog`**
    - [x] `app-projects-confirm-dialog` → **`BrnDialog`**
    - [x] `app-photo-lightbox` → **`BrnDialog`** (fullscreen)
    - [~] Upload panel → brn-sheet — **deferred** (dual-mode component conflicts with CDK overlay semantics; TODO(brn-sheet) in component; re-evaluate with map zone redesign)
    - [x] Remove `styles/patterns/form.scss` — **done in Phase 5 (2026-05-14)**; see Phase 5 checklist
    - [x] Remove `UI_PRIMITIVE_DIRECTIVES` barrel — **done in Phase 5 (2026-05-14)**; see Phase 5 checklist
