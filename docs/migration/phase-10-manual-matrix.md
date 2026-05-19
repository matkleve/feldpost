# Phase 10 — Manual matrix (high-risk mixed surfaces)

**Purpose:** Human browser sign-off for the three highest-risk **Spartan + BEM/SCSS** merge surfaces identified in the CSS migration close-out audit (2026-05-19). Automated gates (`ng build`, `design-system:check`, token `rg` proofs) do **not** satisfy this sheet.

**Parent:** [phase-10-visual-qa.md](./phase-10-visual-qa.md) · **DoD context:** [README § Definition of Done](./README.md#definition-of-done)

**Record results:** Mark **Pass** / **Fail** in [phase-10-visual-qa.md](./phase-10-visual-qa.md) screen checklist and PR notes; link tickets for any **Fail**.

---

## Test environment (all surfaces)

| Setting | Value |
| ------- | ----- |
| Themes | Default (light), `[data-theme="dark"]`, `[data-theme="sandstone"]` |
| Viewports | **375×812** (mobile), **1280×800** (desktop workspace), **1920×1080** (optional wide) |
| Browsers | Chromium (required) + Firefox **or** Safari (one spot-check) |
| Between themes | Hard-refresh after theme toggle to flush CSS variable cache |

---

## 1. Settings overlay (`app-settings-overlay`)

### Spartan components active

| Primitive | Where |
| --------- | ----- |
| `hlmBtn` | Close control, section actions, invite flows |
| `hlmToggleGroup` / `hlmToggleGroupItem` | Appearance (theme mode), language, map units, related segmented rows |
| `hlmSwitch` / `hlmSwitchThumb` | Notifications, map options, telemetry toggles |
| `hlmSelect` | Search bias and other compact selects |
| Tailwind utilities | `flex`, `gap-*`, `size-*`, `min-w-0` on label stacks (e.g. section nav items) |

### BEM / SCSS still live

| Layer | Owner file | Examples |
| ----- | ---------- | -------- |
| `:host` layout tokens | `settings-overlay.component.scss` | `--settings-overlay-width`, `--settings-overlay-left-ratio`, rail geometry |
| BEM blocks | Template + SCSS | `.settings-overlay`, `.settings-overlay__section-item`, `.settings-overlay__section-label`, hairline dividers |
| Invite section | `invite-management-section.component.scss` | `.invite-section__*` alongside `hlmBtn` / `hlmSelect` |

### Visual regression risks

- **Toggle-group vs SCSS:** Segmented rows use CVA chrome; section shell still sets borders/radius via `--settings-interactive-*` — risk of **double border** or **clipped `focus-visible` ring** on `hlmToggleGroupItem`.
- **Switch rows:** `hlmSwitch` inside BEM rows — misaligned thumb/track if row `padding`/`gap` diverges between themes.
- **Rail width:** Inlined overlay ratios (post–Batch 34) — rail too narrow/wide vs nav collapsed rail at **375px**.
- **Sandstone:** `--settings-action-bg-hover` override on `:host-context([data-theme='sandstone'])` — hover wash may read flat or muddy vs light/dark.
- **Z-index / stacking:** Fixed pane vs map, nav, and toast layer — panel must not sit under map chrome.

### Manual test steps

1. Open map view (authenticated). Open settings from nav (gear / settings entry).
2. **375px / light:** Confirm two-column rail + content; section nav icon + title + subtitle **stack vertically** in label area; close button hit target ≥ 44px.
3. Cycle sections: **General → Appearance → Notifications → Map → Search → Data → Account → Invite**. Each section loads without horizontal overflow.
4. **Appearance:** Change theme via `hlmToggleGroup` (light / dark / system / sandstone). Hard-refresh between selections. Confirm selected segment contrast and no collapsed pill track.
5. **Notifications / Map / Data:** Toggle each `hlmSwitch`; confirm thumb animates and state persists after closing/reopening overlay.
6. **Invite:** Open invite UI; exercise `hlmSelect` (role) and `hlmBtn` actions; QR block layout intact at 375px.
7. Repeat steps 2–6 on **dark** and **sandstone**.
8. **1280×800:** Confirm overlay centered/offset from collapsed nav; resize window — no clipped close control or section list.
9. **Firefox or Safari (one theme):** Tab through section nav → first control in content; `focus-visible` ring visible on toggles and switches.

**Pass criteria:** All three themes readable; no clipped focus rings; rail/section layout matches spec intent; no overlay under map.

---

## 2. Upload panel (`app-upload-panel`, `app-upload-panel-item`)

### Spartan components active

| Primitive | Where |
| --------- | ----- |
| `hlmBtn` | Primary/secondary actions, row actions, footer controls |
| `hlmToggleGroup` / `hlmToggleGroupItem` | Location mode, lane switch, view/options pills |
| `hlmMenuItem` / `hlmMenuSeparator` | Row overflow menu (`upload-panel-item`) |
| `hlmPillToggle` (if on host wrapper) | Density shell for toggle rows |

### BEM / SCSS still live

| Layer | Owner file | Examples |
| ----- | ---------- | -------- |
| Panel shell | `upload-panel.component.scss` | `.upload-panel`, `.upload-panel__area`, `.upload-panel__file-list`, dashed drop zone |
| Row items | `upload-panel-item.component.scss` | Thumbnail frame, progress, hover reveal, `--universal-media-slot-radius` host bridge |
| Embedded mode | SCSS modifiers | `.upload-panel--embedded`, list flex/scroll geometry |

### Visual regression risks

- **Toggle vs drop zone:** Pill groups adjacent to dashed intake — selected segment may **collide** with border radius on `.upload-panel__area`.
- **Row hover / thumbnail:** Quiet actions and checkbox reveal depend on SCSS; `hlmBtn` on row must not break hit areas (constitution 44px floor).
- **Menu placement:** `hlmMenuItem` panel at **375px** height — must open **down-first**, not clip under map/upload chrome.
- **Skeleton / progress:** Shimmer uses motion tokens; verify on **dark** (not too bright) and **sandstone** (not muddy).
- **i18n layout:** Long German/Italian strings in action row — no overflow hiding destructive affordance.

### Manual test steps

1. Open map view. Open upload panel (FAB / upload entry per product chrome).
2. **Light / 1280×800:** Empty state — dashed zone, primary CTA `hlmBtn`, subtitle legible.
3. Add 2–3 images (file picker or drag). Confirm row height, thumbnail, progress bar, and lane `hlmToggleGroup` selection state.
4. **Row menu:** Open `more_vert` menu on a row; confirm items clickable; separator visible; menu not clipped at bottom of viewport.
5. **Location mode:** Switch location pill group; map/marker feedback unchanged (no duplicate markers).
6. **Embedded path (if available in test build):** Narrow workspace pane — list scrolls; hover shows selection checkbox; footer icon row aligned.
7. Repeat intake + rows on **dark** and **sandstone** at **375×812** (critical).
8. Remove one file via row action; confirm list reflow and no orphaned focus trap.

**Pass criteria:** Three themes legible; menus and toggles usable at 375px; row hover/selection matches spec; no layout jump when toggling lanes.

---

## 3. Map shell (`app-map-shell`)

### Spartan components active

| Primitive | Where |
| --------- | ----- |
| `hlmPillToggle` + `hlmToggleGroup` / `hlmToggleGroupItem` | Map style switch (top chrome) |
| `hlmBtn` | Upload FAB, context actions, overflow triggers |
| `hlmMenuItem` / `hlmMenuSeparator` | Map and marker context menus |
| `BrnDialog` stack | Lightbox / dialogs launched from shell (if triggered from map) |

### BEM / SCSS still live

| Layer | Owner file | Examples |
| ----- | ---------- | -------- |
| Shell layout | `_map-shell-layout.scss`, `map-shell.component.scss` | Full-screen stack, chrome positioning |
| Style switch pierce | `_map-shell-style-switch.scss` | Rules on `[hlmToggleGroup]` / `[hlmToggleGroupItem]` (vertical radii, density) |
| Upload chrome | `_map-shell-upload.scss` | FAB placement; specificity note vs `hlmBtn` on same node |
| GPS / context menu | `_map-shell-gps-placement.scss`, `_map-shell-context-menu.scss` | |
| Leaflet global | `styles/_map-shell-leaflet-global.scss` | Marker/cluster DOM outside encapsulation |
| Search | `search-bar.component.scss` | BEM search chrome (template may be sparse on `hlm*`) |

### Visual regression risks

- **Toggle piercing:** `_map-shell-style-switch.scss` targets Spartan hosts — risk of **duplicate border-radius** or **hover** unlike settings/projects pill groups.
- **FAB vs upload panel:** `_map-shell-upload.scss` vs `hlmBtn` utilities — wrong z-index or size on **sandstone**.
- **Leaflet markers:** Cluster/badge colors must stay legible on all themes after token migration.
- **Context menus:** Stacking vs settings overlay, workspace pane, dropdown plane (`z-index` 300 class plane).
- **GPS control:** Placement at **375px** — must not overlap style switch or search bar.

### Manual test steps

1. **1280×800 / light:** Load map — tiles, zoom, attribution visible. Pan/zoom smooth.
2. **Style switch:** Select each basemap/style option via `hlmToggleGroup`; only one selected; labels readable; `focus-visible` on keyboard nav.
3. **Markers:** If data present, click marker — popup/context menu; selected/hover cluster styles legible.
4. **Context menu:** Right-click or long-press marker (per product); menu items (`hlmMenuItem`) align; separators render; dismiss on outside click.
5. Open **upload** from FAB; confirm FAB not obscured; map still receives pan gestures outside panel.
6. Open **settings** overlay; confirm map remains visible; no z-index inversion (settings above map).
7. **375×812:** Style switch + search + GPS not overlapping; tap targets ≥ 44px.
8. Repeat 1–7 on **dark** and **sandstone**.
9. **Clustering (if enabled):** Zoom in/out — cluster breakdown without invisible markers.

**Pass criteria:** Map usable on all themes; style switch and menus match token intent; no pierced toggle visual glitches; stacking order correct vs overlays.

---

## Sign-off block

**2026-05-19:** Unfilled — requires authenticated browser session. **Automated option:** `apps/web/e2e/phase-10-matrix.spec.ts` + [`apps/web/e2e/README.md`](../../apps/web/e2e/README.md) (`FELDPOST_E2E_EMAIL` / `FELDPOST_E2E_PASSWORD`). **Manual option:** Cursor Browser or local Chrome per steps below. After each surface passes all three themes, copy results into the **Screen checklist** in [phase-10-visual-qa.md](./phase-10-visual-qa.md).

| Surface | Light | Dark | Sandstone | Tester | Date |
| ------- | ----- | ---- | --------- | ------ | ---- |
| Settings overlay | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | | |
| Upload panel | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | | |
| Map shell | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | | |

**Notes / defects:**

- (link GitHub issues here)
