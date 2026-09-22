---
id: STUDY-014
type: proposal
status: proposed
supersedes: none
corrected-by: none
---

# Shell grid layout — change plan (authenticated app)

**Written:** 2026-09-22 · **Branch:** `main` at authoring time · **Issue:** [#257](https://github.com/matkleve/feldpost/issues/257) · **Related:** [#258](https://github.com/matkleve/feldpost/issues/258) (widget modularity — coordinate before left-rail item source locks) · **Mock:** [`docs/design/mockups/grid-shell-owner-mock-2026-09-22.png`](../design/mockups/grid-shell-owner-mock-2026-09-22.png)

**Change class (implementation):** Sensitive — authenticated shell geometry, panel FSMs, settings overlay retirement.

**Status `proposed`:** owner corrections on control-area structure are recorded here `[D]`; normative specs and code must not ship until [#257](https://github.com/matkleve/feldpost/issues/257) planning acceptance criteria are checked and this study is `accepted`.

---

## Measurement conditions

| Source | What was read |
| --- | --- |
| `[A]` | GitHub issue #257 body (2026-09-22) |
| `[A]` | Owner mock PNG (2026-09-22 design chat) — saved at `docs/design/mockups/grid-shell-owner-mock-2026-09-22.png` |
| `[A]` | Live layout: `apps/web/src/app/layout/authenticated-app-layout.component.*` |
| `[A]` | Live nav: `apps/web/src/app/features/nav/nav.component.*` |
| `[D]` | Owner correction (2026-09-22, agent session): left/right control areas use **separate frosted containers** inside a **backgroundless outer column**; left bottom container includes Profile, optional Coworkers/Organisation, Settings |

---

## 1 · Problem

Today's authenticated shell does not match the owner's target `[D]`:

| Today `[A]` | Target `[D]` |
| --- | --- |
| Expand/collapse left sidebar (`3rem ↔ 15rem`, `nav.component.ts`) | Fixed icon rails both sides |
| Settings via floating overlay (`settings-overlay/`) | Settings **panel** in content column |
| Account inside settings overlay | **Profile panel** separate from Settings |
| Upload shell absolute top-right (`upload-shell/`) | Upload **panel** in content column |
| Resizable workspace pane on the right | TBD — Q2 |
| Search top-center on map (`search-bar.md`) | Search + filter top-left on map |
| Theme in nav utility row | Theme bottom-right on map |

Premature draft specs under `docs/specs/ui/shell/` were reverted before this plan existed `[A]` (issue #257). Spec writing resumes only after plan lock.

---

## 2 · Four-track grid (shell geometry)

```text
┌─────────┬──────────────┬──────────────────┬─────────┐
│ LEFT    │ MAP          │ CONTENT PANELS   │ RIGHT   │
│ control │ (primary)    │ (large surfaces) │ control │
│ area    │              │                  │ area    │
│ track 1 │ track 2      │ track 3          │ track 4 │
└─────────┴──────────────┴──────────────────┴─────────┘
```

| Track | Role | Background on track? |
| --- | --- | --- |
| 1 — Left control area | Icon option groups | **No** — layout column only |
| 2 — Map | Map shell + floating map chrome | Map tiles + chrome |
| 3 — Content panels | `.ui-container`-style panels | Per-panel chrome |
| 4 — Right control area | Icon option groups | **No** — layout column only |

**Mock caveat `[C]`:** the reference PNG is useful for panel styling and overall proportions but **misrepresents control-area structure** — it reads as one continuous left/right rail. The structure in §3 is authoritative over the mock for rails.

---

## 3 · Control-area structure (corrected)

### 3.1 Terminology `[D]`

| Term | Meaning |
| --- | --- |
| **Control area** | Outer layout column (left or right track). No background, no border. |
| **Container** | Visible frosted group inside a control area. Holds related options. |
| **Option** | One icon button (min 44×44 px). May show hover label pill. |
| **Gap** | Empty vertical space **between containers** on the right rail (not a DOM node with chrome). |

### 3.2 DOM shape (both rails)

```html
<div class="control-area control-area--left|right">
  <div class="control-container control-container--{name}">
    <button class="control-option" data-action="…">…</button>
    <!-- repeat -->
  </div>
  <!-- optional vertical gap (flex gap / margin — not a container) -->
  <div class="control-container …">…</div>
</div>
```

**CSS intent `[D]`:**

- `.control-area` — `display: flex; flex-direction: column; width: var(--control-rail-width); background: none;`
- `.control-container` — frosted chrome, `border-radius`, internal `gap` between options
- `.control-option` — 44×44 min hit target; icon only at rest

### 3.3 Left control area `[D]`

**Two containers** — top and bottom — pinned with `justify-content: space-between` on the outer column.

```text
.control-area--left          ← NO background
│
├── .control-container--top   ← frosted box
│     ├── logo
│     ├── map
│     └── media               (+ future routes per Q6)
│
│     (flex space — not a container)
│
└── .control-container--bottom ← separate frosted box
      ├── profile
      ├── coworkers             (if widget installed — #258)
      ├── organisation          (if widget installed — #258)
      └── settings
```

| Container | Options | Action |
| --- | --- | --- |
| **Top** | Logo, Map, Media (+ future routes) | **Navigate** — route change |
| **Bottom** | Profile, Coworkers?, Organisation?, Settings | **Open panel** in content column (track 3) |

**Corrections vs issue #257 draft text `[D]`:**

- Issue #257 listed only Profile + Settings in bottom container. Owner correction adds **Coworkers** and **Organisation** to bottom (conditional on install), not top.
- Issue #257 implied one continuous rail. Owner correction: **two visually separated containers**, not one frosted strip.

**Corrections vs mock PNG `[C]`:**

- Mock shows one continuous left strip — **wrong** for containers.
- Mock places org/team icon in top group — plan moves org/coworkers to **bottom container** when installed.

### 3.4 Right control area `[D]`

**Three containers** with explicit gaps between groups.

```text
.control-area--right         ← NO background
│
├── .control-container--actions
│     ├── notifications
│     ├── upload
│     ├── download
│     └── shared-media
│
│     ← GAP (empty space, ~spacing-6 token — Q8)
│
├── .control-container--history
│     ├── undo
│     ├── change-history
│     └── redo
│
│     ← flex space
│
└── .control-container--help
      ├── tips
      └── help
```

| Container | Options | Action |
| --- | --- | --- |
| **Actions** | Notifications, Upload, Download, Shared media | Toggle/open content panels or trigger flows |
| **History** | Undo, History, Redo | Editing/history actions (v1 scope — Q10) |
| **Help** | Tips, Help | Open help/tips panels in content column |

**Mock caveat `[C]`:** mock may omit Shared media, Tips, and the visible gap between action and history groups.

### 3.5 Hover labels (all options, both rails) `[D]`

| Rule | Detail |
| --- | --- |
| Hit targets | Min 44×44 px |
| Rail width | Fixed icon-only — no expand/collapse |
| Hover delay | ~1 s desktop; longer on tablet |
| Label pill | Expands horizontally; **overlays** map/panels |
| Layout | Labels **do not push** grid tracks |
| Pointer | Map stays interactive under overlay; only pill captures hits |

---

## 4 · Content panel column (track 3)

Large `.ui-container`-style panels beside the map. **Not part of control areas.**

### 4.1 Panel stack model `[D]`

The mock shows **Upload and Hilfe open simultaneously** `[A]` (mock PNG). Content column therefore uses a **panel stack**, not a single-active panel FSM:

| Concept | Behavior |
| --- | --- |
| Each panel slot | `{ id, open, order }` independent state |
| Rail toggle | Same option again closes that panel |
| Multiple open | Allowed (e.g. Upload + Help) |
| Overflow | Column scrolls vertically |

### 4.2 Panel registry

| Panel id | Opened by | Replaces |
| --- | --- | --- |
| `upload` | Right rail → Upload | `app-upload-shell` top-right chrome |
| `help` | Right rail → Help | — |
| `settings` | Left rail → Settings | Settings overlay |
| `profile` | Left rail → Profile | Account section inside settings |
| `shared-media` | Right rail → Shared media | TBD |
| `workspace` | Map selection / share restore | Resizable workspace pane — **Q2** |

Settings and Profile remain **completely separate panels** `[D]` — not overlay sections, not nested.

---

## 5 · Map chrome (floats on track 2 — not in rails)

| Control | Position |
| --- | --- |
| Search + filter | Top-left |
| Compass | Top-right |
| Scale | Bottom-left |
| Theme cycle | Bottom-right |
| Zoom ± | Bottom-right |

Search move requires `search-bar.md` revision before implementation.

---

## 6 · Component architecture (implementation target) `[C]`

```text
AuthenticatedAppLayoutComponent   (orchestrator — share link, workspace hooks)
└── GridShellComponent            (four-track CSS grid)
    ├── LeftControlRailComponent
    ├── MapColumnComponent
    │     ├── MapShellComponent
    │     └── MapChromeLayer
    ├── ContentPanelColumnComponent
    │     └── projected panel bodies (upload, help, settings, profile, …)
    └── RightControlRailComponent
```

Shared primitive: **`ControlRailComponent`** + **`ControlContainerComponent`** + **`ControlOptionComponent`** (or equivalent) registered in component registry before implementation.

New service: **`GridShellStateService`** — panel stack state, active route sync, rail interaction.

---

## 7 · Migration phases

| Phase | Deliverable | Gate |
| --- | --- | --- |
| **0** | This study + #257 Q&A | Owner signs plan; STUDY-014 → `accepted` |
| **1** | Normative specs (`docs/specs/ui/shell/*`) | Spec-only PR; no code |
| **2** | Grid scaffold behind feature flag | Flag off = pixel parity `[A]` |
| **3** | Left + right control rails (containers + options + hover labels) | 44 px targets; labels overlay without layout push |
| **4** | Content panel column + panel migrations | Upload, Help, Settings, Profile panels; retire overlay (flag on) |
| **5** | Workspace / selection | Per Q2 |
| **6** | Map chrome reposition + breakpoints | Q4 answered |
| **7** | Legacy removal; flag default on | `npm run verify` green; grep cleanup |

### Phase 2 first coding PR (minimal) `[D]`

1. Feature flag `feldpost.ui.gridShell` (name subject to Q9)
2. Empty `GridShellComponent` — four CSS grid tracks
3. Conditional render in `AuthenticatedAppLayoutComponent`
4. Storybook harness for nav/clipping (unblocks workspace-pane spec gate)
5. **Do not** migrate settings/upload/workspace in same PR

---

## 8 · Open questions (block spec lock)

| ID | Question | Blocks |
| --- | --- | --- |
| Q1 | Four-track vs three-track | Phase 1 |
| Q2 | Workspace/selection placement | Phase 5 |
| Q3 | Upload: rail only vs keep workspace Upload tab | Phase 4 |
| Q4 | Tablet/mobile layout | Phase 6 |
| Q6 | Full left top-container route list | Phase 3 |
| Q8 | Right inter-container gap token | Phase 3 |
| Q9 | Feature flag name + rollout | Phase 2 |
| Q10 | Notifications, undo/history, tips — v1 or defer | Phase 3–4 |

Reply on #257 with decisions (e.g. `Q2: A — workspace panel in content column`).

---

## 9 · Planning acceptance criteria (#257)

- [ ] Owner confirms four-track grid
- [ ] Owner confirms **separate frosted containers** inside backgroundless control areas (§3)
- [ ] Owner confirms left bottom container: Profile, Coworkers?, Organisation?, Settings
- [ ] Owner confirms Settings + Profile as separate content panels
- [ ] Owner confirms hover overlay labels (no layout push)
- [ ] Owner confirms panel stack (multiple panels open) or revises §4.1
- [ ] Q1–Q10 answered or deferred with rationale
- [ ] STUDY-014 → `accepted`
- [ ] Implementation epics filed

**Do not merge spec or implementation PRs until the above are checked.**

---

## 10 · What this study could not prove

| Gap | What would settle it |
| --- | --- |
| Exact rail width token | Measure 44 px + padding in spec with design tokens |
| Mobile layout | Owner answer Q4 |
| Widget-modularity interaction | Owner answer #258 Q20; likely shell first, widget list second `[D]` |
| Workspace pane fate | Owner answer Q2 |

---

## 11 · Verification (implementation)

- `npm run verify` after every PR
- Sensitive class: ownership matrices, FSM tests, red-test-first for settings URL sync and share restore
- LIVE CHECK: map pan/zoom under hover labels; upload E2E from rail; settings deep links in panel mode
