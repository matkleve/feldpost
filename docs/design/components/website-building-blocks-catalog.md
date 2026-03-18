# Website Building Blocks Catalog

Status: Draft v1 (2026-03-17)
Scope: Feldpost UI system baseline

## Purpose

A complete checklist of website UI building blocks, grouped by layer, used as a planning and standardization base.

Use this file to:

- decide what should be standardized first
- track what already exists vs what is missing
- avoid building one-off UI patterns

## Legend

- `present`: already implemented and reusable
- `partial`: exists but duplicated/inconsistent
- `missing`: not yet defined as a reusable block

## 1. Foundation Layer

1. Design tokens (color, spacing, radius, elevation, z-index) — `present`
2. Typography scale and text roles (title/body/caption/meta) — `partial`
3. Motion tokens and interaction timing presets — `partial`
4. Focus-ring primitives — `partial`
5. Border policy and stroke hierarchy — `present`
6. State color semantics (success/warning/danger/info) — `present`

## 2. Layout & Structure Layer

1. App shell (sidebar/top area/content) — `present`
2. Page container primitives (inset/max-width/content rail) — `partial`
3. Section container/card primitives — `partial`
4. Split-pane / resizable zones — `present`
5. Sticky regions (toolbars/headers/footers) — `partial`
6. Empty-state layout primitive — `present`

## 3. Navigation Layer

1. Main nav item pattern — `present`
2. Secondary section list pattern — `partial`
3. Tabs / segmented navigation — `partial`
4. Breadcrumbs — `missing`
5. Command palette / quick switcher — `partial`

## 4. Action & Input Layer

1. Button family (primary/secondary/ghost/danger/icon) — `partial`
2. Toolbar action buttons — `present`
3. Text input field primitive — `partial`
4. Select/dropdown trigger primitive — `partial`
5. Segmented control primitive — `partial`
6. Toggle/switch primitive — `partial`
7. Slider/range primitive — `partial`
8. Checkbox/radio primitive — `partial`
9. Chip/tag primitive (actionable + passive) — `partial`
10. Inline edit pattern — `partial`

## 5. Menu, Overlay & Popover Layer

1. Menu surface primitive — `present`
2. Dropdown shell/anchoring primitive — `present`
3. Context menu pattern — `present`
4. Suggestion list/autocomplete surface — `partial`
5. Popover panel primitive — `partial`
6. Dialog/modal shell — `present`
7. Confirm dialog pattern — `present`
8. Input dialog pattern — `present`
9. Lightbox/media overlay — `present`

## 6. Data Display Layer

1. List row item primitive — `partial`
2. Grid card primitive — `partial`
3. Group header / collapsible section row — `present`
4. Key-value metadata row — `partial`
5. Status badge/pill primitive — `partial`
6. Table primitive — `missing`
7. Stats/summary tile primitive — `missing`

## 7. Feedback & System State Layer

1. Toast pattern — `present`
2. Inline validation state pattern — `partial`
3. Loading skeleton pattern — `partial`
4. Busy/disabled interaction state pattern — `partial`
5. Error and retry block pattern — `partial`
6. Progress indicators (linear/circular/queue) — `present`

## 8. Domain-Specific Feldpost Layer

1. Map marker UI primitive set — `present`
2. Map context actions menu pattern — `present`
3. Workspace pane action pattern — `partial`
4. Upload queue item pattern — `present`
5. Project assignment selector pattern — `partial`
6. Settings section card pattern — `partial`

## 9. Cross-Cutting Quality Layer

1. Accessibility baseline per primitive (ARIA, keyboard, target size) — `partial`
2. Mobile behavior rules per primitive — `partial`
3. Dark-theme behavior per primitive — `partial`
4. i18n-safe text/overflow behavior per primitive — `partial`
5. Visual regression checks for critical primitives — `missing`

## Recommended Standardization Order

1. Button family + input/select/toggle/segmented primitives
2. Suggestion/autocomplete and popover surfaces
3. List/card/metadata row display primitives
4. Settings section card and form composition primitives
5. Accessibility + visual-regression checklist per primitive

## Professional Rollout Plan

This overhaul should be executed as a system migration, not as isolated component polish.

### Phase Status Snapshot (Primitives-Focused)

1. Phase 1: Freeze the Design-System Contract — `95%`
2. Phase 2: Harden the Primitive Set — `82%`
3. Phase 3: Migrate High-Visibility Surfaces — `76%`
4. Phase 4: Migrate Composition Surfaces — `52%`
5. Phase 5: Verify, Promote, and Enforce — `40%`

Status date: 2026-03-18

### Phase 1: Freeze the Design-System Contract

Progress: `95%`

Goal: prevent more drift while migrations continue.

Deliverables:

1. Treat `docs/design.md` as orchestrator only.
2. Treat `docs/design/tokens.md` as the only raw token value source.
3. Treat `docs/design/token-layers.md` as the only layer/alias/theming architecture source.
4. Treat `docs/design/components/action-interaction-kernel.md` as the only interaction-policy source.
5. Keep `apps/web/src/styles.scss` as the runtime implementation of Layer A/B/C aliases.

Exit criteria:

1. New UI work does not add competing policy or token definitions in feature docs.
2. New shared primitives consume Layer C aliases first.
3. Feature SCSS does not define duplicate hover/focus/border systems where a base primitive exists.

Done:

1. Canonical ownership split is established across design docs.
2. `token-layers.md` is active as Layer A/B/C reference.
3. Interaction policy vs implementation profile is separated.

Remaining:

1. Continue enforcing ownership discipline on every new doc change.

### Phase 2: Harden the Primitive Set

Progress: `82%`

Goal: make the shared primitives good enough that features can adopt them without feature-local redesign.

Target primitives:

1. Button family: primary, secondary, ghost, icon, danger.
2. Segmented switch.
3. Menu surface and dropdown shell.
4. Select/input/field row primitives.
5. Toggle row and switch.
6. Dialog shell.
7. Section/card shell.

Exit criteria:

1. Each primitive has one canonical implementation path.
2. Ghost buttons keep the agreed light gray default border.
3. Border policy remains action-first: passive containers do not regain stacked borders.
4. Primitive states are defined centrally for default, hover, active, focus, disabled.

Done:

1. Shared segmented switch exists and is in use.
2. Shared menu surface/dropdown shell is broadly adopted.
3. Button family standardization has started and ghost-border rule is applied.
4. Segmented primitive now supports detached inactive option + smooth state transitions + reduced-motion fallback.
5. Map-type switch now consumes the same shared segmented primitive (legacy local switch styles removed).

Remaining:

1. Finish button-family adoption in remaining settings/dialog consumers.
2. Complete canonical field/select/toggle/dialog-shell usage across all major flows.

### Phase 3: Migrate High-Visibility Surfaces

Progress: `76%`

Goal: standardize the UI that users see most often.

Priority order:

1. Toolbar triggers and option menus.
2. Context menus and detail menus.
3. Segmented controls and toggle rows.
4. Suggestion/autocomplete panels.
5. Dialogs and settings surfaces.

Exit criteria:

1. Feature templates use shared primitives instead of local button/menu/switch structures where possible.
2. Remaining exceptions are documented explicitly in this file.
3. No functional regressions in keyboard behavior, outputs, focus return, or reactive flows.

Done:

1. Toolbar dropdown family and major option-menu surfaces are standardized.
2. Map-type switch and projects status filter moved toward shared segmented primitives.
3. Context-menu structure parity improved across map/detail areas.
4. `/projects` segmented status filter no longer shifts layout when archived state becomes inactive.
5. `/projects` labels use a robust fallback helper (`text(key, fallback)`) to avoid empty/vanishing strings.
6. Map and Projects now share one segmented control primitive with aligned behavior.

Remaining:

1. Finish `/projects` page consistency pass (labels, spacing, action-row parity).
2. Close remaining menu edge cases with strict primitive structure.
3. Verify segmented primitive parity across all contexts in regression matrix.

### Phase 4: Migrate Composition Surfaces

Progress: `52%`

Goal: move larger feature flows onto the same primitives so themes and future redesigns scale.

Priority areas:

1. Settings overlay and its subsections.
2. Account/auth surfaces.
3. Project filters and management flows.
4. Workspace/detail inline editors and metadata rows.

Exit criteria:

1. Feature SCSS is mostly layout and composition, not state styling.
2. Shared section/field/action primitives are reused across feature clusters.
3. Theme changes primarily require alias updates, not component rewrites.

Done:

1. Settings/account/invite surfaces are partially migrated to shared section/field/action primitives.
2. Local style duplication has been reduced in several high-use flows.

Remaining:

1. Continue migrating low-readiness composition surfaces.
2. Remove remaining feature-local state styling that duplicates base primitives.

### Phase 5: Verify, Promote, and Enforce

Progress: `40%`

Goal: turn the overhaul into a stable operating model.

Deliverables:

1. Update `docs/design/components/theme-regression-matrix.md` with real `OK` or `BUG(...)` statuses.
2. Keep accessibility and keyboard behavior tied to primitive contracts.
3. Keep i18n pipeline updates bundled with any new user-facing text.
4. Use the catalog as the migration backlog and readiness tracker.

Exit criteria:

1. Critical primitives have verified light, dark, and sandstone behavior.
2. Keyboard/focus checks pass or have explicit tracked bugs.
3. New feature work extends the shared system instead of bypassing it.

Done:

1. Regression matrix exists and is actively tracked.
2. Initial focused test infrastructure blockers were reduced.
3. Segmented-switch motion resource and source rationale were documented.

Remaining:

1. Convert `TODO`/`unverified` rows to evidence-based `OK`/`BUG(...)` outcomes.
2. Complete manual light/dark/sandstone smoke checks for critical primitives.
3. Promote verification checks into default delivery flow.

## Working Rules During Migration

1. Migrate by primitive family, not by random page order.
2. Prefer central alias or primitive fixes over local feature overrides.
3. Accept documented exceptions only when interaction structure is genuinely different.
4. Do not mix visual standardization with unrelated logic refactors in the same slice.
5. Update the regression matrix in the same change set when a primitive meaningfully changes.

## Primitive-Level Changes (Recent)

1. Segmented primitive implementation updates:
   1. `apps/web/src/app/shared/segmented-switch/segmented-switch.component.ts`
   2. `apps/web/src/app/shared/segmented-switch/segmented-switch.component.html`
   3. `apps/web/src/app/shared/segmented-switch/segmented-switch.component.scss`
2. Global segmented token/state updates:
   1. `apps/web/src/styles.scss`
3. Projects consumer migration and text fallback hardening:
   1. `apps/web/src/app/features/projects/projects-page.component.ts`
   2. `apps/web/src/app/features/projects/projects-page.component.html`
4. Motion guidance/resource docs:
   1. `docs/design/components/segmented-switch-motion-resource.md`

Definition note:

1. Primitive-level changes are changes in shared components and global style primitives first; feature files only consume those primitives and only keep layout/exceptions.

## UI Primitive Inventory (Mapping)

| Primitive block                                 | Canonical contract                                 | Primary implementation files                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Current state | Theme readiness |
| ----------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------------- |
| Global token foundation                         | Global CSS custom properties in one source         | `apps/web/src/styles.scss`, `docs/design/tokens.md`                                                                                                                                                                                                                                                                                                                                                                                                                                             | present       | medium          |
| Button family                                   | Shared button primitive + semantic variants        | `apps/web/src/styles.scss`, `apps/web/src/app/features/account/account.component.html`, `apps/web/src/app/features/projects/projects-page.component.html`, `apps/web/src/app/features/settings-overlay/sections/invite-management-section.component.html`                                                                                                                                                                                                                                       | partial       | medium          |
| Dropdown shell/anchoring                        | Shared shell + panel classes                       | `apps/web/src/app/shared/dropdown-shell.component.ts`, `apps/web/src/app/shared/standard-dropdown.component.ts`                                                                                                                                                                                                                                                                                                                                                                                 | present       | medium          |
| Toolbar option dropdowns                        | Shared menu surface + dropdown shell               | `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/workspace-toolbar.component.html`, `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/sort-dropdown.component.ts`, `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/grouping-dropdown.component.ts`, `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/filter-dropdown.component.ts`, `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/projects-dropdown.component.ts` | present       | medium          |
| Map context menus                               | Option menu surface primitives                     | `apps/web/src/app/features/map/map-shell/map-shell.component.html`, `apps/web/src/app/features/map/map-shell/map-shell.component.scss`                                                                                                                                                                                                                                                                                                                                                          | partial       | low             |
| Detail context menu                             | Option menu surface + contextual actions           | `apps/web/src/app/features/map/workspace-pane/image-detail-view.component.html`, `apps/web/src/app/features/map/workspace-pane/image-detail-view.component.scss`                                                                                                                                                                                                                                                                                                                                | partial       | low             |
| Search suggestions panel (integrated exception) | Integrated search + suggestion panel pattern       | `apps/web/src/app/features/map/workspace-pane/address-search/address-search.component.html`, `apps/web/src/app/features/map/workspace-pane/address-search/address-search.component.scss`                                                                                                                                                                                                                                                                                                        | partial       | medium          |
| Metadata suggestion menu                        | Option menu surface in inline form flow            | `apps/web/src/app/features/map/workspace-pane/metadata-section/metadata-section.component.html`, `apps/web/src/app/features/map/workspace-pane/metadata-section/metadata-section.component.scss`                                                                                                                                                                                                                                                                                                | partial       | medium          |
| Settings form sections                          | Shared settings/form primitives + semantic aliases | `apps/web/src/app/features/settings-overlay/settings-overlay.component.html`, `apps/web/src/app/features/settings-overlay/settings-overlay.component.scss`, `apps/web/src/styles.scss`                                                                                                                                                                                                                                                                                                          | partial       | medium          |
| Segmented switch (icon + inactive state)        | Shared segmented switch component                  | `apps/web/src/app/shared/segmented-switch/segmented-switch.component.ts`, `apps/web/src/app/shared/segmented-switch/segmented-switch.component.html`, `apps/web/src/app/shared/segmented-switch/segmented-switch.component.scss`, `apps/web/src/styles.scss`                                                                                                                                                                                                                                    | present       | medium          |
| Dialog shell (confirm/input/select)             | Shared modal primitives                            | `apps/web/src/app/shared/confirm-dialog/confirm-dialog.component.ts`, `apps/web/src/app/shared/text-input-dialog/text-input-dialog.component.ts`, `apps/web/src/app/shared/project-select-dialog/project-select-dialog.component.ts`                                                                                                                                                                                                                                                            | present       | medium          |
| Chips and compact selector rows                 | Shared chip behavior + row semantics               | `apps/web/src/app/shared/quick-info-chips/quick-info-chips.component.ts`, `apps/web/src/app/shared/quick-info-chips/quick-info-chips.component.scss`, `apps/web/src/app/features/projects/projects-view-toggle.component.ts`                                                                                                                                                                                                                                                                    | partial       | medium          |
| Slider control                                  | Shared slider primitive                            | `apps/web/src/app/shared/snap-size-slider/snap-size-slider.component.ts`, `apps/web/src/app/shared/snap-size-slider/snap-size-slider.component.scss`                                                                                                                                                                                                                                                                                                                                            | present       | medium          |
| Color selector popover                          | Feature-specific option picker                     | `apps/web/src/app/features/projects/project-color-picker.component.ts`                                                                                                                                                                                                                                                                                                                                                                                                                          | partial       | medium          |
| Invite management section                       | Shared settings/form primitives + semantic aliases | `apps/web/src/app/features/settings-overlay/sections/invite-management-section.component.html`, `apps/web/src/app/features/settings-overlay/sections/invite-management-section.component.scss`, `apps/web/src/styles.scss`                                                                                                                                                                                                                                                                      | partial       | medium          |
| Captured date inline editor                     | Shared field/menu/action aliases in inline editor  | `apps/web/src/app/features/map/workspace-pane/captured-date-editor.component.scss`, `apps/web/src/styles.scss`                                                                                                                                                                                                                                                                                                                                                                                  | partial       | medium          |

Notes:

- `theme readiness: low` means the primitive still depends on feature-local color/spacing values and needs semantic token aliases.
- Integrated search suggestion behavior is an approved exception to strict dropdown unification, but still follows shared interaction and accessibility rules.

## Theme Contract (Semantic Token Layer)

Canonical source: `docs/design/token-layers.md`.

Catalog-level enforcement summary:

1. New or refactored primitives consume Layer C aliases first.
2. Runtime alias mapping lives in `apps/web/src/styles.scss`.
3. Theme packs override Layer C first; Layer A overrides are reserved for global rebranding.

## Immediate Next Deliverables

1. Finish button-family rollout across remaining settings/projects/dialog consumers still using local button styling.
2. Migrate remaining low-readiness menu surfaces (map context and detail context edge cases) to strict Layer C role aliases only.
3. Add minimal UI regression matrix (menus, toolbars, settings, dialogs) plus keyboard/focus smoke checks.
4. Add visual-theme verification pass (light/dark + one new custom theme profile) for all medium-readiness primitives.

## Next Execution Plan (Primitive-First)

### Slice A — Segmented Primitive Finalization

1. Lock motion values (duration/easing) and detached inactive spacing as tokenized defaults.
2. Add one additional consumer migration (map-type switch) to prove reuse consistency.
3. Mark segmented row in regression matrix with concrete `OK/BUG(...)` evidence per theme.

### Slice B — Button/Icon Primitive Completion

1. Finish button-family adoption in remaining settings/dialog consumers.
2. Remove residual feature-local hover/focus/border state rules where shared button primitives already exist.
3. Re-run `/projects` and settings visual parity check.

### Slice C — Menu/Popover Low-Readiness Closure

1. Close map/detail context-menu edge cases still at low readiness.
2. Ensure keyboard/focus parity (`Arrow`, `Home/End`, `Escape`, focus return) across option-openers.
3. Update `theme-regression-matrix.md` in the same slice.

## Supporting Resources

1. Segmented-switch motion reference: `docs/design/components/segmented-switch-motion-resource.md`
