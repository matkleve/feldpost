---
id: STUDY-014
type: proposal
status: proposed
supersedes: none
corrected-by: none
---

# Shell grid layout — change plan (authenticated app)

**Written:** 2026-09-22 · **Updated:** 2026-09-22 (primitive-first merge) · **Issue:** [#257](https://github.com/matkleve/feldpost/issues/257) · **Related:** [#258](https://github.com/matkleve/feldpost/issues/258) · **Mock:** [`docs/design/mockups/grid-shell-owner-mock-2026-09-22.png`](../design/mockups/grid-shell-owner-mock-2026-09-22.png) · **PR:** [#259](https://github.com/matkleve/feldpost/pull/259)

**Change class (implementation):** Sensitive — authenticated shell geometry, panel FSMs, settings overlay retirement.

**Status `proposed`:** normative specs and code must not ship until [#257](https://github.com/matkleve/feldpost/issues/257) planning acceptance criteria are checked and this study is `accepted`.

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
| **0** | This study + #257 Q&A | STUDY-014 → `accepted` |
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
- [ ] STUDY-014 → `accepted`

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
| This study | `docs/study/014-shell-grid-layout-change-plan.md` |
| Study index row | `docs/study/README.md` |
| Owner mock (committed) | `docs/design/mockups/grid-shell-owner-mock-2026-09-22.png` |
| PR | [#259](https://github.com/matkleve/feldpost/pull/259) |

**Not produced (by design):** normative specs, Angular components, feature wiring, issue #257 body update (STUDY-010 link still stale until PR merges).
