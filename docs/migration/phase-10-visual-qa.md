# Phase 10 — Visual QA & Polish

**Status:** **Wave P4** ([migration README](./README.md#next-wave-post-recovery-queue--2026-05-18)) — **In progress (partial manual QA, 2026-05-19)** — 42 findings logged across two live browser passes (nav/search, upload panel, workspace pane, media page, projects page, settings overlay, nav sidebar); geolocation P1 + workspace pane P1 + media render P1 confirmed. Automated gates pass. Three-theme matrix + remaining screens still **open**. Revised estimate: **~20 % complete**. See [§ Manual QA pass (2026-05-19) — partial](#manual-qa-pass-2026-05-19--partial) and [§ Part 2](#manual-qa-pass-2026-05-19--part-2) for full finding tables.

**Goal:** Every primary **screen** and **overlay** looks correct on **all three themes** (`default` / light, `[data-theme="dark"]`, `[data-theme="sandstone"]`). **No new** `::ng-deep` escapes. **No** visual regressions against spec intent (field-first, map-primary, calm confidence).

**Inputs:** Element specs under `docs/specs/`, `docs/design/state-visuals.md`, `docs/design/constitution.md`.

---

## Preconditions

- `npm run design-system:check` and `ng build` green on the branch under test.
- Phase 7 token work complete (otherwise false positives from legacy colors).

---

## Manual QA pass (2026-05-19) — partial

**Context:** First live human browser session on Phase 10. User performed a spoken-German voice QA pass (transcribed) covering the map-shell nav/search area and the upload panel. Three-theme matrix and remaining screen rows are **not yet covered** — this pass addresses only the surfaces exercised.

**% estimate revision:** 16 confirmed actionable findings across search bar, nav toggle group, upload panel, and geolocation. Prior automated-gates-only estimate was optimistic. Revised estimate: **~35 % complete** toward Phase 10 close-out (automated gates pass; manual visual polish and i18n gaps remain). *Further revised to ~20 % after Part 2 pass — see [Part 2 section](#manual-qa-pass-2026-05-19--part-2).*

| # | Area | Finding | Severity | Phase / Owner |
|---|------|---------|----------|---------------|
| 1 | Nav — toggle group | Container has grayish background; doesn't match white/light navbar + sidebar. Active icons should be primary dark orange; inactive icons light-orange variant. | P2 | Phase 10 — migration polish |
| 2 | Nav — search bar | Browser-default focus outline on search input. Should use design-system focus ring; remove browser ring. | P2 | Phase 10 — a11y / design system |
| 3 | Nav — search bar | Placeholder text "Search Address or Project" stays in English regardless of locale (i18n missing). | P2 | Phase 10 — i18n |
| 4 | Nav — search bar | Placeholder text is flush-left but the dropdown/search indicator is positioned further right — misalignment. | P3 | Phase 10 — search bar layout |
| 5 | Nav — search bar | Search results dropdown has excess right padding (scrollbar placeholder from another context). No scrolling needed on mobile. | P3 | Phase 10 — search bar layout |
| 6 | Nav — search bar | Clear (✕) button inside search input has no hover state / highlight. | P3 | Phase 10 — search bar UX |
| 7 | Nav — GPS / geolocation | "Use my location" always centers map at wrong location ("Gleisbergteich" and vicinity). Consistent offset regression present since 2026-05-18. | P1 | Phase 10 — geolocation service |
| 8 | Upload FAB | Upload floating-action-button icon is not visually centered. | P3 | Phase 10 — upload FAB |
| 9 | Upload FAB | Upload FAB has no box-shadow / elevation. | P3 | Phase 10 — upload FAB |
| 10 | Upload — toggle group | Location-required / not-required toggle group at the bottom clips / overflows its container. | P2 | Phase 10 — upload panel |
| 11 | Upload — toggle group | Three visible visual layers: toggle options → gray toggle container → outer container. Gray layer is undesirable; should match sidebar light background. | P2 | Phase 10 — upload panel / migration polish |
| 12 | Upload — toggle group | Outer container around toggle group lights up light-orange on hover — unexpected; not in spec. | P3 | Phase 10 — upload panel |
| 13 | Upload — i18n mixing | Multiple strings in the upload panel are English in DE locale: "Upload File", "Upload Follow", "Location required / Location not required", "Queue hochgeladen issues" (mixed). | P2 | Phase 10 — i18n |
| 14 | Upload — row | Non-image file upload rows (PDF, PowerPoint, etc.) show no file-type icon in the thumbnail slot; currently empty. | P2 | Phase 10 — upload panel |
| 15 | Upload — row | Tag label appears **below** the upload row item instead of overlaid or inline. | P2 | Phase 10 — upload panel |
| 16 | Upload — panel background | Upload panel background color doesn't match the sidebar / shell background. | P3 | Phase 10 — migration polish |

**Surfaces not covered in this pass:** Login/Register/Reset, Projects views, Media list/grid, Settings overlay sections, Workspace pane, Dialogs, Photo lightbox, three-theme variants (dark / sandstone), 375 px mobile viewport.

---

## Manual QA pass (2026-05-19) — Part 2

**Context:** Second live human browser session on Phase 10. User continued spoken-German voice QA (transcribed) covering workspace pane open/close, media page, projects page, settings overlay, and navigation sidebar. 26 additional findings logged across five surfaces. % estimate revised further downward: **~20 % complete** (core interaction regressions on workspace pane and media page dominate; projects page and nav sidebar have structural gaps beyond polish).

**GitHub issues created from this pass:** see Notes column for issue links.

| # | Area | Finding | Severity | Notes |
|---|------|---------|----------|-------|
| W1 | Workspace pane | Pane only opens to ~50% width when dragging; won't open fully | P1 | Core drag/resize gesture broken — see GH issue |
| W2 | Workspace pane | Drag-to-close gesture broken | P1 | Groups with W1 |
| W3 | Workspace — toolbar | View toggle group (grid/list/etc.) options invisible / not rendering | P2 | Rendering issue; options exist but are not visible |
| W4 | Workspace — toolbar | View toggle group clipped/hidden after Filter/Sort/Grouping dropdowns in toolbar overflow | P2 | Toolbar overflow — toggle group cut off |
| W5 | Workspace — toolbar | UX suggestion: on tight toolbar, replace clipped toggle group with single cycling button (current → next view) | P3 | Enhancement only; not a bug |
| W6 | Workspace — upload panel | Upload panel reuses map sidebar components; needs workspace-specific redesign (more horizontal space available) | P3 | Design gap — no workspace upload panel spec |
| N1 | Nav sidebar | Stale i18n: after switching from Italian to German, sidebar shows "Karte Medium" (Italian) mixed with German "Projekte" | P2 | i18n state not reset on language switch |
| N2 | Nav sidebar | Account name missing in sidebar bottom section | P2 | Missing user data binding |
| N3 | Nav sidebar | Active nav item hover treatment inconsistent: hover on active item → only text stays orange, icon loses consistent treatment; icon + text should always share same color state | P3 | CSS state specificity or missing hover rule |
| M1 | Media page — toolbar | Toolbar wraps unexpectedly: "Kopieren" (Copy) moves to second row despite available space | P2 | Flex/overflow issue in toolbar layout |
| M2 | Media page | Media items fail to render correctly in main view | P1 | Primary content view broken |
| M3 | Media page | "Zeilen" (rows/list) view shows single large image; feature not fully implemented | P2 | Incomplete view implementation |
| M4 | Media page | Clicking an image does not open workspace pane | P1 | Core click-to-detail interaction broken |
| M5 | Media page | Upload FAB not persistent — should always be visible in top-right of content area (not inside workspace pane) | P2 | Same persistent FAB pattern as side menu |
| P1 | Projects page | Page missing expected layout / structural breakdown | P3 | Incomplete page |
| P2 | Projects page | "Alle / Archiviert" toggle group in top-left is poorly styled | P3 | Toggle group styling |
| P3 | Projects page | "Neues Projekt" button incorrectly formatted | P3 | Button style regression |
| P4 | Projects page | Project cards need complete redesign; user explicitly requests full rebuild, not incremental patch | P2 | **Do not patch current cards** — mark for full rebuild |
| P5 | Projects page | Filter dropdown has excess right padding (scrollbar placeholder duplication) | P3 | Same pattern as finding #5 in Part 1 — see existing issue #49 if applicable |
| P6 | Projects page | Project color picker button does not work | P2 | Interaction broken |
| P7 | Projects page | Clicking a project card should open workspace panel (project detail view missing) | P2 | Workspace panel missing project detail view |
| S1 | Settings overlay | Section highlight has square corners; should be rounded | P3 | Corner-radius token not applied |
| S2 | Settings overlay | Section highlight bleeds over white section background, making boundary visible incorrectly | P3 | Paint-order / z-index overlap with section bg |
| S3 | Settings overlay | Language option flag icons missing (English 🇬🇧, Deutsch 🇩🇪, Italiano 🇮🇹) | P3 | Missing icon assets or wiring |
| L1 | Nav sidebar | "Media" incorrectly translated to "Medium" (Italian-form); should always be "Inhalte" in German | P2 | i18n key error — "Media" ≠ "Medium" |
| L2 | Nav sidebar | Media nav icon should be an elements/content icon, not camera icon | P3 | Wrong icon asset |
| L3 | Settings / routing | Opening Settings from sidebar while on map route opens Settings at `/map/settings`; should be route-independent (`/settings`) | P2 | Routing issue — settings route should not inherit parent route context |

**Spec gaps identified in this pass:**

- **Workspace pane open/close gesture** — no spec for the drag-resize interaction contract (open percentage, min/max width, close threshold). Needs spec before fix.
- **Workspace upload panel** — no workspace-specific upload panel spec; current implementation reuses map-sidebar components without adaptation.
- **Project cards** — user has requested full rebuild; existing spec (if any) should be archived, not patched. Confirm before any agent attempts card work.
- **Persistent upload FAB** — FAB placement spec for media page context is absent or incomplete; needs clarification on whether FAB is a global shell element or per-page.
- **Project detail in workspace pane** — workspace pane spec does not cover project detail view; needs new spec slice before implementation.

---

## 2026-05-18 post-wave: Batch 49 and docs

**Context:** Phase **7 Batch 49** removed **`--action-*`** names from the legacy bridge file **before** Batch **50** retired it; **`apps/web/src/styles/_legacy-design-tokens.scss`** is **absent** from the tree after Batch **50** (verify with **`rg 'legacy-design-tokens|_legacy-design-tokens' apps/web`** → **0**). **Parallel** **`docs/specs/**`** and **`docs/design/**`** sweeps landed the same window — treat visuals as **token-first** at callsites, not bridge reintroductions.

**Automated smoke log (same wave):** [`reports/phase-10-migration-smoke-gates-2026-05-18.md`](./reports/phase-10-migration-smoke-gates-2026-05-18.md).

**Manual screen matrix / tight smoke (agent gap log, 2026-05-18):** no interactive browser pass in this slice — documented honestly in [`reports/phase-10-manual-visual-matrix-gap-2026-05-18.md`](./reports/phase-10-manual-visual-matrix-gap-2026-05-18.md) (checkboxes below unchanged until a human run).

**Automated gates re-run (2026-05-19 — agent pass):** `npm run design-system:check` → exit **0** (registry valid, panel MQ audit passed, visual-behavior guard passed); `cd apps/web && npx ng build` → exit **0**; CommonJS warnings only (leaflet, jszip, qrcode, heic2any — unchanged from baseline); `styles` chunk: **`styles-5XVSRT65.css | styles | 80.75 kB | 11.60 kB`**; `::ng-deep` in `apps/web/src --glob '*.scss'` → **0 active pierce rules** (1 comment-only in `_map-shell-leaflet-global.scss`). No new budget warnings vs prior baseline.

**Manual matrix execution (2026-05-19 — close-out attempt):** [`phase-10-manual-matrix.md`](./phase-10-manual-matrix.md) was **not** executed in a browser in this session. A coding agent **cannot** satisfy § [Acceptance criteria](#acceptance-criteria) (“browser + three themes required”) or record **Pass** on the screen checklist without an authenticated visual run. **Automated preflight only:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0** (CommonJS warnings only). **Formal migration close-out remains blocked** until a human completes the matrix sign-off table in `phase-10-manual-matrix.md` and marks the relevant **Screen checklist** rows below **Pass** (or **Fail** + ticket). Dev server for manual run: `cd apps/web && npx ng serve` (default `http://localhost:4200/`).

**Playwright matrix (2026-05-19):** `apps/web/e2e/phase-10-matrix.spec.ts` — structural checks + screenshots for **map-shell**, **upload-panel**, **settings-overlay** × **light / dark / sandstone** × desktop + mobile viewports. Run: `cd apps/web && npx playwright install chromium` (once), then `export FELDPOST_E2E_EMAIL=… FELDPOST_E2E_PASSWORD=… && npm run e2e:phase10` (see [`apps/web/e2e/README.md`](../../apps/web/e2e/README.md)). Agent runs without credentials → **18 skipped** (not Pass). After a green run, review `e2e/results/*.png`, then mark checklist rows **Pass** (Playwright does not replace judgment on subtle theme polish).

**Related doc-only audits:** settings overlay [sections/layout](./reports/settings-overlay-sections-layout-audit-2026-05-17.md), [Notion-adjacent UX](./reports/settings-overlay-notion-adjacent-ux-2026-05-18.md) — indexed from [migration README](./README.md#where-detail-lives).

**Tight smoke (add to Phase 7–8 merges / pre-release if not already exercised above):**

- [ ] **Dropdowns / menus:** Open a **toolbar** and a **workspace** anchored menu on **375px** height; confirm **down-first** placement, viewport clamp, and **stacking** vs map/rails per [`dropdown-system.md`](../specs/component/filters/dropdown-system.md#open-time-stacking-owner-normative); menu row **hover/active** reads correctly on **dark** and **sandstone** without relying on removed **`--action-*`** bridge rows.
- [ ] **Settings overlay:** Rail width, outer padding, **Invite** + **Appearance** segmented rows, and hairline dividers match intent on all three themes after bridge cleanup + doc sync (no “flat” or zero-height separators).
- [ ] **Projects — card view:** Card chrome, **muted** secondary lines, and **hover / `focus-visible`** on cards and actions stay legible on **dark** and **sandstone**; no collapsed pill tracks where full-width toggles apply.
- [ ] **Workspace — media detail / metadata:** Metadata block typography and **captured-date** (or equivalent) editor: labels, borders, and section rhythm on **light / dark / sandstone**; no horizontal overflow at **375px** in the detail stack.

---

## High-risk migration spot-check

Use this list **during** Phase 7–8 merges and before release; it complements the full **Screen checklist** below. Targets: **map-shell Leaflet hoist**, **settings overlay rail / inlined overlay tokens**, **`hlmPillToggle` / `hlmToggleGroup`** (settings, projects, map style switch), and **three-theme** smoke.

**Map shell & Leaflet global hoist (`app-map-shell`, `_map-shell-leaflet-global.scss`)**

- [ ] Leaflet map, zoom, and attribution render; control chrome matches pre-hoist baseline (no double styles / missing icons).
- [ ] Marker states (default, selected, hover, cluster badge) stay legible on **light**, **dark**, and **sandstone**; no token regression on map canvas vs UI chrome.
- [ ] Radius / distance UI tied to the map (search radius, rings, or similar) keeps **hit targets**, labels, and focus rings aligned after layout/token changes.
- [ ] Workspace split / resize: map reflows without clipped overlays; z-order vs rails, settings, and dialogs matches spec intent.

**Settings overlay rail & inlined overlay tokens**

- [ ] Fixed rail width, outer padding, and close control alignment match spec after **`--overlay-rail-left-*`** (and related) bridge removal / SCSS inlining.
- [ ] Lead / section dividers read as intentional hairlines or borders (no zero-height or “disappeared” separators).
- [ ] Scrolled tab content: no accidental horizontal overflow at **375px**; field rows and invite/QR blocks stack as expected.

**`hlmPillToggle` / `hlmToggleGroup` (settings, projects, map style switch)**

- [ ] Settings (e.g. Appearance, segmented rows): **single** selection within each group; `focus-visible` ring not clipped by overflow.
- [ ] Projects view mode (table vs card or equivalent): selected segment and idle track match token intent on all themes.
- [ ] **Map style switch** (`_map-shell-style-switch` / pill group): every option reachable; selected vs idle contrast matches **Token theme checklist** below.
- [ ] Full-width pill groups: value column fills where **`--hlm-pill-toggle-width: 100%`** (or equivalent) is applied—no collapsed tracks.
- [ ] **A11y:** `aria-pressed` / `role="switch"` (or correct primitives) for boolean rows; no decorative-only toggles for real state.

**Upload panel** (`features/upload`; [design audit](./reports/upload-panel-design-audit-2026-05-17.md))

- [ ] **Three themes:** intake surface, dashed drop zone, lane `hlmPillToggle`, row cards, location-mode pill — borders and muted text on **dark** and **sandstone** (no muddy hover/focus).
- [ ] **i18n:** project dialog confirm/cancel are locale-driven (not hardcoded German); intake title/subtitle/actions use keyed copy for non-English locales.
- [ ] **Row hover:** thumbnail visibility vs duplicate shortcut — behavior matches reconciled spec/triage (see [upload-panel.feedback-triage.md](../specs/component/upload/upload-panel.feedback-triage.md)).
- [ ] **Embedded mode:** selection checkboxes on hover/focus; bulk footer icon row + destructive affordance for remove.
- [ ] **Row menu:** `more_vert` panel opens down-first with viewport clamp; no clipped menu at 375px height.

**Theme smoke (`default`, `[data-theme="dark"]`, `[data-theme="sandstone"]`)**

- [ ] Re-run the bullets above on each theme; **hard-refresh** between theme toggles in dev to avoid stale CSS variables.
- [ ] **Dark:** text on `muted` surfaces; map markers and pill tracks remain distinguishable from the map background.
- [ ] **Sandstone:** borders, muted fills, and focus rings stay crisp (not muddy); pill selected segment still reads clearly.

---

## Environment setup

- **Three themes:** exercise `ThemeService` (or equivalent) toggles; hard-refresh between runs to avoid stale CSS variable cache during development.
- **Viewports:** at minimum **375×812** (mobile nav), **1280×800** (desktop workspace + map), **1920×1080** (projects table).
- **Browsers:** Chromium + one **Firefox** or **Safari** spot-check for focus rings and overlay clipping.

---

## Stacking sanity

Cross-surface paint order is easy to regress during token or layout refactors. QA should **name the owning contract** (spec + host), not ad-hoc `z-index` tweaks on wrappers.

- **Menus / anchored shells:** Treat open-time elevation per [`dropdown-system.md`](../specs/component/filters/dropdown-system.md#open-time-stacking-owner-normative) — the **dropdown shell host** owns stacking for that anchored surface; do not “fix” overlap by stacking parents or duplicate token bindings.
- **Map canvas vs chrome:** Leaflet and related globals are hoisted under **`app-map-shell`**; confirm map tiles, controls, and in-map UI still sit in the **intended** order relative to rails, panels, and floating shells after hoist or token edits.
- **Upload intake vs menus:** With the upload flow open, open row/toolbar menus and anchored panels; nothing should disappear under the map, under the wrong rail, or behind a sibling that should read as **deeper** in the stack.
- **Modals / dialogs vs menus:** Where a dialog can follow a menu (or vice versa), verify the **foreground** surface receives focus and pointer hits; no half-visible menu “under” a modal unless the spec documents that choreography.
- **Parallel surfaces:** If upload overlay, workspace chrome, and map shell are visible together, spot-check **resize**, **narrow workspace**, and **mobile nav** — stacking should remain stable without introducing new stacking contexts on layout wrappers “for insurance.”
- **Spec-first debugging:** When ordering looks wrong, read the relevant spec sections (dropdown shell owner, map-shell hoist, dialog layer roles) before changing CSS; prefer **one owner** per surface class over scattered literals.

---

## Screen checklist

Mark each row **Pass / Fail** with ticket link on fail. **Do not** mark Pass from CI or doc review alone — browser + three themes required per [Acceptance criteria](#acceptance-criteria). Row-level **unverified** inventory (honest gap log, no fake Pass): [`reports/phase-10-manual-visual-matrix-gap-2026-05-18.md`](./reports/phase-10-manual-visual-matrix-gap-2026-05-18.md).

| Screen / flow | Light | Dark | Sandstone |
|-----------------|-------|------|-----------|
| Login | [ ] | [ ] | [ ] |
| Register | [ ] | [ ] | [ ] |
| Reset password | [ ] | [ ] | [ ] |
| Update password | [ ] | [ ] | [ ] |
| Map view (primary) | [ ] | [ ] | [ ] |
| Projects — table view | [ ] | [ ] | [ ] |
| Projects — card view | [ ] | [ ] | [ ] |
| Projects — project-scoped URL (`/projects/:projectId`) | [ ] | [ ] | [ ] |
| Media — list layout | [ ] | [ ] | [ ] |
| Media — grid layout | [ ] | [ ] | [ ] |
| Media — toolbar (sort/filter/group/view toggles) | [ ] | [ ] | [ ] |
| Anchored toolbar menus — Filter / Sort / Grouping (375px + desktop) | [ ] | [ ] | [ ] |
| Toast / inline error surfaces (stacking + themes) | [ ] | [ ] | [ ] |
| Map shell — clustering, markers, style switch | [ ] | [ ] | [ ] |
| Settings overlay — General | [ ] | [ ] | [ ] |
| Settings overlay — Appearance | [ ] | [ ] | [ ] |
| Settings overlay — Notifications | [ ] | [ ] | [ ] |
| Settings overlay — Map | [ ] | [ ] | [ ] |
| Settings overlay — Search | [ ] | [ ] | [ ] |
| Settings overlay — Data | [ ] | [ ] | [ ] |
| Settings overlay — Account | [ ] | [ ] | [ ] |
| Settings overlay — Invite | [ ] | [ ] | [ ] |
| Settings — deep URL (`/settings/:section/:subsection`, rail + pane sync) | [ ] | [ ] | [ ] |
| Upload panel — location mode + lane switch | [ ] | [ ] | [ ] |
| Workspace pane — media detail | [ ] | [ ] | [ ] |
| Workspace pane — groupings | [ ] | [ ] | [ ] |
| Workspace pane — collapsed / narrow | [ ] | [ ] | [ ] |
| Dialog — confirm | [ ] | [ ] | [ ] |
| Dialog — text input | [ ] | [ ] | [ ] |
| Dialog — project select | [ ] | [ ] | [ ] |
| Dialog — share link audience | [ ] | [ ] | [ ] |
| Photo lightbox | [ ] | [ ] | [ ] |
| Nav — desktop | [ ] | [ ] | [ ] |
| Nav — mobile | [ ] | [ ] | [ ] |

### Settings overlay — concrete checks (from 2026-05-14 audit)

- [ ] `settings-overlay__lead-divider`: visible full-height hairline or removed (no zero-height artifact).
- [ ] Fixed pane: outer padding / close-button alignment matches spec (not accidental `padding: 0`).
- [ ] **Account** section: same card chrome as other tabs (`rounded-lg border border-border bg-card p-6`) or documented waiver.
- [ ] **Themes (light / dark / sandstone):** rail idle/hover/active tint; pill `bg-muted` track visible; selected segment `bg-background` + shadow; `hlmSwitch` track/thumb; invite status chip, QR frame, link preview, spinner.
- [ ] **Widths:** segmented groups fill value column where SCSS sets `--hlm-pill-toggle-width: 100%`.
- [ ] **Breakpoints:** field rows stack on small viewports; invite role row stacks; QR 10rem on mobile acceptable.
- [ ] **A11y:** boolean rows expose correct `aria-pressed` / `role="switch"` semantics (not only decorative `hlmSwitch`).
- [ ] **Settings ranges:** search radius + cache retention `<input type="range" hlmInput>` — track/thumb, focus ring, and value column alignment on all three themes (no separate range directive; regressions are token/visual, not template wiring).

---

## Interactive state matrix (sample per component class)

For **buttons**, **toggles**, **inputs**, **dialogs**, **dropdowns**:

| State | What to verify |
|-------|------------------|
| Hover | No layout shift; token-based hover bg/fg |
| `focus-visible` | Ring uses `--ring`; not obscured by overflow |
| Disabled | Muted palette; no pointer events leakage |
| Active / pressed | Toggle group **single selection**; toolbar **pressed** affordance |
| Loading | Spinners / progress do not duplicate toast errors |

**Forms:** invalid / error styles on `hlmInput` + `hlmFormField` — messages readable on **sandstone** (warm background).

**Motion:** dialog open/close respects reduced-motion if product requires it; no jarring jumps on map resize.

---

## Token theme checklist

- [ ] **Default (light):** surfaces, borders, primary brand orange read as intentional.
- [ ] **`[data-theme="dark"]`:** text contrast on `muted` surfaces; map markers visible.
- [ ] **`[data-theme="sandstone"]`:** borders and `muted` blocks remain distinguishable; no “muddy” focus rings.

---

## Acceptance criteria

| Gate | Condition |
|------|-----------|
| Visual intent | All rows in **Screen checklist** **Pass** on all three themes (or documented waivers with spec updates) |
| Encapsulation | **No new** `::ng-deep` in `apps/web/src/app` |
| Design system | `npm run design-system:check` → **0** |
| Build | `cd apps/web && npx ng build` → **0** with **no new** bundle budget warnings vs `main` baseline |
| Regressions | Map clustering, workspace pane overlays, and upload panel hit targets match spec metrics |

---

## Output artifacts

- Short **QA report** (markdown in PR description is enough): themes × viewports × browser matrix + screenshots for any **Fail → Fix** cycle.
- Update **element specs** if acceptance criteria during QA expose a spec gap (same PR or immediate follow-up per project rules).

---

## Definition of done

- Acceptance table green.
- `docs/migration/README.md` migration banner updated to “Phases 6–10 complete” with date.
- Optional: archive migration detail docs under `docs/migration/archive/` if the team wants a slimmer index — **do not** delete decision logs.
