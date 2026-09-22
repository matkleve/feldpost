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

> **Read § 13 and § 14 before acting on anything above them.** Two updates dated 2026-09-22 were appended: **§ 13** measures the plan against the live code and the repository's gates, and supersedes two build-order claims; **§ 14** records the owner's decisions, which reorganise the plan — the left rail drives the **canvas**, the right rail drives the **panel column**, and Settings and Account are canvas content rather than panels, superseding § 5.3's panel roster. Nothing above has been edited. Both sections name what they supersede, per [`STUDY-FORMAT.md`](./STUDY-FORMAT.md) § Correcting a study; under its § Trust order the owner's answers in § 14 outrank everything else in this file.

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

---

## 14 · Update 2026-09-22 — owner decisions

**Source:** owner, in conversation, 2026-09-22. Under [`STUDY-FORMAT.md`](./STUDY-FORMAT.md) § Trust order an owner correction outranks everything else in this file, including § 13. Everything below is `[D]` by definition — these are decisions, not measurements.

Appended, not edited in. Where a decision overrules an earlier `[D]`, the earlier text stays where it is and is named as superseded.

### 14.1 · The rule that reorganises the whole plan

> "The canvas is what changes when you click on another page or on the settings or whatever. So **left rail controls the canvas**, and the **right rail controls the panel column**." `[D]`

This is the single most consequential answer, and it is simpler than what § 5 and § 7 assumed.

| Rail | Drives | What its options do |
| --- | --- | --- |
| **Left** | The **canvas** | Swap what the canvas shows — map, projects, media, account, organisation, settings |
| **Right** | The **panel column** | Open and close panels beside the canvas |

**Superseded: § 5.3's panel roster.** It lists `settings`, `profile` and `workspace` as panel ids. They are not panels. Settings and Account are **canvas content** reached from the left rail, exactly like the map or the media page `[D]`. The panel column holds only what the right rail opens.

This is a reduction in scope, not an addition. It removes the "Settings panel + Profile panel" migration from the panel stack entirely — what remains is a route-shaped change: settings stops being a floating overlay and becomes a thing the canvas shows.

**Superseded: § 1's target table row "Settings overlay → Settings panel in panel column"** — the target is Settings *in the canvas* `[D]`.

**The app is a one-pager.** `[D]` The canvas is the only thing that swaps; the rails and the panel column persist across every destination.

### 14.2 · The structure, in the owner's own terms

> "The page has a grid with those 4 columns, and then inside the columns are flex containers if needed that stretch." `[D]`

```text
div left rail
  div  logo                                  ← its own div, not part of a container
  div  widget container
         map
         projects
         media
         "+"   (opens the widget page for more widgets)
  ─────  empty space  ─────                  ← flex, not a fixed gap
  div  container: settings and people management
         account
         maybe mitarbeiter      ⎤ these two are widgets in their own right
         maybe organisation     ⎦
         settings
```

"Something like that is also on the right rail." `[D]`

Three things this settles that were open:

- **Q6 — left-rail contents:** map · projects · media · `+`. The `+` opens a widget page, so the container's contents are not a fixed list to be specced once `[D]`.
- **Q7 — the logo** is its own div and stays non-interactive `[D]`. Confirms § 13's reading of today's code.
- **Left-bottom contents:** account · *(mitarbeiter)* · *(organisation)* · settings `[D]`. Note **account**, not "profile" — § 5.3's `profile` panel id was wrong twice over.

**The rails are not a fixed inventory.** Mitarbeiter and Organisation are widgets ([#258](https://github.com/matkleve/feldpost/issues/258)), so their rows are absent, not disabled, when the org has not installed them `[D]`. Phase 4's spec must describe the rail as a *render of an installed-widget list*, not as a hardcoded list of options. This is the point where this workstream and #258 stop being independent.

### 14.3 · Superseded: the gap token, and the word "gap"

§ 4.1 names **Gap** as a term of art and § 13.7 recommended a fixed `var(--spacing-*)` token over a flex spacer. **Both are overruled** `[D]`:

> "Flex spacer — same with left rail. But container can stack with gap in top or bottom part, looking like separate elements."

> "You can rework it, because gap is like fixed but it's actually just spacing because there is no more content."

So there are two different things, and the earlier text conflated them `[D]`:

| Thing | What it is | How it is built |
| --- | --- | --- |
| The space between the top group and the bottom group | **Not a gap.** It is what is left over when the content runs out. | Flex spacer / `space-between` on the rail column |
| The space between two stacked containers inside the top or bottom group | A real, fixed separation that makes them read as separate elements | `gap` on that group's flex container |

The vocabulary drops "Gap" as a fourth named concept. **Control area · container · option** stand `[D]`; the leftover space needs no name because it is an absence, and naming an absence is what made it look like a token.

### 14.4 · Q1 — four tracks, with the panel column optional

> "It's control area, then canvas, then optional panel column if needed, then rail. The canvas and panel can be filled with whatever's on hand." `[D]`

Four tracks, and the panel column is **conditional** — present when something is open, absent otherwise. This matches § 13.3's replacement exactly: an `auto` track contributes zero width when the stack is empty, with no conditional class `[C]`. § 3's `minmax(0, var(--shell-panel-column-max))` stays superseded.

"Filled with whatever's on hand" confirms § 2.1's slot principle `[D]`: neither the canvas nor the panel column knows what its occupant is.

### 14.5 · Q9 — feature flag

Named here because the owner delegated the choice: **`shellGridLayout`** `[D]`.

**There is no feature-flag mechanism in this repository.** A search of `apps/web/src` for `featureFlag` / `FeatureFlag` / `FEATURE_FLAG` returns nothing, and `apps/web/src/app/core/` has no flag service `[A]`. So Phase 3 does not merely *use* a flag — it has to introduce whatever the flag is, and that is a design decision of its own that belongs in Phase 1's spec `[D]`. Left unstated, it becomes an ad-hoc boolean somewhere.

### 14.6 · Q3 — upload is right-rail only

> "ONLY right rail. We have no more workspace upload tab any more. This makes things a lot easier." `[D]`

The workspace Upload tab is **deleted**, not kept in parallel. Today upload exists twice — as the fixed `app-upload-shell` and as a tab projected into the workspace pane (`authenticated-app-layout.component.html:47-58`) `[A]`. Both go; upload becomes one panel opened from the right rail `[D]`.

### 14.7 · Q2 — selection is unified, and double-selection is removed

> "We no longer have the ability to double select media. Right now you can select media on the map and then select again in the select tab. Now the select tab mirrors what's on the map, or the `/media` page/widget selected." `[D]`

One selection, many views. The select surface **mirrors** the current selection — it does not hold a second, independent one that the user can add to.

This is the largest behavioural change in the owner's answers, and it is not geometry `[C]`. It deletes a state that exists today, which means it can delete bugs and user expectations at the same time. It needs a red test before the change, and it is the one answer here that deserves its own spec section rather than a row in a table `[D]`.

### 14.8 · Q4 — tablet yes, mobile still open

> "I think on tablet it will work." `[D]`

Tablet keeps the four-track layout. **Mobile was not answered and stays open** — it is the only question from § 9 still outstanding. Today's mobile shell is a `3.5rem` fixed bottom bar (`nav.component.scss:40-52`) `[A]`, and § 13.8 notes nobody has measured whether two rails plus a panel column fit at `48rem`. Phase 9 cannot start without an answer; nothing before it is blocked.

### 14.9 · Answers in brief

| # | Question | Decision |
| --- | --- | --- |
| Q1 | Track count | Four; panel column conditional (§ 14.4) `[D]` |
| Q2 | Workspace / selection | Unified selection; select surface mirrors (§ 14.7) `[D]` |
| Q3 | Upload | Right rail only; workspace tab deleted (§ 14.6) `[D]` |
| Q4 | Tablet / mobile | Tablet works; **mobile open** (§ 14.8) `[D]` |
| Q5 | Terminology | Control area · container · option; "gap" dropped (§ 14.3) `[D]` |
| Q6 | Left-rail routes | map · projects · media · `+` (§ 14.2) `[D]` |
| Q7 | Logo | Own div, non-interactive (§ 14.2) `[D]` |
| Q8 | Rail spacing | Flex spacer between groups; `gap` inside a group (§ 14.3) `[D]` |
| Q9 | Feature flag | `shellGridLayout`; mechanism does not yet exist (§ 14.5) `[D]` |
| Q10 | Notifications, undo/history, tips | Deferred; not v1 `[D]` |

Also confirmed: the shared `shell-box` surface (§ 2.2, § 13 banner) `[D]`; and the grid host owning all track widths, which § 14.2's "the page has a grid with those 4 columns" settles — it is the same thing § 13.1 asks for, arrived at from the other direction `[D]`.

### 14.10 · What Phase 1 must now specify that it did not before

1. **Rails render an installed-widget list**, not a fixed option list (§ 14.2) — the join with #258.
2. **Left rail → canvas, right rail → panel column** as a contract, so no future option lands on the wrong side (§ 14.1).
3. **Settings and account as canvas destinations**, and what becomes of `SettingsPaneService`'s eight section ids, subsection deep-links and the command-palette entry into invite management (`settings-pane.service.ts:26-44`) `[A]` when the overlay becomes canvas content (§ 14.1).
4. **The unified selection model** and the removal of the second selection (§ 14.7).
5. **A feature-flag mechanism**, since none exists (§ 14.5).
6. **The leftover-space rule**: flex spacer between groups, `gap` within a group (§ 14.3).

### 14.11 · Status

Every § 10 criterion except the two below now has an owner answer. Remaining before `status: accepted`:

- [ ] **Q4 mobile** — the one unanswered question (§ 14.8)
- [ ] Implementation issues filed per phase
