# Upload Button Zone

## What It Is

The upload trigger and its morph container. A round button fixed in the top-right of the Map Zone expands into a compact upload container when tapped. The zone holds the trigger, the expanded Upload Panel, and batch-state indicators.

## What It Looks Like

**Closed state:** 2.75rem (44px) circle, `--color-clay` background, white camera icon. Desktop is top-right of map; mobile is 3.5rem (56px) FAB bottom-right.

**Open state:** the circle morphs into a compact rounded container (`min-width: 20rem`, `max-width: 24rem`) with the drop area and status board handled by Upload Panel. The morph should animate radius, width, and elevation in 180ms using `--motion-standard` timing.

**Zone:** fixed-position stack container with a single visual surface in open state so it feels like one control, not a floating button plus separate card.

## Where It Lives

- **Parent**: Map Zone area of `MapShellComponent`
- **Always visible** when on the map page

## Actions

| #   | User Action                     | System Response                                             | Triggers                      |
| --- | ------------------------------- | ----------------------------------------------------------- | ----------------------------- |
| 1   | Clicks upload button            | Button morphs into compact upload container and opens panel | `uploadPanelOpen` signal      |
| 2   | Clicks collapse control         | Container collapses back into round upload button           | `uploadPanelOpen` → false     |
| 3   | Upload batch is active          | Button shell shows aggregate progress ring (0–100%)         | `batchProgress$` subscription |
| 4   | Queue empty + no active uploads | Progress ring hidden; control returns to idle visual        | `activeBatch() === null`      |
| 5   | Batch transitions to complete   | Brief success edge flash (200ms) before settling            | `batchComplete$` event        |

## Component Hierarchy

```
UploadButtonZone                                   ← fixed position container, z-20
├── MorphShell                                     ← transitions circle → rounded panel shell
│   ├── UploadButton                               ← closed state: 44px desktop / 56px mobile
│   │   ├── Icon "add_photo_alternate"             ← Material Icon, white
│   │   └── [uploading] ProgressRing               ← SVG circular progress (0–100%), --color-primary stroke
│   └── [open] UploadPanel                         ← integrated content surface (see upload-panel spec)
└── [complete pulse] ShellFlash                    ← 200ms success outline flash
```

The `ProgressRing` is a thin (2px) SVG circle overlaying the trigger edge. It fills clockwise from 0–100% as the active batch progresses. When no batch is active, it is hidden. When the batch completes, the shell flashes `--color-success` briefly (200ms) before fading.

## Data

### Data Flow (Mermaid)

```mermaid
flowchart LR
  U[User Tap] --> Z[UploadButtonZone]
  Z --> M[MapShellComponent]
  M --> UM[UploadManagerService]
  UM --> Z
```

| Field        | Source                               | Type                          |
| ------------ | ------------------------------------ | ----------------------------- |
| Active batch | `UploadManagerService.activeBatch()` | `Signal<UploadBatch \| null>` |
| Is busy      | `UploadManagerService.isBusy()`      | `Signal<boolean>`             |
| Open state   | `MapShellComponent.uploadPanelOpen`  | `WritableSignal<boolean>`     |

## State

| Name              | Type      | Default | Controls                              |
| ----------------- | --------- | ------- | ------------------------------------- |
| `uploadPanelOpen` | `boolean` | `false` | Panel visibility, button active state |
| `batchProgress`   | `number`  | `0`     | Progress ring fill (0–100)            |
| `isMorphing`      | `boolean` | `false` | Prevents double-tap during transition |

## File Map

Part of `MapShellComponent` template (button + zone container are in `map-shell.component.html`). The Upload Panel itself is a separate component.

## Wiring

### Wiring Flow (Mermaid)

```mermaid
sequenceDiagram
  actor User
  participant Zone as UploadButtonZone
  participant Shell as MapShellComponent
  participant Manager as UploadManagerService
  User->>Zone: Click UploadButton
  Zone->>Shell: toggleUploadPanel()
  Shell->>Zone: uploadPanelOpen = true
  Zone->>Zone: runMorphOpenAnimation()
  Manager-->>Zone: batchProgress updates
  Zone-->>User: shows ring + open shell
```

- Button and zone container live in `map-shell.component.html`
- `uploadPanelOpen` signal in `MapShellComponent` controls panel visibility
- Click handler toggles `uploadPanelOpen` signal
- Subscribes to `UploadManagerService.batchProgress$` for the progress ring
- Subscribes to `UploadManagerService.batchComplete$` for the success flash

## Acceptance Criteria

- [ ] Button always visible on map page
- [ ] Desktop: 44px, top-right
- [ ] Mobile: 56px FAB, bottom-right
- [ ] Click morphs button into compact upload container
- [ ] Collapse control returns container to round button
- [ ] Button shows active state when panel is open
- [ ] `--color-clay` background, white icon
- [ ] Progress ring (SVG circle) appears on button when a batch is active
- [ ] Progress ring fills 0–100% as batch progresses
- [ ] Progress ring flashes `--color-success` on batch completion
- [ ] Progress ring hidden when no batch is active
