# Photo Lightbox

## What It Is

A minimal full-surface photo viewer: displays one image URL, exposes `closed` when the user dismisses via Escape. Visibility and focus trap are owned by the parent host; this component is intentionally thin.

## What It Looks Like

The image scales within the host bounds using standard object-fit rules from parent/layout CSS. No chrome requirement is imposed by this contract beyond alt text support.

## Where It Lives

- **Code:** `apps/web/src/app/shared/photo-lightbox/`
- **Consumers:** Media and workspace flows that need an inline or overlay lightbox without coupling to map state.

## Actions

| #   | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1   | Parent mounts component with `imageUrl` | Image loads in viewer | input binding |
| 2   | Press Escape | `closed` output emits | `document:keydown.escape` host listener |
| 3   | Parent removes host | Component destroys | parent state |

## Component Hierarchy

```text
app-photo-lightbox
└── img (bound `imageUrl`, `alt`)
```

## Data

| Source | Contract | Operation |
| ------ | -------- | --------- |
| Parent | `imageUrl` (required), `alt` | Read |
| Component | `closed: Output<void>` | Emit on Escape |

## State

| Name | Type | Default | Controls |
| ---- | ---- | ------- | -------- |
| Mount | boolean (implicit) | parent-controlled | When mounted, Escape listener is active |

No internal open/closed enum: parent controls presence in DOM or visibility wrapper.

## File Map

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/shared/photo-lightbox/photo-lightbox.component.ts` | Inputs, Escape host listener |
| `apps/web/src/app/shared/photo-lightbox/photo-lightbox.component.html` | Image template |
| `apps/web/src/app/shared/photo-lightbox/photo-lightbox.component.scss` | Viewer geometry (if any) |

## Wiring

- Parent toggles inclusion or visibility; on `closed`, parent should detach or hide the lightbox.
- Do not nest interactive controls that steal Escape without coordinating with this contract.

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ---------------------- | ----------- |
| Image fill | `img` or host per SCSS | parent overlay (if any) | image (non-interactive) | `img` | content | image respects parent bounds |
| Dismiss | N/A (keyboard) | parent | document | host listener | n/a | Escape emits `closed` once per press |

### Ownership Triad Declaration

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| -------- | -------------- | ----------- | ------------ | ------------- |
| Photo render | innermost `img` | parent mount | `img` | ✅ |

## Acceptance Criteria

- [ ] `imageUrl` is required; missing binding is a compile-time error in consumers.
- [ ] Escape key emits `closed` exactly once per keydown while mounted.
- [ ] Component does not call Supabase or map adapters directly.
