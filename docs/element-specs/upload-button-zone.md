# Upload Button Zone

## What It Is

The upload trigger and its container. A round button fixed in the top-right of the Map Zone that toggles the Upload Panel open/closed. The zone holds both the button and the expanded panel in a vertical layout.

## What It Looks Like

**Button:** 44px circle, `--color-clay` background, white camera icon. Desktop: top-right of map. Mobile: 56px FAB, bottom-right. When panel is open, button gets an active/pressed state.

**Zone:** Fixed-position container that holds the button at top and the Upload Panel below when expanded. Desktop: top-right corner. Mobile: bottom-right for FAB, panel slides up.

## Where It Lives

- **Parent**: Map Zone area of `MapShellComponent`
- **Always visible** when on the map page

## Actions

| #   | User Action                       | System Response                  | Triggers                  |
| --- | --------------------------------- | -------------------------------- | ------------------------- |
| 1   | Clicks upload button              | Toggles Upload Panel open/closed | `uploadPanelOpen` signal  |
| 2   | Clicks button while panel is open | Closes panel                     | `uploadPanelOpen` → false |

## Component Hierarchy

```
UploadButtonZone                           ← fixed position container, z-20
├── UploadButton                           ← 44px circle (desktop) / 56px FAB (mobile)
│   └── Icon "add_photo_alternate"         ← Material Icon, white
└── [open] UploadPanel                     ← slides down from button (see upload-panel spec)
```

## State

| Name              | Type      | Default | Controls                              |
| ----------------- | --------- | ------- | ------------------------------------- |
| `uploadPanelOpen` | `boolean` | `false` | Panel visibility, button active state |

## File Map

Part of `MapShellComponent` template (button + zone container are in `map-shell.component.html`). The Upload Panel itself is a separate component.

## Acceptance Criteria

- [ ] Button always visible on map page
- [ ] Desktop: 44px, top-right
- [ ] Mobile: 56px FAB, bottom-right
- [ ] Click toggles Upload Panel
- [ ] Button shows active state when panel is open
- [ ] `--color-clay` background, white icon
