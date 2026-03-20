# Component Inventory

Back to master: [master-spec.md](./master-spec.md)

## Canonical Families

### 1) Primitives

- `ui-container` (panel shell)
- `ui-item` (row shell)
- `ui-item-media`
- `ui-item-label`
- `ui-spacer`
- Shared icon/button primitives (`ui-button*`, `icon-btn-ghost`)

Status: `stable`

### 2) Inputs and Selection

- Text input control primitive
- Select/dropdown trigger primitive
- Segmented switch
- Toggle/switch row
- Slider/range
- Checkbox/radio
- Chip/tag (action + passive)

Status:

- segmented switch: `stable`
- select/input/toggle/chip family: `draft`
- checkbox/radio unification: `planned`

### 3) Navigation

- Sidebar navigation rail
- Group tab bar
- Tabs and segmented navigation
- Breadcrumbs
- Command palette / quick switcher

Status:

- sidebar/group tabs: `stable`
- tabs/segmented nav: `draft`
- breadcrumbs: `draft`
- command palette: `draft`

### 4) Menus, Overlays, and Dialogs

- Dropdown shell
- Menu surface
- Context menus (map, marker, radius, detail)
- Popover panel primitive
- Dialog shell
- Confirm/input/select dialogs
- Settings overlay
- Image detail overlay

Status:

- dropdown shell/dialog shell/core dialogs: `stable`
- context menu consistency: `draft`
- generic popover panel: `draft`
- settings overlay geometry system: `draft`

### 5) Data Display

- List row primitive
- Grid card primitive
- Group header/collapsible row
- Metadata key/value row
- Status badge/pill
- Table primitive
- Stats/summary tile

Status:

- group header: `stable`
- list/grid/metadata/status: `draft`
- table primitive: `draft`
- stats tiles: `planned`

### 6) Feedback and System State

- Toast
- Inline validation
- Skeleton loaders
- Disabled/busy interactions
- Error/retry blocks
- Progress indicators

Status:

- toast/progress indicators: `stable`
- skeleton/inline validation/error blocks: `draft`

### 7) Layout and Responsive Surfaces

- Map shell
- Map zone
- Workspace pane
- Drag divider
- Upload panel
- Search panel and result surfaces
- Filter panel
- Settings overlay layout
- Mobile bottom sheet surfaces

Status:

- map shell/map zone/drag divider base: `stable`
- workspace pane width logic: `draft`
- upload/search/filter/settings responsive standardization: `draft`

### 8) Domain-Specific Map and Field Components

- Photo marker and cluster marker
- User location marker
- Placement mode banner
- Radius selection controls
- Map style switch
- Workspace toolbar family
- Project assignment/select flows

Status:

- marker and selection systems: `stable`
- toolbar and assignment consistency: `draft`

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

Progress in this wave:

- Canonical popover panel contract drafted
- Canonical table primitive contract drafted
- Canonical breadcrumbs contract drafted

See migration priorities in [governance-adoption.md](./governance-adoption.md).
