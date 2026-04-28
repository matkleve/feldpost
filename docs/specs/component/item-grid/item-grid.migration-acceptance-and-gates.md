# Item Grid — Migration, acceptance, and gates

> **Parent:** [item-grid.md](item-grid.md)

## What It Is

**Migration and archival policy**, full **acceptance criteria** checklist, **comment convention**, and **canonical name registry** gate.

## What It Looks Like

Process gates and checkbox tracking for the grid migration; not a runtime UI surface.

## Where It Lives

- **Specs:** `docs/specs/component/item-grid/item-grid.migration-acceptance-and-gates.md`

## Actions

| # | Trigger | System response |
| --- | --- | --- |
| 1 | Migration cutover | Archive legacy paths per policy below |

## Component Hierarchy

N/A — process documentation.

## Data

N/A.

## Migration and Archival Policy

- No parallel runtime operation is allowed after a surface migration cutover.
- Workspace selected-items migration must be one-shot at top-level wiring: no long-lived intermediate runtime with active `app-thumbnail-grid` host path.
- `universal-media.component.ts` and `card-grid.component.ts` are reference sources during migration, then archived after successful replacement by item-grid domain items.
- All replaced legacy grid/card implementations are archived instead of deleted so implementation history remains inspectable.
- Archive location convention:
  - `apps/web/src/app/archive/item-grid-legacy/<surface>/<original-file>`
  - `<surface>` uses one of: `workspace-pane`, `media-page`, `projects-page`, `shared-primitives`
- A migration is considered complete only when routing/wiring no longer imports the legacy component set for that surface.

### Migration Sequence

1. Build `ItemGridComponent` and `ItemComponent` base contract in isolation.
2. Build `MediaItemComponent`, migrate `/media`, then archive replaced media/grid shared components.
3. Build `ProjectItemComponent`, migrate `/projects`, then archive replaced projects grid/card components.
4. Migrate Workspace Pane selected-items surface in one cutover (active ItemGrid + MediaItem path), then archive thumbnail grid/card components.

### Legacy Targets to Archive

- Workspace pane:
  - `apps/web/src/app/features/map/workspace-pane/thumbnail-grid.component.ts`
  - `apps/web/src/app/features/map/workspace-pane/thumbnail-card/thumbnail-card.component.ts`
  - `apps/web/src/app/features/map/workspace-pane/thumbnail-card/thumbnail-card-media/thumbnail-card-media.component.ts`
- Media page:
  - `apps/web/src/app/features/media/media-grid.component.ts`
  - `apps/web/src/app/features/media/media-card.component.ts`
  - `apps/web/src/app/features/media/media-loading.component.ts`
- Projects page:
  - `apps/web/src/app/features/projects/projects-grid-view.component.ts`
  - `apps/web/src/app/features/projects/project-card.component.ts`
- Shared primitives:
  - `apps/web/src/app/shared/media/universal-media.component.ts`
  - `apps/web/src/app/shared/ui-primitives/card-grid.component.ts`

## Acceptance Criteria

- [x] ItemGridComponent provides only layout behavior and content projection, with no domain-specific labels, actions, or data dependencies.
- [x] ItemGridComponent supports exactly five modes: `grid-sm`, `grid-md`, `grid-lg`, `row`, `card`.
- [x] Responsive transitions are controlled only by design tokens; no hardcoded breakpoint literals in component SCSS.
- [x] ItemComponent defines one mandatory shared input/output contract for all domain item components.
- [x] Loading, error, and empty visuals are rendered by ItemComponent shared state frame and are not overridable by domain item subclasses.
- [x] Selected emphasis is domain-owned (for example media/project frame-level selectors) while base contract only propagates selected state and events.
- [x] Loading visuals use pulse placeholder contract; spinner is forbidden and loading icon semantics are domain-owned.
- [x] All SCSS uses semantic component names and token-based values; no generic menu/list utility class naming in new item-grid system files.
- [x] SCSS ownership is strict: grid layout in ItemGrid, state visuals in ItemStateFrame, domain visuals in domain item components.
- [x] Every class, custom property variable, and keyframe in item-grid system SCSS files includes a two-line comment with behavior and spec reference.
- [x] MediaItemComponent action exposure references action-context matrix contract for `ws_grid_thumbnail`.
- [ ] All media consumers (map, workspace, `/media`, detail) use `MediaDownloadService` for tier/URL selection and delivery-state mapping.
- [ ] MediaItem composes `MediaDisplayComponent` as canonical render contract (no runtime wrapper/import of archived `UniversalMediaComponent`).
- [ ] MediaDisplay path follows canonical media states defined in `media-display.md` and `media-download-service.md` without local redefinition in ItemGrid.
- [ ] Cached paths never shortcut directly to `content-visible`; `loading-surface-visible` remains first.
- [ ] Media branch contract is explicit: image/video stay bitmap-based; document-like media may use `icon-only` only for small slots.
- [x] MediaItem upload overlay renders progress/icon/label with correct z-order relative to quiet actions.
- [x] MediaItem quiet actions reveal on hover/focus without layout shift and remain keyboard accessible.
- [x] MediaItem measures slot size in `rem` and resolves adaptive requested/effective tier through orchestrator.
- [ ] MediaItem emits complete `ws_grid_thumbnail` action contract events, not only open/select shortcuts.
- [ ] MediaItem mode variants (`grid-sm`, `grid-md`, `grid-lg`, `row`, `card`) define explicit visual geometry and preview behavior.
- [ ] MediaItem row mode derives dynamic height ratio from media metadata and uses fade in/out for ratio-relevant source transitions.
- [ ] `/media` progressive row insertion uses deterministic batch size `columns x 3`.
- [ ] ItemComponent base contract defines no fixed aspect-ratio policy; each domain item declares and owns its aspect rules.
- [ ] Document-like media applies A4 by file-type suitability policy (not `grid-lg`-only), with row-mode metadata ratio override.
- [ ] ProjectItemComponent defines its action mapping through the action matrix contract for project contexts.
- [ ] JobItemComponent remains a non-rendering placeholder contract in this phase and is not wired into active routes.
- [ ] Workspace pane selected-items surface (`/map`) is migrated to `ItemGridComponent` with projected `MediaItemComponent`.
- [ ] Workspace pane selected-items runtime contains no active `app-thumbnail-grid` imports after migration cutover.
- [ ] Workspace pane selected-items cutover is executed in one migration step without a long-lived intermediate top-level `app-thumbnail-grid` runtime.
- [x] Each migrated surface has exactly one runtime grid/card path (item-grid system); replaced legacy files are archived under `apps/web/src/app/archive/item-grid-legacy/`.
- [ ] Cross-surface cache reuse avoids forced cold-loading when media was already fetched in map/workspace/detail flows.
- [ ] Same `querySignature` route re-entry hydrates from cache and does not trigger full list requery.
- [ ] `querySignature`, `loadedWindows`, and `indexEntries` are defined for media list integration wiring.
- [x] Item-grid/media-item terminology stays intent-only with respect to route lifecycle and operator/query ownership.
- [x] Item-grid/media-item surfaces do not process per-item escalation storms; systemic escalation remains coalesced through service/content/shell boundaries.
- [ ] Exactly two geometry owners exist in each render path (outer layout owner and innermost content owner).
- [ ] Stateful item components use one enum state input with `[attr.data-state]`; boolean visual-state inputs are removed from public APIs.
- [ ] Transition choreography is tokenized (`var(--transition-*)`) with no magic-number timing values.
- [ ] `npm run lint` and `ng build` are clean for the migration scope.

## Comment Convention

Use this comment pattern in all item-grid system implementation files:

- First line explains behavior.
- Second line points to the governing spec section.

Example:

- `// Renders unified loading state for all item types`
- `// @see item-grid.state-and-fsm.md#state-machine`

## Canonical Name Registry Gate

- Every component name used in this spec MUST match a canonical entry in glossary/registry.
- Names that do not resolve to a canonical glossary/registry entry MUST be treated as unresolved and MUST block completion.
- This refactor pass MUST NOT create or rename glossary/registry entries outside the in-scope media-page specification set.
- If a required canonical name cannot be resolved, documentation work MUST stop with: `⚠ SPEC GAP: [missing file or ambiguous owner]`.
