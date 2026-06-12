# Component Inventory

Back to master: [master-spec.md](./master-spec.md)

Related composition map: [page-composition-map.md](./page-composition-map.md)

## Canonical Families

### 1) Foundation Primitives

Scope:

- Tokenized shells, spacing, typography, and atomic action affordances used by all composites.

Building blocks:

- `ui-container` (panel/surface shell)
- `ui-item` (row shell)
- `ui-item-media`
- `ui-item-label`
- `ui-spacer`
- `ui-button*` family (`primary`, `secondary`, `ghost`, `danger`)
- `icon-btn-ghost`
- Focus-ring and interaction-state aliases (`focus-visible`, `hover`, `active`, `disabled`)

Status: `stable`

### 2) Inputs and Selection Controls

Scope:

- Data entry, filtering, and mode switches.

Building blocks:

- Text input control primitive (`ui-input-control`)
- Select/dropdown trigger primitive (`ui-select-control`)
- Segmented switch (`app-segmented-switch`)
- Toggle/switch row primitive
- Slider/range primitive (`app-snap-size-slider`)
- Checkbox/radio primitive family
- Chip/tag primitives (actionable + passive)
- Inline edit primitives (field-in-row / confirm-cancel micro pattern)

Status:

- segmented switch/slider: `stable`
- input/select/toggle/chip/inline-edit family: `draft`
- checkbox/radio unification: `planned`

### 3) Navigation Primitives

Scope:

- Global, contextual, and path/navigation state controls.

Building blocks:

- Sidebar navigation rail (`app-nav`)
- Group tab bar (`app-group-tab-bar`)
- Tab/segmented navigation (`ui-tab-list`, `ui-tab`, `app-segmented-switch`)
- Breadcrumbs
- Route-level view toggles (`app-projects-view-toggle`)
- Command palette / quick switcher

Status:

- nav rail + group tabs: `stable`
- tabs/segmented-nav + view toggles: `draft` (tab layer + segmented size axis implemented, migration in progress)
- breadcrumbs: `draft`
- command palette: `draft`

### 4) Menus, Overlays, and Dialogs

Scope:

- Anchored menus, transient overlays, and decision dialogs.

Building blocks:

- Dropdown shell (`app-dropdown-shell`)
- Standard dropdown composite (`app-standard-dropdown`)
- Menu surface and option-row primitives
- Context menus (map, marker, radius, detail)
- Popover panel primitive
- Dialog shell
- Confirm dialog (`app-confirm-dialog`)
- Text input dialog (`app-text-input-dialog`)
- Project select dialog (`app-project-select-dialog`)
- Lightbox overlay (`app-photo-lightbox`)

Status:

- dropdown shell/dialog shell/core dialogs/lightbox: `stable`
- context menu + popover standardization: `draft`

### 5) Data Display Primitives

Scope:

- List/grid/table presentation and metadata rendering.

Building blocks:

- List row primitive (`ui-row-shell`)
- Grid/media tile primitives (`ui-card-shell`, `ui-media-tile`, `thumbnail-card` pattern)
- Group header/collapsible row (`app-group-header`)
- Key/value metadata row (`app-metadata-property-row`, editable-property-row)
- Status badge/pill (`ui-status-badge` / `ui-status-pill`)
- Table primitive (projects table)
- Quick-info chips (`app-quick-info-chips`)
- Stats/summary tiles

Status:

- group header + quick-info chips: `stable`
- list/grid/metadata/status/table: `draft` (status badge + row/card shell primitives implemented; broader migration in progress)
- stats tiles: `planned`

### 6) Feedback and System State

Scope:

- Visibility for progress, success/failure, and temporary states.

Building blocks:

- Toast feedback
- Inline validation states
- Skeleton loaders
- Busy/disabled interaction states
- Error/retry blocks
- Progress indicators (batch, queue, spinner)

Status:

- toast/progress indicators: `stable`
- skeleton/validation/error-state blocks: `draft`

### 7) Layout and Responsive Surfaces

Scope:

- Geometry contracts and adaptive surface behavior.

Building blocks:

- Map shell (`app-map-shell`)
- Map zone
- Workspace pane shell (`app-workspace-pane-shell`)
- Workspace pane (`app-workspace-pane`)
- Drag divider (`app-drag-divider`)
- Upload panel (`app-upload-panel`)
- Search bar + search results surface (`app-search-bar`)
- Settings overlay layout (`app-settings-overlay`)
- Page content rails (`photos`, `projects`, `settings`, `account`)
- Mobile bottom-sheet surfaces

Status:

- map shell/map zone/drag-divider base: `stable`
- workspace pane shell + cross-surface width logic: `draft`
- upload/search/settings/page-rail responsive harmonization: `draft`

### 8) Domain-Specific Map and Field Components

Scope:

- Feldpost-specific map/media interaction units.

Building blocks:

- Photo marker and cluster marker
- User location marker
- Placement mode banner
- Radius selection controls and draft visuals
- Map style switch
- Workspace toolbar family:
  - filter dropdown
  - grouping dropdown
  - projects dropdown
  - sort dropdown
  - sorting controls
  - export bar
- Image detail composites:
  - image-detail-header
  - media-detail-photo-viewer
  - metadata-section
  - image-detail-inline-section
  - detail actions
  - captured-date editor
  - address search
- Project assignment/select flows

Status:

- marker/radius/selection systems: `stable`
- workspace toolbar + detail composite consistency: `draft`

### 9) Page-Level Composites (Compositas)

Scope:

- Route surfaces composed from primitives + domain components.

Composites:

- Auth flows:
  - login
  - register
  - reset-password
  - update-password
- Map workspace route (`/`, `/map`)
- Media route (`/media`)
- Projects route (`/projects`)
- Settings route (`/settings`)
- Account route (`/account`)

Status:

- map composite baseline: `stable`
- projects/media/settings/account/auth compositional parity: `draft`

## Space and Responsive Behavior Contract

These rules are mandatory for all families and compositas:

1. Breakpoints:
   - mobile: `< 48rem`
   - tablet: `48rem` to `63.9375rem`
   - desktop: `>= 64rem`
2. Width model:
   - token-first widths only (see `layout-width-breakpoint-scale.md`)
   - no local hardcoded clamp values outside documented exceptions
3. Compression order when horizontal space shrinks:
   - optional labels collapse first
   - secondary actions collapse to icon-only
   - non-critical metadata hides next
   - surface switches to drawer/sheet mode before violating min touch targets
4. Expansion behavior when space grows:
   - restore labels and secondary metadata
   - promote from sheet/drawer to inline panel where contract permits
   - do not exceed documented max widths for pane/overlay families
5. Minimum interaction targets:
   - desktop min target: `44x44`
   - mobile min target: `48x48`
6. Focus/keyboard continuity:
   - responsive mode switches must preserve trigger semantics and focus return.

Detailed route-by-route composition and space behavior is documented in
[page-composition-map.md](./page-composition-map.md).

## Status Definitions

- `planned`: not standardized yet, or no reusable canonical implementation exists
- `draft`: reusable implementation exists but still allows inconsistent variants in production
- `stable`: approved component contract with migration gate passed
- `deprecated`: still usable but replacement path is active and mandatory for new usage
- `replaced`: legacy version retired; replacement is mandatory

## Lifecycle Owner Rules

- Every family has one doc owner and one implementation owner.
- Stable promotion is blocked until variant/state matrix and accessibility checks are complete.
- Deprecated components must include a replacement component and migration deadline.

## Inventory Gaps Identified

- Missing canonical table primitive
- Missing canonical breadcrumbs
- Missing generic reusable popover panel
- Partial consistency in field/select/toggle/chip primitives
- Layout drift in pane and overlay widths across map and settings surfaces
- Missing documented compression/expansion behavior for several non-map page composites

Progress in this wave:

- Canonical popover panel contract drafted
- Canonical table primitive contract drafted
- Canonical breadcrumbs contract drafted

See migration priorities in [governance-adoption.md](./governance-adoption.md).
