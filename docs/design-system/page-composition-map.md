# Page Composition Map

Back to master: [master-spec.md](./master-spec.md)

Related inventory: [component-inventory.md](./component-inventory.md)

## Purpose

Document all major Feldpost surfaces as compositas, including:

- which base components they are built from
- which nested composites they contain
- how behavior changes when available space increases or decreases

Rule: this file is a design-system contract. New page-level UI should map to one of these compositions or explicitly register an exception.

Authority and relationship to element specs:

- Element specs in `docs/element-specs/` remain the implementation source of truth for feature behavior and wiring.
- This page maps those feature contracts onto reusable design-system primitives and composition geometry.
- If this map and an element spec diverge, update this map to match the element spec contract.

## Responsive Baseline

Use the shared breakpoint model from [layout-width-breakpoint-scale.md](./layout-width-breakpoint-scale.md):

- mobile: `< 48rem`
- tablet: `48rem` to `63.9375rem`
- desktop: `>= 64rem`

Global overflow/compression order:

1. Hide optional helper text
2. Collapse secondary actions to icon-only
3. Collapse tertiary metadata
4. Switch anchored/fixed side surfaces to drawer/sheet behavior
5. Preserve touch targets and keyboard focus semantics

## Composition Catalog

### 1) Global App Shell

Route scope: all authenticated routes (`/`, `/map`, `/photos`, `/projects`, `/settings`, `/account`)

Composition:

- `app-nav` (navigation rail)
  - nav item row primitive
  - active indicator primitive
- route surface container
  - page header rail (when used)
  - page content rail

Space behavior:

- Desktop:
  - nav rail remains persistent
  - content rail consumes remaining width
- Tablet:
  - nav rail remains visible; page-level action labels may compress
- Mobile:
  - nav becomes a fixed bottom tab bar surface
  - route surface prioritizes primary action row and first data viewport

### 2) Map Workspace Surface

Route scope: `/`, `/map`

Composition:

- `app-map-shell`
  - map zone
    - `app-segmented-switch` (map style)
    - upload trigger/action button
    - `app-upload-panel`
    - `app-search-bar`
    - `app-gps-button`
    - map context menus via `app-dropdown-shell`
  - `app-workspace-pane-shell`
    - `app-drag-divider`
    - `app-workspace-pane`
      - `app-pane-header`
        - title (editable contract optional)
        - close button
      - `app-workspace-toolbar`
        - operators
          - grouping dropdown
          - filter dropdown
          - projects dropdown
          - sort dropdown
          - sorting controls
      - `app-group-tab-bar`
      - `app-thumbnail-grid`
        - `thumbnail-card` primitives
      - `app-image-detail-view` (conditional)
        - `app-image-detail-header`
          - back button
          - overflow actions
        - `app-image-detail-photo-viewer`
        - `app-metadata-section`
          - metadata property rows
        - `app-image-detail-inline-section`
          - editable property rows
          - captured date editor
          - address search
        - `app-detail-actions`
      - `app-workspace-export-bar` (selection/export context)

Space behavior:

- Desktop:
  - workspace pane resizable (`min 17.5rem`, `default 22.5rem`, `max target 40rem`)
  - divider visible while pane is open
- Tablet:
  - pane width remains token-clamped; toolbar prioritizes icon-first controls
  - dense metadata rows may reduce secondary columns
- Mobile:
  - pane behaves as sheet surface (no desktop inline width logic)
  - divider hidden by contract
  - toolbar shifts to compact controls and menu-first action access

### 3) Upload Panel Composite

Primary host: map workspace

Composition:

- panel shell
- queue row primitives
- progress indicators
- row-level status chips
- confirm/cancel actions

Space behavior:

- Desktop:
  - anchored near upload trigger and map-safe
- Tablet/Mobile:
  - switches to constrained panel/sheet footprint
  - queue metadata truncates before action controls

### 4) Search + Filter Surfaces

Hosts: map search, workspace toolbar dropdowns, projects filters

Composition:

- `app-dropdown-shell`
- option menu surface
- search input primitive (`ui-input-control`)
- reset/clear icon action (`icon-btn-ghost`)
- option rows (`ui-item` shape)

Space behavior:

- Desktop:
  - anchored dropdown positioning
- Tablet:
  - anchored if space allows, otherwise inward clamping
- Mobile:
  - sheet-like panel class allowed
  - full-width option rows and larger touch targets

### 5) Projects Page Composite

Route scope: `/projects`

Composition:

- page rail container
- projects header row
  - new project primary action (left)
  - page title `Projects` (right)
- projects toolbar row
  - status segmented control (`All`, `Active`, `Archived`)
  - grouping dropdown
  - filter dropdown
  - sort dropdown
  - view-mode toggle
- content rail (`max-width: 25rem`)
  - grouped or flat project list rows
  - project card grid (view-mode dependent)
  - row/card actions (rename/archive/restore/delete)
- project color workflows
  - `app-project-color-picker`
  - anchored project color action on active rows/cards
- project details view (in-page)
  - reused workspace pane
  - reused image detail view
  - map handoff action to `/map`

Space behavior:

- Desktop:
  - list/cards + workspace split layout
- Tablet:
  - compressed metadata zones with stable action zones
- Mobile:
  - single-column card/list emphasis with toolbar controls preserved

### 6) Photos Page Composite

Route scope: `/photos`

Composition:

- page rail container
- photos toolbar
  - sort control
  - filter trigger
  - photo count label
- responsive photo grid
  - photo grid items
- loading/end/empty surfaces
  - loading spinner
  - end-of-list marker or load-more action
  - empty state with upload CTA

Space behavior:

- Desktop:
  - grid-first layout with toolbar controls always visible
- Tablet:
  - fewer columns per row with stable toolbar behavior
- Mobile:
  - narrow multi-column grid and compact toolbar actions

### 7) Settings Surface Composite

Route scope: `/settings`

Composition:

- settings page shell
- appearance section
  - theme toggle (light/dark/system)
- map tile section
  - tile style select (`default`, `satellite`, `terrain`)

Space behavior:

- Desktop:
  - centered page content (max-width 40rem)
- Tablet:
  - same section structure with tighter horizontal rail
- Mobile:
  - stacked single-column setting rows

### 8) Settings Overlay Composite (Global)

Route scope: global overlay (no route segment), anchored from nav settings/avatar action

Composition:

- settings overlay host (CDK overlay)
- overlay surface
  - section list column
  - internal divider
  - section detail column
  - section-local loading/error/retry states
- backdrop dismiss layer

Space behavior:

- Desktop:
  - anchored to sidenav host and vertically aligned to rail host
- Tablet:
  - constrained two-column overlay with adaptive section rail
- Mobile:
  - compact overlay behavior with preserved dismiss semantics

### 9) Account Page Composite

Route scope: `/account`

Composition:

- account page shell (centered content rail)
- user info card
  - avatar
  - email
  - role badge
  - assurance badge
- account/security sections
  - profile
  - login/email/password
  - 2FA
  - session/logout
  - delete-account danger section

Space behavior:

- Desktop:
  - centered content rail (max-width 40rem)
- Tablet:
  - same section stack with reduced side spacing
- Mobile:
  - full-width section stack with preserved destructive-action prominence

### 10) Auth Composites

Route scope: `/auth/login`, `/auth/register`, `/auth/reset-password`, `/auth/update-password`

Composition:

- auth page shell
- form field primitives (input/select/toggle where needed)
- primary/secondary action buttons
- inline validation and status feedback
- login/register map-background surface (decorative, non-interactive)

Space behavior:

- Desktop:
  - centered constrained auth container
- Tablet:
  - same container with reduced side spacing
- Mobile:
  - full-width form rails with larger vertical spacing for touch ergonomics

### 11) Shared Dialog Composites

Hosts: map/projects/settings and other flows

Composition:

- `app-confirm-dialog`
- `app-text-input-dialog`
- `app-project-select-dialog`

Space behavior:

- Desktop:
  - medium/large overlay classes with fixed action rail
- Tablet:
  - bounded width with consistent keyboard focus loop
- Mobile:
  - sheet/full-width dialog mode permitted
  - actions stay pinned in reachable footer zone

## Primitive-to-Composite Traceability

This map requires every page-level change to identify:

1. Base primitives used
2. Composite(s) built from those primitives
3. Space behavior for desktop/tablet/mobile

If a feature cannot map to existing primitives/composites, add:

- a new family entry in [component-inventory.md](./component-inventory.md)
- variant/state details in [component-variants-matrix.md](./component-variants-matrix.md)
- migration ownership in [governance-adoption.md](./governance-adoption.md)

## Current High-Priority Standardization Gaps

1. Projects responsive column-reduction rules need one explicit stable contract (table-to-list threshold and required always-visible columns).
2. Photos page card/list composition needs explicit stable variant matrix entries.
3. Settings overlay rail-collapse thresholds should move from feature-specific implementation details to a stable design-system contract.
4. Workspace pane toolbar operator density levels should be formally promoted from `draft` to `stable` once cross-route parity checks are complete.
