# Item Grid

## What It Is

Item Grid is the universal layout and item-rendering contract for all Feldpost list and grid surfaces. It defines one shared structure for media, projects, and future domain entities so loading, error, no-media, and selection behavior stay consistent across pages and workspace contexts.
This system is a full replacement contract: once a surface is migrated, legacy grid/card components for that surface are removed from active wiring and moved to archive for traceability.

## What It Looks Like

The system has two architectural layers: a layout-only `ItemGridComponent` and a state-contract `ItemComponent` base class consumed by domain-specific item components. Layout modes are `grid-sm`, `grid-md`, `grid-lg`, `row`, and `card`, with responsive transitions driven only by design tokens and shared primitives. Item content is projected from domain components; grid layout never renders domain text or actions itself. Loading is rendered as a pulse placeholder layer (no spinner, no camera icon) and transitions through one deterministic state chain (`loading -> content | error | no-media`). All styles use semantic component class names and component-scoped SCSS files.
For media items, `MediaItemComponent` rebuilds the visual/state contract in feature code (state layers, upload overlays, adaptive tier behavior, quiet actions, row-mode dynamic ratio), without runtime wrapping/importing of archived shared media components.

## Where It Lives

- Shared location: `apps/web/src/app/shared/item-grid/`
- Domain consumers:
  - Media page (`/media`) via media domain item adapter
  - Projects page (`/projects`) via project domain item adapter
  - Workspace pane selected-items area via workspace media domain item adapter
- Trigger: any feature that renders repeated items in list/grid/card layouts

## Actions

| #   | User Action                                                                     | System Response                                                                                                       | Trigger                           |
| --- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1   | Parent surface sets `mode` to `grid-sm`, `grid-md`, `grid-lg`, `row`, or `card` | ItemGrid applies matching semantic layout class and tokenized geometry                                                | `mode` input change               |
| 2   | Parent projects domain items into ItemGrid                                      | Grid renders projected item slots without domain logic                                                                | Content projection                |
| 3   | Domain item enters loading state                                                | Base ItemComponent renders pulse placeholder (no spinner, no camera icon) until terminal state                        | `loading=true`                    |
| 4   | Domain item enters error state                                                  | Base ItemComponent renders shared error surface and exposes retry output                                              | `error=true`                      |
| 5   | Parent provides empty collection                                                | Parent-level empty region renders using shared empty contract while ItemGrid keeps layout shell stable                | `items.length===0`                |
| 6   | User selects or deselects an item                                               | Base ItemComponent toggles shared selected styling and emits selection event                                          | pointer/keyboard selection action |
| 7   | User opens item action menu on media item                                       | MediaItem action set is resolved from action-context matrix for `ws_grid_thumbnail` contract                          | action trigger in MediaItem       |
| 8   | Viewport crosses tokenized breakpoints                                          | Grid column count and spacing adapt by design token values only                                                       | responsive recalculation          |
| 9   | Migration step for a surface is completed                                       | New item-grid system becomes the only runtime path for that surface; legacy components move to archive, not deletion  | migration completion gate         |
| 10  | Media item render state changes (`loading`, `content`, `error`, `no-media`)     | MediaItem render surface switches layers using one deterministic state chain with no visual gaps                      | media render state update         |
| 11  | Upload phase/progress is active for the represented media                       | MediaItem shows upload overlay (progress fill + icon + label), layered behind quiet actions                           | upload state update               |
| 12  | User hovers/focuses media item on desktop                                       | Quiet actions fade in without layout shift; selection/context actions remain keyboard reachable                       | hover/focus interaction           |
| 13  | Media item slot dimensions change                                               | MediaItem measures slot size in `rem`, resolves requested/effective tier via orchestrator, and keeps rendering stable | resize observer event             |
| 14  | User triggers media item context action                                         | MediaItem resolves full `ws_grid_thumbnail` action set and emits canonical action events                              | context action trigger            |
| 15  | `/media` receives or appends large result sets                                  | Media list inserts rows progressively with deterministic batch size `columns x 3` to keep interaction fluid           | list append / pagination          |

## Component Hierarchy

```text
ItemGridSystem
├── ItemGridComponent (layout only, no domain knowledge)
│   ├── mode classes: item-grid--grid-sm | --grid-md | --grid-lg | --row | --card
│   └── <ng-content select="app-*-item"> projected domain items
├── ItemComponent (abstract base class, no layout geometry)
│   ├── Shared state frame
│   │   ├── Loading layer (pulse placeholder)
│   │   ├── Error layer
│   │   ├── Empty layer
│   │   └── Selection layer
│   └── Domain content outlet (overridden by subclasses)
├── MediaItemComponent (extends ItemComponent)
│   ├── MediaItemRenderSurfaceComponent (features/media; no shared wrapper)
│   │   ├── Layer: loading/content/error/no-media
│   │   ├── Row mode: dynamic height ratio from media metadata
│   │   └── MediaItemUploadOverlayComponent (features/media)
│   └── MediaItemQuietActionsComponent (features/media; ws_grid_thumbnail actions)
├── DocumentItemComponent (extends ItemComponent)
│   └── grid-lg contract: A4 behavior from renderer rules (see Aspect-Ratio Ownership Contract)
├── ProjectItemComponent (extends ItemComponent)
│   ├── Project metadata and status
│   └── Project actions bound to project context matrix contract
└── JobItemComponent (extends ItemComponent, placeholder contract only)
    └── Not implemented in this phase
```

## Data

Item Grid core does not query backend data directly. Domain adapters provide normalized item view models and action context metadata.

### Data Flow (Mermaid)

```mermaid
flowchart TD
  A[Route page or workspace context] --> B[Domain adapter]
  B --> C[Normalized item view models]
  C --> D[ItemGridComponent]
  D --> E[Projected Domain Item Components]
  E --> F[ItemComponent shared state contract]
  E --> G[MediaItemComponent rebuild pipeline]
  G --> H[MediaItemRenderSurfaceComponent]
  H --> I[PhotoLoadService load-state signals]
  H --> J[MediaOrchestratorService tier and type resolution]
  G --> K[MediaItemUploadOverlayComponent]
  K --> L[UploadManagerService phase and progress]
  G --> M[MediaItemQuietActionsComponent]
  M --> N[action-context-matrix.md ws_grid_thumbnail]
```

| Field             | Source                             | Type                                                       | Purpose                                       |
| ----------------- | ---------------------------------- | ---------------------------------------------------------- | --------------------------------------------- |
| `mode`            | Parent page/workspace container    | `'grid-sm' \| 'grid-md' \| 'grid-lg' \| 'row' \| 'card'`   | Drives layout mode in ItemGrid                |
| `items`           | Domain adapter output              | `ReadonlyArray<ItemViewModel>`                             | Rendered item collection                      |
| `loading`         | Domain adapter/item async pipeline | `boolean`                                                  | Shared loading state in ItemComponent         |
| `error`           | Domain adapter/item async pipeline | `boolean`                                                  | Shared error state in ItemComponent           |
| `empty`           | Parent collection state            | `boolean`                                                  | Shared empty state signaling                  |
| `selected`        | Selection service / parent state   | `boolean`                                                  | Shared selected styling and behavior          |
| `actionContextId` | Domain adapter                     | `string`                                                   | Binds item action menus to matrix contract    |
| `photoLoadState`  | `PhotoLoadService`                 | `'idle' \| 'loading' \| 'loaded' \| 'error' \| 'no-photo'` | Canonical media loading and fallback state    |
| `slotWidthRem`    | Media item measurement             | `number \| null`                                           | Adaptive tier selection input                 |
| `slotHeightRem`   | Media item measurement             | `number \| null`                                           | Adaptive tier selection input                 |
| `requestedTier`   | Media item mode mapping            | `MediaTier`                                                | Target render tier before orchestration       |
| `effectiveTier`   | `MediaOrchestratorService`         | `MediaTier`                                                | Actual tier after slot-aware resolution       |
| `uploadOverlay`   | `UploadManagerService` bridge      | `UploadOverlayState \| null`                               | Upload progress and status layer              |
| `gridColumns`     | Grid layout resolver               | `number`                                                   | Current resolved column count                 |
| `batchInsertSize` | Media list progressive renderer    | `number`                                                   | Deterministic append size (`gridColumns x 3`) |

## State

| Name              | TypeScript Type                                          | Default     | What it controls                                         |
| ----------------- | -------------------------------------------------------- | ----------- | -------------------------------------------------------- |
| `mode`            | `'grid-sm' \| 'grid-md' \| 'grid-lg' \| 'row' \| 'card'` | `'grid-md'` | ItemGrid layout variant                                  |
| `loading`         | `boolean`                                                | `false`     | Non-overridable loading layer rendering in ItemComponent |
| `error`           | `boolean`                                                | `false`     | Non-overridable error layer rendering in ItemComponent   |
| `empty`           | `boolean`                                                | `false`     | Non-overridable empty layer rendering in ItemComponent   |
| `selected`        | `boolean`                                                | `false`     | Shared selected state styling and ARIA                   |
| `disabled`        | `boolean`                                                | `false`     | Shared interaction gating for unavailable items          |
| `actionContextId` | `string \| null`                                         | `null`      | Resolves domain actions via action matrix                |
| `batchInsertSize` | `number \| null`                                         | `null`      | Progressive `/media` insertion size (`columns x 3`)      |

### Base Class Contract (Mandatory for all Domain Items)

Every domain item extending ItemComponent must expose these inputs/outputs:

- Inputs:
  - `mode`
  - `loading`
  - `error`
  - `empty`
  - `selected`
  - `disabled`
  - `actionContextId`
  - `itemId`
- Outputs:
  - `selectedChange`
  - `opened`
  - `retryRequested`
  - `contextActionRequested`

Shared state rendering (loading/error/empty/selection) is owned by ItemComponent and is not overridable by domain subclasses.

### Pulse Placeholder Contract (Mandatory)

The loading visual standard for Item Grid surfaces is a pulse placeholder layer. Spinner-based loading is forbidden.

- Layer: placeholder fills the intended media slot dimensions from first paint
- Motion: gentle pulse only during `loading`
- Iconography: no camera icon in loading layer
- Transition: deterministic state chain `loading -> content | error | no-media`

### Media Contract Rebuild Rule (Mandatory)

- Archived `universal-media.component.*` remains the visual/state reference contract, not a runtime dependency.
- `MediaItemComponent` must implement the same contract surface directly in feature code:
  - deterministic render state chain (`loading -> content | error | no-media`)
  - upload overlay behavior and layering
  - slot-measurement based adaptive tier selection
  - quiet actions behavior and accessibility
  - row-mode dynamic height ratio from media metadata plus fade in/out transitions
- Runtime wrapping, importing, or forwarding through `UniversalMediaComponent` is forbidden for migrated media item flows.

### Aspect-Ratio Ownership Contract (Mandatory)

- `ItemComponent` base contract must not enforce one fixed aspect ratio rule.
- Every domain item owns its own aspect contract (for example media, project, document).
- `MediaItemComponent` owns photo/video ratio behavior:
  - row mode ratio is derived from metadata (not hardcoded square)
  - visual updates use fade in/out when ratio-relevant media source changes
- `DocumentItemComponent` keeps A4 behavior in `grid-lg`.
  - Reference: existing renderer contract in `docs/archive/element-specs-legacy/2026-04-02-item-grid-consolidation/media-renderer-system.md` and file-type registry mapping.
  - TODO: document explicit A4 numeric ratio in active spec once renderer archive references are fully replaced.

### Media Domain Sub-Component Ownership (Mandatory)

- All media-specific rebuild sub-components belong to `apps/web/src/app/features/media/`.
- `shared/item-grid/` remains layout/state-frame only and must not host media domain render primitives.
- Required split:
  - `MediaItemComponent`: orchestration, measurement, state mapping, action emission
  - `MediaItemRenderSurfaceComponent` (features/media): visual media layers and asset rendering
  - `MediaItemUploadOverlayComponent` (features/media): upload progress overlay layer
  - `MediaItemQuietActionsComponent` (features/media): hover/focus action affordances and action triggers

## SCSS Responsibilities

### Single Ownership Rule

- Every SCSS file is responsible for exactly one component.
- Geometry ownership is strictly split:
  - `ItemGridComponent` SCSS defines only grid layout (columns, gaps, breakpoints).
  - `ItemComponent` / `ItemStateFrameComponent` SCSS defines only shared state frame surfaces (loading/error/empty/selection).
  - Domain item SCSS (`MediaItemComponent`, `ProjectItemComponent`, etc.) defines only domain content styling (typography, icons, media affordances).
- Explicitly forbidden: setting the same dimension in multiple component layers.
  - No duplicate `width` / `height` / `max-height` ownership across grid, state-frame, and domain item styles.
  - Each dimension is defined exactly once, at the semantically owning layer.

### SCSS Comment Rule

- Every CSS class, every custom property variable, and every keyframe must have two comment lines directly above it.
  - Line 1: what it does.
  - Line 2: spec reference.

Example:

- `// Defines column layout for grid-md mode with token-based spacing`
- `// @see docs/element-specs/item-grid.md#scss-responsibilities`

## File Map

| File                                                                       | Purpose                                                                                       |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `apps/web/src/app/shared/item-grid/item-grid.component.ts`                 | Layout-only container with mode inputs and projection contract                                |
| `apps/web/src/app/shared/item-grid/item-grid.component.html`               | Semantic layout shell + projection slots                                                      |
| `apps/web/src/app/shared/item-grid/item-grid.component.scss`               | Tokenized grid/row/card geometry classes                                                      |
| `apps/web/src/app/shared/item-grid/item.component.ts`                      | Abstract base class defining mandatory inputs/outputs and non-overridable states              |
| `apps/web/src/app/shared/item-grid/item-state-frame.component.ts`          | Shared non-overridable state renderer used by ItemComponent                                   |
| `apps/web/src/app/shared/item-grid/item-state-frame.component.html`        | Loading/error/empty/selection frame template                                                  |
| `apps/web/src/app/shared/item-grid/item-state-frame.component.scss`        | Unified state visuals including loading circle animation                                      |
| `apps/web/src/app/features/media/media-item.component.ts`                  | Domain media item extending ItemComponent                                                     |
| `apps/web/src/app/features/media/media-item.component.html`                | Media-specific content projection region                                                      |
| `apps/web/src/app/features/media/media-item.component.scss`                | Media item local styling only                                                                 |
| `apps/web/src/app/features/media/media-item-render-surface.component.ts`   | Media layer/state renderer implementing rebuilt universal contract                            |
| `apps/web/src/app/features/media/media-item-render-surface.component.html` | Media state-layer template (`loading/content/error/no-media`)                                 |
| `apps/web/src/app/features/media/media-item-render-surface.component.scss` | Media render-surface visuals and tokenized geometry                                           |
| `apps/web/src/app/features/media/media-item-upload-overlay.component.ts`   | Upload overlay presenter for media item                                                       |
| `apps/web/src/app/features/media/media-item-upload-overlay.component.html` | Upload overlay template (progress fill/icon/label)                                            |
| `apps/web/src/app/features/media/media-item-upload-overlay.component.scss` | Upload overlay visuals and layering                                                           |
| `apps/web/src/app/features/media/media-item-quiet-actions.component.ts`    | Quiet-actions presenter for media item actions                                                |
| `apps/web/src/app/features/media/media-item-quiet-actions.component.html`  | Quiet-actions template with keyboard-accessible controls                                      |
| `apps/web/src/app/features/media/media-item-quiet-actions.component.scss`  | Quiet-actions reveal transitions without layout shift                                         |
| `apps/web/src/app/features/projects/project-item.component.ts`             | Domain project item extending ItemComponent                                                   |
| `apps/web/src/app/features/projects/project-item.component.html`           | Project-specific content projection region                                                    |
| `apps/web/src/app/features/projects/project-item.component.scss`           | Project item local styling only                                                               |
| `apps/web/src/app/features/jobs/job-item.component.ts`                     | Placeholder contract type extending ItemComponent (no rendering implementation in this phase) |
| `apps/web/src/app/features/jobs/job-item.contract.md`                      | Placeholder documentation for future job item rollout                                         |

## Wiring

### Injected Services

- ItemGridComponent: None.
- ItemComponent: None required in base contract.
- MediaItemComponent: `PhotoLoadService`, `MediaOrchestratorService`, `UploadManagerService`, i18n, and action routing.
- ProjectItemComponent: domain services for project actions and metadata.

### Inputs / Outputs

- ItemGridComponent inputs:
  - `mode: 'grid-sm' | 'grid-md' | 'grid-lg' | 'row' | 'card'`
- ItemGridComponent outputs:
  - None (layout component only)
- ItemComponent mandatory inputs:
  - `itemId`, `mode`, `loading`, `error`, `empty`, `selected`, `disabled`, `actionContextId`
- ItemComponent mandatory outputs:
  - `selectedChange`, `opened`, `retryRequested`, `contextActionRequested`

### Subscriptions

- ItemGridComponent: None.
- ItemComponent: None in base class.
- Domain items: optional signal/computed subscriptions owned by each domain component and disposed by Angular lifecycle.
  - MediaItem-specific: photo load-state signal subscriptions, upload progress bridge, and resize observer cleanup.
  - Media page progressive rendering: batch append scheduling subscription using deterministic `columns x 3` chunk size.

### Supabase Calls

- ItemGridComponent: None.
- ItemComponent: None.
- Domain items: None direct; delegated to domain services.

### Wiring Flow (Mermaid)

```mermaid
sequenceDiagram
  participant P as Parent Page or Workspace Surface
  participant A as Domain Adapter
  participant G as ItemGridComponent
  participant D as Domain Item
  participant B as ItemComponent Base Contract
  participant M as Action Matrix Resolver

  P->>A: Provide raw domain entities
  A-->>P: Provide normalized item view models
  P->>G: Bind mode and project domain items
  G->>D: Project domain item components
  D->>B: Inherit shared state contract
  B-->>D: Render loading/error/empty/selection layers
  D->>M: Resolve action availability by context id
  M-->>D: Return visible/enabled actions
  D-->>P: Emit selectedChange/opened/retry/contextActionRequested
```

## Migration and Archival Policy

- No parallel runtime operation is allowed after a surface migration cutover.
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
4. Migrate Workspace Pane selected-items surface, then archive thumbnail grid/card components.

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
- [x] Loading, error, empty, and selection visuals are rendered by ItemComponent shared state frame and are not overridable by domain item subclasses.
- [x] Loading visuals use pulse placeholder contract and do not use spinner/camera-icon loading affordances.
- [x] All SCSS uses semantic component names and token-based values; no generic menu/list utility class naming in new item-grid system files.
- [x] SCSS ownership is strict: grid layout in ItemGrid, state visuals in ItemStateFrame, domain visuals in domain item components.
- [x] Every class, custom property variable, and keyframe in item-grid system SCSS files includes a two-line comment with behavior and spec reference.
- [x] MediaItemComponent action exposure references action-context matrix contract for `ws_grid_thumbnail`.
- [ ] MediaItem rebuilds universal render-state contract directly (no runtime wrapper/import of archived `UniversalMediaComponent`).
- [ ] MediaItem render surface implements canonical state layers: `loading`, `content`, `error`, `no-media`.
- [ ] MediaItem loading/no-media visuals use canonical `PhotoLoadService` placeholder assets and state semantics.
- [x] MediaItem upload overlay renders progress/icon/label with correct z-order relative to quiet actions.
- [x] MediaItem quiet actions reveal on hover/focus without layout shift and remain keyboard accessible.
- [x] MediaItem measures slot size in `rem` and resolves adaptive requested/effective tier through orchestrator.
- [ ] MediaItem emits complete `ws_grid_thumbnail` action contract events, not only open/select shortcuts.
- [ ] MediaItem mode variants (`grid-sm`, `grid-md`, `grid-lg`, `row`, `card`) define explicit visual geometry and preview behavior.
- [ ] MediaItem row mode derives dynamic height ratio from media metadata and uses fade in/out for ratio-relevant source transitions.
- [ ] `/media` progressive row insertion uses deterministic batch size `columns x 3`.
- [ ] ItemComponent base contract defines no fixed aspect-ratio policy; each domain item declares and owns its aspect rules.
- [ ] Document item keeps A4 behavior in `grid-lg` according to existing renderer rules; explicit active-spec A4 numeric ratio is tracked by TODO until extracted.
- [ ] ProjectItemComponent defines its action mapping through the action matrix contract for project contexts.
- [ ] JobItemComponent remains a non-rendering placeholder contract in this phase and is not wired into active routes.
- [x] Each migrated surface has exactly one runtime grid/card path (item-grid system); replaced legacy files are archived under `apps/web/src/app/archive/item-grid-legacy/`.

## Comment Convention

Use this comment pattern in all item-grid system implementation files:

- First line explains behavior.
- Second line points to the governing spec section.

Example:

- `// Renders unified loading state for all item types`
- `// @see item-grid.md#state`
