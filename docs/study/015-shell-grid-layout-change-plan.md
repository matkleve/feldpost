---
id: STUDY-015
type: proposal
status: proposed
supersedes: none
corrected-by: none
---

# Shell grid layout — change plan (authenticated app)

**Written:** 2026-09-22 · **Updated:** 2026-09-22 (primitive-first merge) · **Issue:** [#257](https://github.com/matkleve/feldpost/issues/257) · **Related:** [#258](https://github.com/matkleve/feldpost/issues/258) · **Mock:** [`docs/design/mockups/grid-shell-owner-mock-2026-09-22.png`](../design/mockups/grid-shell-owner-mock-2026-09-22.png) · **PR:** [#259](https://github.com/matkleve/feldpost/pull/259)

**Change class (implementation):** Sensitive — authenticated shell geometry, panel FSMs, settings overlay retirement.

**Status `proposed`:** normative specs and code must not ship until [#257](https://github.com/matkleve/feldpost/issues/257) planning acceptance criteria are checked and this study is `accepted`.

> **Before acting on § 2.3, § 3 or § 8, read § 13.** An update dated 2026-09-22 measures this plan against the live code and the repository's own gates. Two build-order claims above do not survive that measurement, and the strongest argument *for* the grid was missing from § 1. Nothing above has been edited — § 13 names what is superseded and why, per [`STUDY-FORMAT.md`](./STUDY-FORMAT.md) § Correcting a study.

---

## Measurement conditions

| Source | What was read |
| --- | --- |
| `[A]` | GitHub issue #257 body (2026-09-22) |
| `[A]` | Owner mock PNG — `docs/design/mockups/grid-shell-owner-mock-2026-09-22.png` |
| `[A]` | Live layout: `apps/web/src/app/layout/authenticated-app-layout.component.*` |
| `[A]` | Live nav: `apps/web/src/app/features/nav/nav.component.*` |
| `[A]` | Shared chrome: `apps/web/src/styles/_frosted-chrome.scss`, `--container-radius-*` in `_typography-baseline.scss` |
| `[D]` | Owner correction (2026-09-22): control areas = backgroundless columns; **separate frosted containers** inside; left bottom = Profile, Coworkers?, Organisation?, Settings |
| `[D]` | Owner correction (2026-09-22): build **primitive-first** — shared box styling, generic main canvas (not map-specific shell), wire features last |

---

## 1 · Problem

Today's authenticated shell does not match the owner's target `[D]`:

| Today `[A]` | Target `[D]` |
| --- | --- |
| Expand/collapse left sidebar | Fixed control areas both sides |
| Settings overlay | Settings panel in panel column |
| Account inside settings | Profile panel separate |
| Upload shell top-right | Upload panel in panel column |
| Resizable workspace pane on the right | TBD — Q2 |
| Search top-center on map | Search + filter top-left (map chrome) |
| Theme in nav | Theme bottom-right (map chrome) |

Premature `docs/specs/ui/shell/` drafts were reverted `[A]`. Spec writing resumes after plan lock.

---

## 2 · Design principles (how to build)

### 2.1 Shell = slots, not features `[D]`

The authenticated UI is a **grid of slots**. Features plug in later.

```text
┌──────────┬─────────────────┬──────────────┬──────────┐
│ CONTROL  │  MAIN CANVAS    │ PANEL STACK  │ CONTROL  │
│ (layout) │  (any content)  │ (surfaces)   │ (layout) │
└──────────┴─────────────────┴──────────────┴──────────┘
```

| Slot | Role | Chrome on slot itself? |
| --- | --- | --- |
| Control left / right | Icon groups | **No** on outer column; **yes** on inner containers |
| Main canvas | Route/widget content (map today; media, catalog, etc. tomorrow) | Content brings its own |
| Panel stack | Large toggled surfaces | **Yes** — same box treatment as control containers |

**The map is not the shell.** It is one tenant of the main canvas `[D]`.

### 2.2 Shared surface contract (Layer 0) `[D]`

Rail containers, side panels, and matching floating chrome must share **radius, shadow, and frost** — via **one mixin + existing tokens**, not per-component invention.

| Existing token / mixin `[A]` | Role |
| --- | --- |
| `--container-radius-panel` | Large boxes (panels, rail containers) |
| `--container-radius-control` | Small controls inside boxes |
| `--shadow-md` | Elevation |
| `frosted-chrome.panel` | Background, blur, border |

**Proposed:** add `@mixin shell-box` in `_frosted-chrome.scss` (or adjacent) wrapping `frosted-chrome.panel` + `border-radius: var(--container-radius-panel)`. Optional `shell-box--compact` for small rail containers using `--container-radius-control`.

**Prefer mixin + tokens over a wrapper component** unless DOM consistency is required `[D]`. Do not invent new `--shell-*` globals without spec row `[A]` (`agent-css-variable-contract.md`).

### 2.3 Primitive-first build order `[D]`

Do **not** start by migrating upload/settings/workspace. Build shell primitives, prove in Storybook, then wire features.

```text
Layer 0  Shared surface mixin/tokens
Layer 1  GridShell (four tracks, feature flag)
Layer 2  Slot components (control area, main canvas, panel column)
Layer 3  Chrome primitives (container, option, panel surface, hover label)
Layer 4  ShellLayoutService (panel stack state only)
Layer 5  Wire features (map, upload, settings, …) + retire legacy
```

---

## 3 · Four-track grid geometry

```text
grid-template-columns:
  [control-left]  auto
  [main]          1fr
  [panels]        minmax(0, var(--shell-panel-column-max))   /* 0 when empty */
  [control-right] auto
```

| Track | Component | Background |
| --- | --- | --- |
| 1 | `ShellControlAreaComponent` (left) | None |
| 2 | `ShellMainCanvasComponent` | None — `<ng-content>` / router-outlet |
| 3 | `ShellPanelColumnComponent` | None — stacks panel surfaces |
| 4 | `ShellControlAreaComponent` (right) | None |

**Mock caveat `[C]`:** PNG useful for panel proportions and styling; **wrong** for continuous rails (see §4).

---

## 4 · Control-area structure

### 4.1 Terminology `[D]`

| Term | Meaning |
| --- | --- |
| **Control area** | Outer layout column. No background. |
| **Container** | Frosted box (`@include shell-box`). Groups options. |
| **Option** | 44×44 icon button. Hover label pill overlays horizontally. |
| **Gap** | Empty space between containers (right rail). Not a styled node. |

### 4.2 DOM shape

```html
<app-shell-control-area side="left|right">
  <app-shell-control-container name="top|bottom|actions|history|help">
    <app-shell-control-option action="…" icon="…" />
  </app-shell-control-container>
</app-shell-control-area>
```

### 4.3 Left control area `[D]`

Two containers, `justify-content: space-between` on outer column:

| Container | Options | Action |
| --- | --- | --- |
| **Top** | Logo, Map, Media (+ routes per Q6) | Navigate |
| **Bottom** | Profile, Coworkers?, Organisation?, Settings | Open panel in stack |

Coworkers/Organisation conditional on widget install ([#258](https://github.com/matkleve/feldpost/issues/258)).

### 4.4 Right control area `[D]`

Three containers + gaps:

| Container | Options | Action |
| --- | --- | --- |
| **Actions** | Notifications, Upload, Download, Shared media | Toggle panel / trigger flow |
| **History** | Undo, Change history, Redo | History actions (Q10) |
| **Help** | Tips, Help | Open panel in stack |

### 4.5 Hover labels `[D]`

~1 s delay desktop; label pill overlays map/panels; **does not push layout**; map stays interactive except on pill.

---

## 5 · Panel stack (track 3)

### 5.1 Model `[D]`

Multiple panels may be open (mock shows Upload + Hilfe together `[A]`):

| State | Behavior |
| --- | --- |
| `{ id, open, order }` | Independent per panel |
| Rail toggle | Same option closes panel |
| Overflow | Column scrolls |

### 5.2 Panel surface primitive

```html
<app-shell-panel-column>
  <app-shell-panel-surface panelId="upload" title="…">
    <!-- feature body projected here later -->
  </app-shell-panel-surface>
</app-shell-panel-column>
```

`app-shell-panel-surface` uses `@include shell-box` — same visual family as control containers.

### 5.3 Feature wiring (Layer 5 — later)

| Panel id | Body (existing code) | Replaces |
| --- | --- | --- |
| `upload` | `UploadPanelComponent` | `app-upload-shell` |
| `help` | TBD | — |
| `settings` | settings overlay body | `ss-settings-overlay` |
| `profile` | account section | nested settings account |
| `workspace` | workspace pane content | right split — **Q2** |

Settings and Profile remain **separate panels** `[D]`.

---

## 6 · Map chrome (floats on main canvas — not in rails)

When main canvas hosts the map, these float **inside** the canvas layer:

| Control | Position |
| --- | --- |
| Search + filter | Top-left |
| Compass | Top-right |
| Scale | Bottom-left |
| Theme | Bottom-right |
| Zoom ± | Bottom-right |

Revise `search-bar.md` before moving search.

---

## 7 · Component tree (target)

```text
AuthenticatedAppLayoutComponent     ← share-link, workspace hooks (orchestrator)
└── GridShellComponent              ← CSS grid owner
    ├── ShellControlAreaComponent   ← left
    │     └── ShellControlContainerComponent
    │           └── ShellControlOptionComponent
    ├── ShellMainCanvasComponent    ← generic; router-outlet / projected content
    ├── ShellPanelColumnComponent
    │     └── ShellPanelSurfaceComponent
    └── ShellControlAreaComponent   ← right
          └── (same container/option stack)

ShellLayoutService                  ← panel stack + option→panel map only
ShellHoverLabelComponent (or layer) ← overlay labels
```

Register new shared components in `registry.json` before implementation `[A]` (component-reuse gate).

---

## 8 · Implementation phases (primitive-first)

| Phase | Deliverable | Gate |
| --- | --- | --- |
| **0** | This study + #257 Q&A | STUDY-015 → `accepted` |
| **1** | Normative specs (`docs/specs/ui/shell/*`) | Spec-only PR |
| **2** | Layer 0: `shell-box` mixin | Uses existing tokens; no new `--shell-*` |
| **3** | Layer 1–2: `GridShell` + slot components + flag | Flag off = today unchanged |
| **4** | Layer 3–4: control + panel primitives + `ShellLayoutService` | Storybook full shell with placeholders |
| **5** | Layer 5a: wire main canvas (map first) | Map fills canvas; height chain intact |
| **6** | Layer 5b: wire one panel (Upload proof) | End-to-end upload from rail |
| **7** | Layer 5c: remaining panels + map chrome moves | Settings, Profile, Help; search reposition |
| **8** | Layer 5d: workspace — **Q2** | Share restore + selection |
| **9** | Breakpoints — **Q4** | Mobile/tablet |
| **10** | Retire legacy; flag default on | `npm run verify` green |

**First code PR = Phase 2–3 only** (mixin + empty grid + slots). No feature migration.

---

## 9 · Open questions

| ID | Question | Blocks |
| --- | --- | --- |
| Q1 | Four-track vs three-track | Phase 1 |
| Q2 | Workspace/selection | Phase 8 |
| Q3 | Upload: rail only vs workspace Upload tab | Phase 6 |
| Q4 | Tablet/mobile | Phase 9 |
| Q6 | Left top-container route list | Phase 4 |
| Q8 | Right inter-container gap token | Phase 4 |
| Q9 | Feature flag name | Phase 3 |
| Q10 | Notifications, undo/history, tips — v1 scope | Phase 4–7 |

---

## 10 · Planning acceptance criteria (#257)

- [ ] Owner confirms four-track grid + generic main canvas
- [ ] Owner confirms backgroundless control areas + separate frosted containers (§4)
- [ ] Owner confirms left bottom: Profile, Coworkers?, Organisation?, Settings
- [ ] Owner confirms shared `shell-box` surface (§2.2)
- [ ] Owner confirms panel stack (§5.1)
- [ ] Owner confirms primitive-first phases (§8)
- [ ] Q1–Q10 answered or deferred
- [ ] STUDY-015 → `accepted`

---

## 11 · Verification

- `npm run verify` after every PR
- Sensitive class: ownership matrices, FSM tests for `ShellLayoutService`
- Red-test-first: settings URL sync, share restore (when workspace wired)
- LIVE CHECK: hover labels; map pan under overlay; upload E2E after Phase 6

---

## 12 · Artifacts produced by planning agent (2026-09-22)

| Artifact | Path |
| --- | --- |
| This study | `docs/study/015-shell-grid-layout-change-plan.md` |
| Study index row | `docs/study/README.md` |
| Owner mock (committed) | `docs/design/mockups/grid-shell-owner-mock-2026-09-22.png` |
| PR | [#259](https://github.com/matkleve/feldpost/pull/259) |

**Not produced (by design):** normative specs, Angular components, feature wiring, issue #257 body update (STUDY-010 link still stale until PR merges).

---

## 13 · Update 2026-09-22 — measured against the code and the gates

**Measured:** 2026-09-22, on branch `claude/cool-cray-oyr4vz` at merge base `87385f2`.
**How:** static reading of `apps/web/src`, `scripts/` and `docs/design/`. Every path below cites `path:line` at that commit. No browser was opened and no component was built.

Appended per [`STUDY-FORMAT.md`](./STUDY-FORMAT.md) § Correcting a study: this update **adds to** the plan above rather than reversing it — the grid is still the right change, and § 13.1 argues for it harder than § 1 does. Nothing above has been edited, including the two claims § 13.3 and § 13.4 supersede.

### 13.1 · The argument for the grid that § 1 does not make

§ 1 justifies the change by mismatch with the owner's target. There is a second, stronger justification that does not depend on anyone's taste: **today's shell has no single owner for its own track widths**, and the workaround is a global custom property written imperatively from a feature component.

One geometric fact — how wide is the left rail — is currently stated in three places `[A]`:

| Where | What it says |
| --- | --- |
| `apps/web/src/app/features/nav/nav.component.ts:65-72` | An effect writes `--feldpost-sidebar-width` onto `document.documentElement`, `3rem` collapsed / `15rem` expanded |
| `apps/web/src/app/features/settings-overlay/settings-overlay.component.scss:40` | Reads it back: `left: calc(var(--feldpost-sidebar-width, 15rem) + var(--spacing-3))` |
| `apps/web/src/app/layout/authenticated-app-layout.component.scss:11-29` | A third copy as a flex spacer — `app-nav { width: 15rem }` / `app-nav.nav--collapsed { width: 3rem }` |

The third copy exists because the real rail is `position: fixed` and sits **outside** the flex row (`nav.component.scss:26-30`) `[A]`, so the layout must reserve space it does not control. The round trip through `document.documentElement` exists because `:host` variables do not cross DOM siblings, and nav and the settings overlay are siblings `[A]`.

**A grid dissolves this class of bug rather than fixing an instance of it** `[C]`. If the grid host declares `grid-template-columns` and every region is a track, the rail width is one declaration in one file, the panel column stops being a `position: fixed` negotiation, and no component tells the document element how wide it is. Phase 3 should therefore **delete the spacer and the `--feldpost-sidebar-width` writer in the same commit that introduces the grid** `[D]` — leaving either in place keeps the duplication alive behind a flag.

### 13.2 · The canonical shell-geometry doc is stale about the mechanism it governs

[`shell-layout-tokens.md`](../design/shell-layout-tokens.md) § Cross-sibling positioning states that the **shipped** mechanism is a duplicated literal — "`calc(0.25rem * 12)` — same value as nav `--sidebar-width-collapsed`" — and files a shared variable under "Future (optional) … not scheduled". The code does the opposite: it ships the shared variable (§ 13.1) and contains no such `calc` `[A]`.

This matters more than a normal doc bug, because [`agent-css-variable-contract.md`](../design/agent-css-variable-contract.md) § Shell layout names that file as a **must-read** for shell work `[A]`. The canonical reference is currently wrong about the one mechanism it exists to govern, and every agent sent to it inherits the error. Correcting it belongs in Phase 1 and is worth its own issue `[D]`.

### 13.3 · Superseded: § 3's `--shell-panel-column-max`

§ 3's grid declaration reads `minmax(0, var(--shell-panel-column-max))`. That token may not be introduced `[A]`:

- [`agent-css-variable-contract.md`](../design/agent-css-variable-contract.md) § Forbidden improvisations and § Decision tree line 13 forbid a new `--shell-*` property on `:root` or a layout host "unless spec row + ownership matrix exist".
- [`shell-layout-tokens.md`](../design/shell-layout-tokens.md) § Forbidden / allowed / owner matrix records `--shell-*` as **Forbidden**, at **0** live vars.
- `grep -rn -e "--shell-" apps/web/src --include="*.scss"` returns nothing at `87385f2` `[A]`.

§ 2.2 already says "Do not invent new `--shell-*` globals without spec row", so § 3 contradicts § 2.2 `[A]`. § 2.2 is the correct half.

**Replacement** `[D]`: size the panel track `auto`.

```text
grid-template-columns:
  [control-left]  auto
  [main]          1fr
  [panels]        auto            /* contributes zero width when the stack is empty */
  [control-right] auto
```

An `auto` track with no content collapses for free. A fixed track needs a conditional class to collapse, which is the `@if` + spacer pattern this whole change is meant to retire `[C]`. If a maximum width is genuinely needed later, it arrives as a spec row plus an ownership-matrix entry — in that order — not as a token in a study.

### 13.4 · Superseded: the Storybook gate (§ 2.3, § 8 Phase 4)

§ 2.3 says to "prove in Storybook" and § 8 Phase 4 sets the gate "Storybook full shell with placeholders". **This repository has no Storybook** `[A]`: neither `.storybook/` nor `apps/web/.storybook/` exists, and no `storybook` script appears in `package.json`. Phase 4's gate as written cannot be executed.

**Replacement gate for Phase 4** `[D]`, using surfaces the repo actually has `[A]`:

| Proof | Command |
| --- | --- |
| Breakpoints, visual-behavior guard, token lint, interaction emphasis, contrast | `npm run design-system:check` |
| Component registry + spec coverage + doc links + study format | `npm run verify` |
| Unit/FSM behaviour of `ShellLayoutService` | `npm run test` |
| Hover labels, map pan under overlay, track-change reflow | 🔴 LIVE VERIFICATION block (AGENTS.md § Working with the user) |

Standing up Storybook is a defensible thing to want, but it is its own project with its own review — it must not be a hidden prerequisite inside a shell phase `[D]`.

### 13.5 · Specs precede components — a gate, not a preference (sharpens § 7)

§ 7 says "Register new shared components in `registry.json` before implementation". True, and there is a second gate that binds harder: `check-spec-coverage.mjs` requires every production component to be named by filename or selector in some `docs/specs/**.md`, and its allowlist "is a ratchet, not an exemption … A new component may never be added to it" (`scripts/check-spec-coverage.mjs:29-33`) `[A]`.

So `ShellMainCanvasComponent`, `ShellPanelColumnComponent`, `ShellControlAreaComponent` and the rest **cannot land at all** — not behind a flag, not as unused primitives — until a spec names them `[A]`. Combined with § 13.3 (a `--shell-*` token needs a spec row first), the ordering is forced from two independent directions:

> owner signs § 10 → specs (Phase 1) → mixin (Phase 2) → grid + slots (Phase 3) → everything else

"Primitive-first" survives intact as *surface and slots before features*. It does **not** survive as *components before specs* `[A]`. § 8's phase table already has Phase 1 in the right place; this is a note on why it cannot be reordered for convenience.

### 13.6 · Track-width changes carry a map-invalidation obligation

`nav.component.ts:82-94` invalidates the Leaflet map three times on every rail-width change — immediately, on the next tick, and after `SIDEBAR_WIDTH_TRANSITION_MS` `[A]`. That obligation is a property of *the map sharing a row with a resizable track*, not of the sidebar, so the grid inherits it exactly `[C]`.

Consequences `[D]`:

- Phase 3's LIVE CHECK must include opening and closing a panel with the map visible, and confirming no grey tile band.
- The panel stack opening is a track-width change too (§ 13.3) — so it needs the same treatment as a rail collapse, which today's code never had to handle.
- If the grid host owns the tracks, the invalidation hook should move to the grid host with them, rather than staying on nav.

### 13.7 · Breakpoint vocabulary (affects Q4 and Phase 9)

`audit-panel-breakpoints.mjs` allows exactly `47.9375rem`, `48rem`, `63.9375rem`, `64rem` (`scripts/audit-panel-breakpoints.mjs:13-20`) `[A]`. The shell uses `768px` / `767px` throughout — 20 occurrences in `nav.component.scss`, plus `authenticated-app-layout.component.scss:11,17,26` `[A]`.

`768px` **is** `48rem`, so the values agree and nothing is visually wrong. Two things follow anyway `[A]`:

- The unit does not match the allowed vocabulary, and the gate never sees it: its `targetDirs` are `features/map`, `features/settings-overlay` and `features/upload` only (`scripts/audit-panel-breakpoints.mjs:7-11`). `layout/` and `features/nav/` are unscanned.
- New shell SCSS should be written in rem from the first line, and Phase 9 should consider adding those two directories to `targetDirs` `[D]`. That is a cheap change that closes the blind spot permanently.

Today's mobile shell, for the record: the nav becomes a `3.5rem` fixed bottom bar below the breakpoint (`nav.component.scss:40-52`) `[A]`. Q4 has to say what happens to *two* rails and a panel column at `48rem`, and § 13.8 notes that nobody has measured whether they fit.

### 13.8 · What this update did not measure

- **That the grid renders correctly.** Nothing was built; no browser was opened. Every claim about the target remains `[D]`; only claims about today's code are `[A]`. The grid could fight Leaflet's sizing in a way static reading cannot reveal — Phase 3's LIVE CHECK is the first place this plan can honestly fail.
- **That four tracks fit at `48rem`.** Two fixed rails plus a panel column on a 768px viewport is plausibly too much. Unmeasured, and it is the sharp end of Q4.
- **The cost of retiring the settings overlay.** `SettingsPaneService` carries `_open`, `_selectedSectionId` over eight section ids, a `_subsectionRequest` token and an `_inviteSectionRequest` whose `openContext` is `'settings' | 'command'` (`apps/web/src/app/core/settings-pane/settings-pane.service.ts:26-44`) `[A]`. A panel that merely renders elsewhere must still honour subsection deep-links and the command-palette entry into invite management `[C]`. § 8 spreads this across Phases 7–8; the estimate belongs in Phase 1's spec, where the FSM gets written down.
- **Whether § 3–§ 5 match the owner's mock.** The PNG is committed and was not opened by this update. Under [`STUDY-FORMAT.md`](./STUDY-FORMAT.md) § Trust order, if they disagree the mock and the owner win over anything written here.

### 13.9 · Tasks this update adds

| Task | Where |
| --- | --- |
| Repoint #257's study link — its body still cites `docs/study/010-shell-grid-layout-change-plan.md`, a file that has never existed (STUDY-010 is the defensive security review) `[A]` | Issue edit |
| Correct [`shell-layout-tokens.md`](../design/shell-layout-tokens.md) § Cross-sibling positioning (§ 13.2) | Own issue; Phase 1 |
| Add `layout/` and `features/nav/` to the breakpoint gate's `targetDirs` (§ 13.7) | Phase 9 |
