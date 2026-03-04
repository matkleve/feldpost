# UI Design & Interaction Audit

**Date:** 2026-03-04
**Scope:** All pages and shared patterns — search bar, map page, side panel, upload entry point, photos, groups, settings, account, navigation, and cross-cutting micro-interactions.
**Goal:** 100 ideas and issues across the full UI surface. Ranked by impact tier.

---

## Table of Contents

- [Part A — Deep-Dive: Three Key Interaction Patterns](#part-a--deep-dive-three-key-interaction-patterns)
  - [Pattern 1: Search Bar — From Idle to Result](#pattern-1-search-bar--from-idle-to-result)
  - [Pattern 2: Live Marker Highlighting on Search Term](#pattern-2-live-marker-highlighting-on-search-term)
  - [Pattern 3: Side Panel Hover-Expand Lifecycle](#pattern-3-side-panel-hover-expand-lifecycle)
- [Part B — Full Issue Registry (100 Issues)](#part-b--full-issue-registry-100-issues)
  - [Tier 1 — Critical (Issues 1–20)](#tier-1--critical-issues-1-20)
  - [Tier 2 — High (Issues 21–50)](#tier-2--high-issues-21-50)
  - [Tier 3 — Medium (Issues 51–80)](#tier-3--medium-issues-51-80)
  - [Tier 4 — Low / Nice-to-Have (Issues 81–100)](#tier-4--low--nice-to-have-issues-81-100)

---

# Part A — Deep-Dive: Three Key Interaction Patterns

---

## Pattern 1: Search Bar — From Idle to Result

### States

The search bar lives in the side panel header. It has five distinct states:

```
Idle → Focused (empty) → Typing → Results → Committed
```

### State 1: Idle

- Single pill-shaped input with a search icon on the left.
- Placeholder text: "Search places or photos…"
- No dropdown.

### State 2: Focused, Empty

Dropdown appears immediately beneath the bar. Content:

```
┌─────────────────────────────────┐
│ 🕐  Battersea Power Station      │  ← most recent search first
│ 🕐  Site 14B, Manchester         │
│ 🕐  51.5074, -0.1278             │
│ ─────────────────────────────── │
│ 🔍  Search your photos           │  ← command shortcut row
└─────────────────────────────────┘
```

- Recent searches come from `localStorage` (max 8 stored, 5 shown).
- Each row: clock icon + label. Clicking it commits the search instantly.
- "Search your photos" row opens a filtered Photos page — it is always present as a fallback.
- Keyboard: `↑`/`↓` navigates rows, `Enter` commits, `Escape` closes.

### State 3: Typing

As soon as the user types, the dropdown splits into two sections separated by a visual divider:

```
┌─────────────────────────────────┐
│ 📷  Site 14B — 3 photos          │  ← DB photo/group results (max 3)
│ 📷  Battersea — 1 photo          │
│ 📁  Battersea site group         │  ← group match
│ ─────────────────────────────── │
│ 📍  Battersea Power Station, …   │  ← geocoding result(s) (max 3)
│ 📍  Battersea Park, London       │
└─────────────────────────────────┘
```

**DB results (top section, max 3):**

- Fuzzy-matched against image metadata, file names, group names, project names.
- Label shows match type icon (📷 photo, 📁 group) and a short snippet.
- Results appear after 200 ms debounce (shorter than map viewport debounce — this is a fast typeahead).
- Each row shows a 24×24 px thumbnail on the right.

**Geocoding results (bottom section, max 3):**

- Provider-agnostic geocoding call (same boundary used elsewhere).
- Fires at the same debounce as DB results, in parallel.
- Label shows a place icon and formatted address.
- If geocoding returns no results, the section is hidden entirely.

**Divider:**

- A 1 px `--color-border` line with a label "Places" on the right side (small, `--color-text-disabled`).
- Not shown if either section is empty.

### State 4: Committed

- Typing a place → map flies to the geocoded coordinates and shows a subtle crosshair pin.
- Typing a photo/group match → side panel transitions to show that item's detail.
- The search term stays in the input (not cleared) so the user can refine.
- A × clear button appears inside the input on the right.
- Committed term is added to `localStorage` recent searches (deduped, most-recent-first).

### Keyboard contract

| Key                        | Behaviour                                               |
| -------------------------- | ------------------------------------------------------- |
| `↓` / `↑`                  | Navigate dropdown rows                                  |
| `Enter`                    | Commit highlighted row (or top row if none highlighted) |
| `Escape`                   | Close dropdown, blur input, cancel any partial search   |
| `Cmd/K`                    | Focus the search bar from anywhere on the map page      |
| `Backspace` on empty input | Clear the committed state (unpin crosshair)             |

### Technical notes

- Dropdown is an **overlay** (not a sibling in flow) — `position: absolute` below the input, `z-index` above the map pane.
- DB results use a Supabase `ilike` full-text match on `images.file_name`, `images.metadata`, `groups.name` — single round-trip.
- Geocoding and DB queries fire in parallel; whichever responds first renders its section; the other fills in when ready without re-ordering the list.
- A skeleton row (1 placeholder per section) shows during loading to prevent layout shift.

---

## Pattern 2: Live Marker Highlighting on Search Term

### Concept

While the user is **actively typing** in the search bar (State 3), map markers whose associated metadata contains the current search term light up visually — without waiting for a committed search or a panel open. The map gives instant spatial feedback.

### Visual Treatment

```
Normal marker:     ● (--color-primary, 20 px)
Highlighted:       ● (--color-clay, 24 px, 2 px white ring, drop-shadow spread)
Dimmed (no match): ● (--color-text-disabled, 16 px, opacity 0.4)
```

Transition: `fill`, `r`, and `filter` CSS properties animate in 80 ms on the SVG/canvas layer (Leaflet's `CircleMarker` or a custom SVG icon layer).

### Rules

- Highlighting fires after **150 ms** of no new keystroke (shorter than viewport debounce — this is visual feedback, not a data fetch).
- Only applies to markers **currently in the viewport** (already loaded — no new fetch triggered).
- If the search term is cleared or `Escape` is pressed, all markers return to normal in 80 ms.
- Clusters do not highlight individually — a cluster badge turns `--color-clay` (with count preserved) if at least one of its constituent images matches.
- If no markers match, all dim down and a brief tooltip near the search bar reads "No photos match this term in the current view" — fades after 3 s.
- This feature is **display-only** — it does not filter out non-matching markers. Filtering is a deliberate committed action.

### Implementation approach

- The component holds a `highlightTerm = signal<string>('')` updated at 150 ms debounce from the search input.
- The map layer iterates over rendered markers and calls a `matchesTerm(marker, term): boolean` helper.
- Matching markers get a CSS class or Leaflet icon swap; non-matching markers get a dimmed icon variant.
- On `highlightTerm()` change, only Leaflet icon objects are swapped — no Supabase round-trip.

### Edge cases

- Very common term (e.g., "a") would highlight almost everything — apply a minimum of 3 characters before highlight activates.
- Term matches a group name but not individual photos → no individual marker highlights; group tab in panel pulses once.

---

## Pattern 3: Side Panel Hover-Expand Lifecycle

### States

```
Collapsed strip  →  Hover-expanded  →  Pinned (marker selected)
      ↑                   ↓                      ↓
   mouseenter          mouseleave              × button
```

### Collapsed strip (at rest)

- Width: **14 px**.
- Full viewport height.
- Background: `--color-bg-surface` (slightly lighter than `--color-bg-base`).
- Right edge: 1 px `--color-border`.
- A centred vertical **pill** (40×4 px, `--color-border-strong`, `border-radius: 2px`) gives a visual affordance — similar to a browser scrollbar thumb. It sits at 50 % height.
- Cursor: `col-resize` on hover over the strip (even before expand, to cue interactivity).

### Hover-expanded

- Width: **320 px**.
- Transition: `width 120ms ease-out`.
- Panel fades in content immediately (no wait for transition end).
- Contains: search bar header, scrollable content area (empty until marker selected), bottom user avatar.
- **Stays open** while cursor is anywhere within the 320 px column.
- **Collapses** on `mouseleave` with same 120 ms transition, **unless** `panelPinned = true`.

### Pinned (marker selected)

- `panelPinned` flips to `true` when any marker is clicked.
- Panel stays at 320 px regardless of hover state.
- A **×** close button appears in the panel header top-right.
- Clicking × sets `panelPinned = false` and clears the selected marker — the panel collapses on next `mouseleave` (or immediately if cursor is already outside).

### Leaflet tile reflow

- `map.invalidateSize()` is called inside a `transitionend` listener on the panel element.
- The listener is added once and uses `{ once: true }` to avoid memory leaks.
- During the 120 ms transition the map is slightly clipped — this is acceptable and preferable to a jarring resize.

---

# Part B — Full Issue Registry (100 Issues)

---

## Tier 1 — Critical (Issues 1–20)

These are blockers or near-blockers for MVP. Nothing else has value without these correct.

**#1 — Search bar: empty-state recent searches must be scoped to the user**
Storing recent searches in `localStorage` is fine locally, but if a second user logs in on the same device, they must not see the previous user's searches. Key should be `sitesnap_recent_searches_<user_id>`.

**#2 — Search dropdown must not overlap the map interaction layer**
The dropdown overlay must sit above Leaflet click events (higher `z-index`) but below modal overlays. Define explicit stacking context in global tokens: `--z-dropdown: 400`, `--z-panel: 300`, `--z-modal: 500`.

**#3 — Side panel width must not collapse to 0 on mobile (break to a different layout)**
The hover-expand strip model is desktop-only. On mobile (< 768 px), the panel becomes a bottom sheet with three snap points (handle-only at ~60 px, half-screen, full-screen). If the strip pattern is applied on mobile it would be unusable.

**#4 — Leaflet `invalidateSize()` must fire after panel expand AND collapse**
Both transitions change the map container width. Missing either call leaves grey tiles on the newly revealed map edge.

**#5 — Panel `panelPinned` state must survive the hover-expand transition**
If the user clicks a marker while the panel is hover-open, then moves the cursor outside, the panel must stay open. Race condition: `mouseleave` fires before the click event registers `panelPinned`. Fix: add a 50 ms grace delay on collapse that checks `panelPinned` before executing.

**#6 — Search input must be focusable by keyboard without opening the collapse strip**
`Cmd/K` focuses the search input. If the panel is collapsed at the time, it must expand visually first, then focus the input. The reverse (focusing via `Tab`) should follow the same logic.

**#7 — Committed geocoding result must show a crosshair pin, not a regular photo marker**
Distinguishing geocoded location pins from photo markers is critical — same icon would confuse the user.

**#8 — Nav sidebar must be `aria-` labelled correctly**
`<nav aria-label="Main navigation">`. Each nav item needs `aria-current="page"` on the active item. Keyboard navigation must work without a mouse.

**#9 — Disabled nav items must convey their state to screen readers**
`aria-disabled="true"` and `tabindex="-1"` on greyed-out nav items. Tooltip text "Coming soon" must be exposed via `aria-describedby`.

**#10 — Theme preference must apply before first paint**
Applying `[data-theme]` in `APP_INITIALIZER` (Angular) is too late — the DOM flickers. The theme class must be set in a synchronous `<script>` in `index.html` that reads `localStorage` before Angular boots.

**#11 — Search results skeleton must reserve the same space as real rows**
If skeleton height differs from result row height, the dropdown will visibly shift when results arrive. Use fixed row height (40 px) for both skeleton and real rows.

**#12 — Filter chips strip must always be visible when a filter is active**
A common bug: the chips strip is hidden inside the collapsed filter panel. The chips must render outside the panel at all times (above the map, or in the panel header when expanded) so the user always knows a filter is active.

**#13 — Upload button `z-index` must be above the map but below the panel**
If the panel overlaps the button area during an expansion, the panel must not occlude the upload button trigger. Define: `--z-upload-button: 350`.

**#14 — Photos page grid must not overflow viewport width on narrow screens**
`min` constraint in `grid-template-columns: repeat(auto-fill, minmax(min(180px, 100%), 1fr))` prevents a single column from being wider than the viewport.

**#15 — Group detail navigation must preserve scroll position on back**
If the user opens a group, views images, then navigates back to the groups list, the list should restore its scroll position. Use `ScrollPositionRestoration: 'enabled'` in Angular router config.

**#16 — Account page: delete account flow must call sign-out before navigation**
`deleteAccount()` → `signOut()` → navigate to `/auth/login`. If sign-out is skipped, the Angular session signal holds a stale JWT and subsequent requests fail in confusing ways.

**#17 — Settings theme toggle must immediately update Leaflet tile URL**
Dark mode must swap the map tile URL (`MapAdapter.setTileStyle('dark')`). This call must happen synchronously when the toggle changes, not on next map load.

**#18 — Photo card thumbnail must show a loading skeleton, not a blank white box**
While the signed URL is loading (Supabase signed URL fetch + image download), show a `--color-bg-elevated` placeholder with a subtle shimmer animation. Never show a blank box.

**#19 — Side panel content area must be scrollable, not overflow-hidden**
When a marker with many metadata fields is selected, the panel content must scroll vertically. `overflow-y: auto` on the content region. The header (with search + close) must stay sticky.

**#20 — Search bar result rows must be keyboard-committed with `Enter`, not `Tab`**
`Tab` should move focus to the next result row (standard dropdown behaviour). `Enter` commits the currently focused row. Never use `Tab` as a commit key.

---

## Tier 2 — High (Issues 21–50)

Directly affect user experience in common flows.

**#21 — Recent searches: show a "clear all" button at the bottom of the recents list**
Small text button: "Clear history". Removes all entries from `localStorage` for this user. Confirmation not required — it is reversible by just searching again.

**#22 — Search bar: show a character counter hint when approaching geocoder query limits**
Some geocoding APIs have URL length limits. At 200+ characters, show a gentle hint: "Try a shorter query". Not an error — just guidance.

**#23 — Search dropdown: animate in with a subtle slide-down (not pop)**
`transform: translateY(-4px) → translateY(0)` + `opacity: 0 → 1` in 100 ms. The pop (instant render) feels abrupt at this scale.

**#24 — Highlight term: minimum 3 characters before activating**
Prevent ugly mass-dimming on single-character keystrokes (e.g., typing "a" would dim 95 % of markers).

**#25 — Highlight term: debounce at 150 ms, separate from viewport query debounce (300 ms)**
Two separate debounce timers. Highlight is cheaper (no network round-trip) so it can fire faster.

**#26 — Marker hover tooltip: show thumbnail + image name, not just coordinates**
A 100×75 px thumbnail + the image file name in a `--color-bg-elevated` tooltip card. Much more useful than raw lat/lng on hover.

**#27 — Panel pill affordance must disappear when the panel is expanded**
The pill is a "grab me" hint for the collapsed state. When expanded, it creates visual clutter. Set `opacity: 0` on the pill element when `panelExpanded = true`.

**#28 — Side panel: add a keyboard shortcut to toggle pin (`P` key)**
When the map is focused, pressing `P` pins the panel open. Pressing `P` again unpins (equivalent to ×). Show shortcut in the × button tooltip: "Close panel [P]".

**#29 — Upload button hover: the ghost preview must not be interactive**
The ghost preview of the upload panel (opacity preview on hover) must have `pointer-events: none` so it doesn't accidentally capture clicks meant for the map.

**#30 — Upload panel: show a "Drop anywhere on the map" hint during dragover**
When a file is dragged anywhere over the map pane, show a full-map overlay hint (large dashed border + text "Drop to upload") before the panel animates open.

**#31 — Photos page: empty state CTA must open the upload panel on the map page, not navigate away**
Clicking "Upload your first site photo" should navigate to `/` and programmatically open the upload panel, rather than just navigating away and leaving the user to figure out the rest.

**#32 — Group cover thumbnail: use the most recently added image, not a random one**
Cover = `ORDER BY added_at DESC LIMIT 1` from `saved_group_images`. Document this selection rule.

**#33 — Group rename: `Enter` key commits; `Escape` cancels and restores the previous name**
Inline rename (Notion-style). There is no "Save" button — `Enter` is the only commit action. The previous name is stored in a local variable before the input opens.

**#34 — Settings: dark mode toggle must show three options, not a binary checkbox**
`Light` / `Dark` / `System (default)`. Segmented control (three pills), not a checkbox.

**#35 — Account page: password change form must validate that new password ≠ current password**
Client-side check: if new password equals the stored value (which it cannot — it is hashed), skip. But if the user types the same string they just typed as "current password", show a warning: "New password should be different."

**#36 — Account page: email change must show a "Confirmation email sent" inline message**
After calling `updateUser`, do not navigate away. Show an inline success banner: "Check [new@email.com] for a confirmation link."

**#37 — Nav sidebar: show a user avatar at the bottom as a shortcut to `/account`**
Small circular avatar (initials or profile picture) at the very bottom of the nav sidebar. Clicking navigates to `/account`. Matching the Linear / Claude sidebar pattern.

**#38 — Nav sidebar: active page indicator should be a filled background pill, not a border-left bar**
A softly rounded background fill (`--color-bg-elevated`, 4 px radius) behind the icon is less aggressive than a 3 px left-border indicator. The icon itself uses `--color-primary` when active.

**#39 — Map crosshair pin (geocoded result): dismiss automatically on map pan**
When the user pans significantly (> 100 px movement), the crosshair pin fades out. It was just a "you are here" marker — once the user has panned away, it has served its purpose.

**#40 — Search: keyboard `Escape` must blur the input AND collapse the dropdown**
Currently easy to miss: pressing `Escape` once should both clear focus and close the dropdown. If the user pressed `Escape` while focus is on a dropdown row, first focus returns to the input, then next `Escape` closes fully.

**#41 — Photos page: filter panel open/close must not cause grid layout shift**
The filter panel is a fixed-height collapsible region. Use `max-height` animation (0 → content height) rather than inserting the element in/out of flow.

**#42 — Photos page: pagination must load on scroll (infinite scroll), not a "Load more" button**
Use an `IntersectionObserver` sentinel at the bottom of the grid. When it enters the viewport, fire the next cursor page. "Load more" buttons interrupt scroll momentum.

**#43 — Photo card: selection checkbox must be in the DOM at all times (just invisible at rest)**
`opacity: 0` not `display: none`. This avoids layout shift when hovering and keeps the checkbox accessible to keyboard users at all times.

**#44 — Bulk select mode: entering it via click also selects the clicked card**
Click-on-checkbox → enter bulk select mode AND mark that item as selected. Not: enter mode, then click again to select. That is an extra tap.

**#45 — Group detail: breadcrumb navigation — "Groups > [Group name]"**
A two-level breadcrumb at the top of the group detail view. Clicking "Groups" navigates back. The group name is the active/current level.

**#46 — Search bar placeholder text must change contextually on different pages**
On the map page: "Search places or photos…". On the Photos page: "Search photos…". On the Groups page: "Search groups…". The placeholder is a `signal` driven by the active route.

**#47 — Side panel header must be sticky within a scrollable panel**
If the panel content is long enough to scroll, the header (search bar + close button) stays fixed at the top. `position: sticky; top: 0; background: --color-bg-surface`.

**#48 — Map page: show a "back to my location" button after the user has panned far**
A small button in the top-left of the map pane: "⌖ My location". Appears after the user has panned > 2 km from their GPS location. Clicking calls `map.setView(userLocation, currentZoom)`.

**#49 — Settings page: map tile style picker must show a preview thumbnail**
Even if only one tile style is available in MVP, the UI component should show a 100×60 px thumbnail of the tile style with a label. This makes the slot meaningful and avoids a bare "Coming soon" placeholder.

**#50 — Error states must use a banner inside the panel, not a browser `alert()`**
All error messages (failed DB fetch, geocoding failure, upload error) render as inline banners (`--color-danger` background, dismiss ×) inside the relevant container. `alert()` is never used.

---

## Tier 3 — Medium (Issues 51–80)

Improve quality and polish in non-critical paths.

**#51 — Side panel collapsed strip: add a subtle pulsing animation on first load**
On the very first visit (tracked in `localStorage`), the strip pill pulses twice (scale 1 → 1.3 → 1, 600 ms each) to hint "hover me". Never repeats after the user has expanded the panel once. Classic "coachmark" without the intrusive overlay.

**#52 — Photos page: sort control (date desc / date asc / name)**
A compact dropdown in the top-right of the photos page: "Sorted by: Newest first". Changes `ORDER BY captured_at DESC` vs. `ASC` vs. `file_name ASC`.

**#53 — Photo card: show the GPS indicator badge**
A small pin icon badge (12 px) on the card thumbnail corner. Green = has GPS. Orange = no GPS (manually placed). This mirrors the marker correction indicator pattern from `design.md`.

**#54 — Map page: show a loading indicator when markers are being fetched for the viewport**
A thin `--color-primary` progress bar at the top of the map pane (like a YouTube or Linear page load bar). Appears when the viewport query is in-flight, disappears on complete. Not a spinner — it does not block interaction.

**#55 — Map page: show a "Filters active" badge on the filter panel toggle when filters are applied**
If any filter is active and the filter panel is collapsed, the toggle button (or filter icon) shows a filled dot badge (`--color-clay`, 6 px circle). Clicking it opens the filter panel.

**#56 — Search dropdown: show a "No results" state gracefully**
If both DB and geocoding return nothing: single row, muted text: "No results for '[term]'". No icon. No error styling. Not an error — just an honest empty state.

**#57 — Side panel: accessible close button size**
The × button in the panel header must be at least 44×44 px hit area (padding extends it). Visual size can be smaller (20×20 icon) but the `padding` must extend the tap target.

**#58 — Photos page: multi-select action bar must list the count selected**
"3 selected · [Add to group] [Delete]" floating at the bottom. The count updates live as items are checked/unchecked.

**#59 — Group create: the "+ New group" action should create the group and immediately enter the rename flow**
On "+ New group" click: a new group card appears at the top of the list with the name in an active text input, pre-filled with "Untitled group", all text selected. User types the name and presses `Enter`.

**#60 — Nav sidebar: show a badge count on Photos nav item equal to the user's total image count**
Optional and dismissible. The count helps orient the user on the nav. Subtle: small grey text badge, not a coloured notification bubble.

**#61 — Account page: show user metadata (created_at, organization)**
A read-only section: "Member since [date]" and "Organisation: [org name]". Small, `--color-text-secondary`. Not editable — informational only.

**#62 — Map page: cluster click at a zoom level that would separate markers should zoom smoothly**
Use Leaflet's `flyTo` with a 400 ms animation to the cluster's bounding box, rather than an instant `setView`. The smooth fly-in gives spatial context.

**#63 — Search recent history: show a relative timestamp next to each item**
"2 hours ago", "yesterday", "3 days ago" — right-aligned in `--color-text-disabled`. Helps users identify which recent searches are relevant.

**#64 — Upload panel: the "file picker" button must also accept folder drop on desktop**
On desktop drag: detect `DataTransferItem.webkitGetAsEntry()` to check if the entry is a directory. If so, recurse into it and enqueue all image files found. See `docs/folder-import.md` for spec.

**#65 — Side panel: content must use property-style rows (Notion pattern) for image metadata**
Two-column rows: label (`--color-text-secondary`, left) and value (`--color-text-primary`, right). No separate "Edit" button — clicking the value opens an inline input. Consistent with `design.md §2.10`.

**#66 — Photos page: card grid gap should use `--spacing-3` (12 px), not browser default**
Explicit spacing token prevents inconsistency across breakpoints. The gap should reduce to `--spacing-2` (8 px) on mobile.

**#67 — Map page search bar: `Cmd/K` shortcut must not conflict with browser defaults**
`Cmd/K` on macOS opens a link dialog in some browsers. Use `Cmd/Shift+F` or just rely on the `F` shortcut (which is common in map apps for "find"). Document the chosen shortcut.

**#68 — Theme: `prefers-reduced-motion` must disable all transition/animation**
Any `transition` or `@keyframes` in the global stylesheet must be wrapped in `@media (prefers-reduced-motion: no-preference)`. Side panel transitions, search dropdown animations, and marker highlight transitions are all affected.

**#69 — Group cards: show the last-updated relative time, not an absolute date**
"Updated 2 days ago" is more useful than "2026-02-28" in a groups list context.

**#70 — Map page: the search bar crosshair pin must use a different icon from photo markers**
A crosshair / target icon (not the teardrop photo pin). Could be a simple `+` in a circle. Must be visually distinct at a glance.

**#71 — Side panel: "Return to selected" affordance when user has panned away from a pinned marker**
If `panelPinned = true` and the selected marker is outside the current viewport, show a small button at the bottom of the panel: "↩ Return to photo". Clicking flies the map back to the marker coordinates.

**#72 — Photos page: selecting a photo card should optionally show it on the map**
A "Show on map" action in the card context menu (`⋯`). Navigates to `/` and calls `map.flyTo(imageCoords, zoom: 17)`. The side panel opens and shows that image's detail — effectively a deep link into the map view.

**#73 — Settings page: add a "Reset all settings" link at the bottom**
Text-only tertiary button: "Reset all settings to defaults". Clears `localStorage` settings keys and reloads the page. Requires a single inline confirmation click ("Are you sure? Confirm"). No modal.

**#74 — Upload button: use `--color-clay` fill with a white upload icon, matching the design token spec**
The upload button is the only persistent CTA in the map pane. It must use `--color-clay` (not `--color-primary`) to differentiate the upload action from navigation/selection actions. See `design.md §3.1`.

**#75 — Photos page: the filter panel must show the current result count as it updates**
"Showing 47 photos" (or "Showing 47 of 312 photos" when a filter is active) in the filter panel footer. Updates in real-time as filters change.

**#76 — Map page: search bar must show a spinner during the geocoding request**
Small spinning indicator (12 px, `--color-text-disabled`) inside the search input on the right (left of the × button) while any async result is pending. Disappears when both DB and geocoding respond.

**#77 — Account page: "Change email" must not immediately replace the current email**
Supabase `updateUser` sends a confirmation to the new address. The current email stays active until confirmation. The UI must reflect this: display "New email pending confirmation: [new@email.com]" until the user confirms.

**#78 — Nav sidebar: tooltips must only appear when the sidebar is in its narrow (icon-only) form**
If the sidebar were ever to expand to a wide labeled form (future feature), tooltips would be redundant. The tooltip `aria-hidden` should be set based on whether the label is already visible.

**#79 — Map page: pressing `Escape` while in placement mode must be handled before any other handler**
Placement mode adds a global `keydown` listener. `Escape` cancels placement. This listener must be added with `capture: true` and removed on cancel/complete so it does not leak or conflict with panel close (also `Escape`). Priority: placement cancel > panel close > dropdown close.

**#80 — Groups page: drag-and-drop reorder of group cards**
Allow the user to reorder groups by dragging cards. Persisted order stored in a `display_order` column on `saved_groups`. Use pointer-event drag (consistent with other drag interactions in the app). This is a medium-effort polish item for post-MVP.

---

## Tier 4 — Low / Nice-to-Have (Issues 81–100)

Worth logging, revisit after MVP ships.

**#81 — Search bar: support `lat,lng` raw coordinate input**
Detect the pattern `^-?\d+\.\d+,\s*-?\d+\.\d+$`. If matched, skip geocoding and fly straight to those coordinates.

**#82 — Side panel: swipe-to-close gesture on mobile**
On mobile, the panel is a bottom sheet. A downward swipe gesture (pointer velocity > threshold) collapses it. Use the same pointer-events approach as the direction cone editing.

**#83 — Marker highlight: animate highlighted markers with a brief "pop" scale**
On first highlight, scale from 1 → 1.3 → 1 (200 ms). Subsequent re-highlights while typing do not re-animate (debounce animation separately from colour change).

**#84 — Photo card: long-press on mobile enters bulk-select mode**
400 ms long-press (via `pointerdown` timer) on a photo card selects it and enters bulk-select mode. Consistent with how most mobile gallery apps work.

**#85 — Upload panel: show a total file count and total size when multiple files are queued**
Footer row below the queue: "5 files · 28.4 MB". Updates as files complete or are removed.

**#86 — Photos page: "jump to date" date picker shortcut**
A calendar icon button in the filter panel that opens a date picker directly. Complementary to the slider range control — for users who know the exact date.

**#87 — Map page: show a "Zoom in to see individual photos" notice at low zoom levels**
When zoom ≤ 10 and clusters dominate, show a brief dismissible banner: "Zoom in to see individual photos." Disappears after the user zooms in once or dismisses.

**#88 — Settings page: export all my data**
Post-MVP. A button "Export my data (JSON)" that triggers a Supabase Edge Function generating a ZIP of all image records and metadata. Placeholder button (greyed out) in MVP with "Coming soon" tooltip.

**#89 — Account page: show total upload storage used**
"Using 340 MB of storage." Read from Supabase Storage metadata. Purely informational. Below the email field.

**#90 — Nav sidebar: keyboard shortcut hints in tooltips**
Each nav tooltip: "Map [G then M]", "Photos [G then P]", "Groups [G then G]". Linear-style `G`-prefixed shortcuts. These are post-MVP but the tooltip slots should be designed now.

**#91 — Groups page: group card shows a mini 3-photo collage as cover**
Instead of a single cover thumbnail, show three overlapping thumbnails arranged in a slight fan (like iOS album covers). More visually interesting; technically a simple stacked `position: absolute` arrangement.

**#92 — Search dropdown: highlight the matching characters in result labels**
The substring that matched the search term is rendered in `font-weight: 600` within the result label. Standard autocomplete pattern. Helps users confirm the match.

**#93 — Photo detail in side panel: swipe left/right on the thumbnail to navigate to adjacent photos**
When two or more photos are near the selected marker, swipe gestures on the thumbnail cycle through them. ← / → arrow keys on desktop. Post-MVP.

**#94 — Map page: when upload is complete, briefly zoom to the new marker**
After a successful upload (with GPS), the map performs a short `flyTo` of 300 ms to the new marker's coordinates if it is not already in the viewport. Gently orients the user to where their photo was placed.

**#95 — Side panel: show a "similar photos nearby" section at the bottom of a single-image detail view**
Thumbnails of the 3 nearest images (by PostGIS distance) below the metadata. Small 48×48 px thumbnails in a horizontal row. Clicking one opens that image's detail.

**#96 — Upload button: subtle pulse animation when `dragover` event is active on the map pane**
While the user is hovering with a file dragged over the map pane (before the panel opens), the upload button pulses (scale 1 → 1.1 → 1, 400 ms loop). Draws the eye to where the drop action will be handled.

**#97 — Map page: a "Copy link to this view" button**
In the map pane top-right area (near the upload button), a small share icon copies a URL that encodes the current map bounds and any active filters. `?bounds=...&filter=...`. Recipients land on the exact same view. Post-MVP.

**#98 — Photos page: group the grid by month/year when sorted by date**
Sticky section headers ("February 2026", "January 2026") between grid rows based on `captured_at`. Only appears when the sort is date-based. A nice temporal landmark for large collections.

**#99 — Side panel: when no marker is selected and the panel is hover-open, show a "recent uploads" list**
Three most-recently-uploaded images (thumbnail + time label) as a quick-access default content state. Gives the panel purpose even when nothing is selected. Replaces an empty white box.

**#100 — A persistent "what's new" indicator: a small dot on the nav sidebar when there are unseen features after an update**
Post-MVP. A single pixel dot (`--color-clay`) on the nav sidebar icon for the page that received a new feature. Disappears on first visit to that page. Never used for non-feature-related notifications.
