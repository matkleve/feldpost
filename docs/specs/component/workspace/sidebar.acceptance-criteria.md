# Sidebar — Acceptance Criteria

Parent: [`sidebar.md`](sidebar.md) · Geometry: [`sidebar.collapse.supplement.md`](sidebar.collapse.supplement.md)

## Structure

- [x] Desktop: fixed left panel with explicit collapse control
- [x] Desktop: `3rem` collapsed → `15rem` expanded width
- [x] Desktop: icon + label when expanded; icon-only leading column when collapsed
- [x] Mobile: bottom tab bar, icons only
- [x] Frosted glass on desktop panel

## Interaction emphasis

- [x] NavLink idle: muted icon + label
- [x] NavLink hover: gold wash + gold ink on host and children
- [x] NavLink active: tertiary nav-ink wash + violet on host
- [x] NavLink focus-visible: hover ink + focus ring
- [x] NavLink disabled: muted, non-interactive
- [x] Account row uses same row shell as nav items
- [ ] Dark mode: frosted glass readable on dark background

## Spacing & collapse invariants

- [x] Panel `padding-inline` is `var(--spacing-1)` in both collapsed and expanded desktop states
- [x] Row grid + media width + row `padding-inline` unchanged across toggle
- [x] Collapsed: row `column-gap` is `0`; label column is `0fr` (mounted, hidden)
- [x] Collapsed: nav link hit target is **32×32px** square (no tall rectangle hover shape)
- [x] Collapsed: avatar circle not clipped (no overflow from label column + gap)
- [x] Labels hidden via opacity/visibility when collapsed; icons do not shift sideways
- [x] Expanded rows reveal labels without icon column jump
- [x] Sidebar width + collapsed row gap/label width + label opacity animate on collapse
- [ ] Mobile: `h-14` bar + safe-area padding per layout spec

## Collapse & persistence

- [x] Collapse preference persists in `localStorage`
- [x] Map `invalidateMapSize` on toggle (not on init)

## Theme & dots

- [x] Theme cycle row with three indicator dots per [`cycle-indicator-dots.md`](../ui-primitives/cycle-indicator-dots.md)

## Keyboard & ARIA

- [ ] Full keyboard roving focus (arrows) — deferred
- [x] `Enter` / `Space` activates focused link
- [x] `aria-label="Main navigation"` on `<nav>`
- [x] `aria-current="page"` on active route

## Deferred (do not implement without spec amendment)

- [ ] Hover-to-expand desktop rail
- [ ] Focus-within auto-expand desktop rail
