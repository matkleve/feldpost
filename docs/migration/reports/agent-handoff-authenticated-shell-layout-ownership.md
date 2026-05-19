# Agent handoff: Authenticated shell layout — ownership analysis & merge options

Use this document as the **system prompt** (or paste the sections in order) for an implementation-oriented agent. Goal: **classify why the UI reads as “divs stacked” / wrong geometry**, assign **non-overlapping ownership** per repo contracts, propose **safe merges** of wrappers or SCSS, then produce a **closing report** (use §8 verbatim for the reporter agent).

---

## 1. Context (do not re-litigate routing here)

- **Bootstrap:** `AppComponent` → `<router-outlet />` (root) loads lazy authenticated routes.
- **Shell:** `AuthenticatedAppLayoutComponent` (`app-authenticated-app-layout`) hosts:
  - `<app-nav />` — **sibling** of `.authenticated-app-layout` (not inside the flex row).
  - `<div class="authenticated-app-layout">` — `display: flex; flex-direction: row` per `authenticated-app-layout.component.scss`.
  - Inside that: `.authenticated-app-layout__main` → `<router-outlet />` → e.g. `app-map-shell` → `.map-zone`, etc.
- **Symptom (user):** Layout feels like **blocks stacked** instead of a coherent shell (full-height main column, map filling main, nav floating without breaking the column).

DevTools snapshot (reference): `app-root` → `app-authenticated-app-layout` → `app-nav` + `.authenticated-app-layout` (flex) → `__main` → `router-outlet` → `app-map-shell` → `.map-zone`.

---

## 2. Mandatory contracts (read before proposing CSS/HTML)

| Source | Use for |
|--------|---------|
| `docs/design/agent-css-variable-contract.md` | **Global `var(--*)` contract** — all layers; read before any SCSS token edit |
| `docs/design/shell-layout-tokens.md` | **Shell geometry only** — forbidden `--shell-*`, overlay vs nav owners, cross-sibling positioning |
| `docs/migration/reports/agent-token-decision-closure.md` | Phase 7 bridge **done**; layout/shell token rules **effective 2026-05-19** |
| Repository root `AGENTS.md` | Component structure, max depth, no duplicate geometry |
| `.cursor/rules/scss-ownership.mdc` | Who may set `width`/`height`/`flex`/`overflow`; intermediate wrapper rule |
| `.cursor/rules/visual-behavior.mdc` | Ownership triad / matrix (migration cleanup exemption does **not** apply if you introduce **new** layout geometry decisions) |
| `docs/specs/ui/workspace/workspace-pane.md` | Layout host responsibilities (linked from layout SCSS) |
| `docs/specs/component/workspace/sidebar.md` | Nav rail vs map chrome, z-index story |
| `.cursor/skills/component-structure/SKILL.md` | Pre-flight checklist for layout refactors |

---

## 3. Analysis tasks (deliver in your notes before large edits)

### 3.1 Height chain (viewport → map)

Trace **percentage height** and **`min-height: 0`** from `html, body` through:

- `app-root` / `AppComponent` host styles  
- `app-authenticated-app-layout` `:host` (`height: 100%`)  
- `.authenticated-app-layout` and `__main`  
- **Activated route component hosts** (`app-map-shell`, etc.) — especially whether `router-outlet`’s sibling host gets explicit block + `min-height: 0` + `height: 100%`.

**Question to answer:** Which is the **single** “column geometry owner” for the authenticated main column — layout host, `__main`, or map-shell? List any **duplicate** `height: 100%` / `flex` that fight the same concern.

### 3.2 Flex participants vs fixed chrome

Current template order:

1. `app-nav` (fixed; `pointer-events` split on `:host` vs `.sidebar` in `nav.component.scss`)  
2. `.authenticated-app-layout` flex row (`__main` + optional workspace shell)

**Question:** Is “stacked” perception caused by **document flow** (nav not participating in flex — by design) vs **broken flex stretch** (main column not filling viewport)? Separate **intentional** stacking from **bugs**.

### 3.3 Intermediate wrappers (`router-outlet`, ng-container)

Per **intermediate wrapper rule**: structural nodes should carry **zero** layout unless unavoidable (with comment).

**Question:** Does any wrapper between `__main` and `.map-zone` carry forbidden properties? If yes, which file should own that property instead?

### 3.4 Z-index / stacking contexts

Reconcile `app-nav` z-index with map chrome (`docs/design/tokens.md` / sidebar spec). **Question:** Does `AuthenticatedAppLayoutComponent` need to be the sole stacking owner, or is the current split documented and stable?

### 3.5 Map zone vs workspace pane

When `photoPanelOpen()` is true, workspace shell is a **sibling** of `__main` inside the flex row. **Question:** Does the main column shrink correctly (`flex: 1 1 0; min-width: 0`), or does the pane push/stack incorrectly at certain breakpoints?

---

## 4. Possible merges (evaluate; do not assume all are desirable)

| Idea | Risk | Benefit |
|------|------|---------|
| Move `app-nav` inside the flex row as first flex child (still `position: fixed` on inner `.sidebar`) | May affect clipping, tab order, or `overflow: hidden` on row | DOM order matches visual “rail + main” mental model |

**Shipped (2026-05-19):** geometry owner table in `workspace-pane.md` § Authenticated shell geometry ownership; `AppComponent` `:host` `height: 100%`.

**Forbidden (not backlog):** collapse `.authenticated-app-layout` into `:host` flex — gated on Storybook nav-clipping harness; see `workspace-pane.md` § Blocked refactor.

For each merge: cite **which selector becomes sole owner** for column width, main flex growth, and map fill.

---

## 5. Out of scope (unless user explicitly expands)

- Reverting “nav on `app-root`” vs “nav on layout” **without** a written decision in spec + migration note.
- Routing table changes (`app.routes.ts`, `authenticated-app.routes.ts`) without a separate routing review.
- Net-new visual design (new breakpoints, animations) — ownership matrix required first per `visual-behavior.mdc`.
- **Wrapper collapse** (merge `.authenticated-app-layout` into layout `:host` flex): **forbidden** until a Storybook (or equivalent) nav-clipping harness exists — **not scheduled**; normative gate in `docs/specs/ui/workspace/workspace-pane.md` § Blocked refactor.

---

## 6. Deliverables from the analysis agent

1. **Ownership matrix** (behaviour → geometry owner → stacking owner → hit area) for: authenticated shell, main column, map zone, nav rail, workspace pane (when open).  
2. **Height chain diagram** (bullet list from `html` to `.map-zone`).  
3. **Duplicate-geometry report** (same property, two files — must pick one owner or justify exception).  
4. **Recommended merges** (0–3 items) with smallest diff first.  
5. If implementation is done: **`ng build`**, and `npm run design-system:check` if geometry/tokens/panel docs touched.

---

## 7. i18n / specs

- If any **new** user-visible string is introduced, follow `.cursor/rules/i18n-workflow.mdc` (CSV + seed).  
- If behaviour or ownership **changes**, update `docs/specs/component/workspace/sidebar.md` and/or `docs/specs/ui/workspace/workspace-pane.md` **in the same change** as code (feedback-to-spec sync).

---

## 8. Report prompt (paste to a separate “reporter” agent)

Use the text below **verbatim** as the user message (fill bracketed placeholders after the analysis agent finishes):

```text
You are reporting on the Feldpost authenticated app shell layout audit.

Inputs (read these paths in the repo):
- docs/migration/reports/agent-handoff-authenticated-shell-layout-ownership.md
- [PATH_TO_ANALYSIS_NOTES_OR_PR_DESCRIPTION]

Produce a short report with these sections:

1. **Executive summary** (max 5 bullets): What was broken or confusing, what was decided, what changed (if anything).
2. **Ownership table** — Copy the final matrix: Shell | Main column | Map zone | Nav | Workspace pane — columns: Geometry owner (file + selector) | Stacking owner | Notes.
3. **Height chain** — One ordered list from viewport to `.map-zone` with any gap called out (“orphan % height”, “missing min-height: 0”).
4. **Merges** — What was merged or deferred, with one-line rationale each.
5. **Residual risks** — Breakpoints, HMR, `router-outlet` host, or z-index — max 3 bullets.
6. **Verification** — Commands run (e.g. ng build, design-system:check) and result.

Constraints: No new feature scope; report only facts from the inputs and repo. If information is missing, say “not provided” instead of guessing.
```

---

## 9. File index (quick open)

| Area | Path |
|------|------|
| Layout template | `apps/web/src/app/layout/authenticated-app-layout.component.html` |
| Layout SCSS | `apps/web/src/app/layout/authenticated-app-layout.component.scss` |
| Layout TS | `apps/web/src/app/layout/authenticated-app-layout.component.ts` |
| Root shell | `apps/web/src/app/app.component.html`, `app.component.scss` |
| Nav | `apps/web/src/app/features/nav/nav.component.{html,scss,ts}` |
| Map shell entry | `apps/web/src/app/features/map/map-shell/map-shell.component.{html,scss}` (partial `_map-shell-layout.scss`) |
| Routes | `apps/web/src/app/app.routes.ts`, `apps/web/src/app/layout/authenticated-app.routes.ts` |
| Agent CSS variable contract (global) | `docs/design/agent-css-variable-contract.md` |
| Shell/layout token subsection | `docs/design/shell-layout-tokens.md` |

---

## 10. Token decision rules (agents)

**MUST-read before any shell/layout/nav/settings-overlay SCSS token edit:** [`docs/design/agent-css-variable-contract.md`](../../design/agent-css-variable-contract.md) (global layers) + [`docs/design/shell-layout-tokens.md`](../../design/shell-layout-tokens.md) (shell matrix). Closure: [`agent-token-decision-closure.md`](./agent-token-decision-closure.md).

**Forbidden:** new `--shell-*` on `:root` or layout hosts; restored `--overlay-rail-*` or `--layout-sidebar-*` (Phase 7 removed). No `--shell-settings-overlay-left` — never shipped.

**Allowed layers:** tweakcn / typography-baseline globals (`--spacing-*`, `--primary`, …); component `:host` vars per spec (`--settings-overlay-*` on `ss-settings-overlay`, `--sidebar-width-*` on `app-nav`); authenticated column geometry per `workspace-pane.md` § Authenticated shell geometry ownership.

**Decision tree (≤15 lines — same order as shell-layout-tokens.md):**

```text
1. Global color/spacing/radius/shadow/motion? → tweakcn / _typography-baseline.scss (--spacing-3, --primary, …). No --shell-*.
2. Settings overlay panel position or in-panel rail width? → settings-overlay.component.scss (:host --settings-overlay-*; .settings-overlay left/transform). No --shell-*.
3. Nav collapsed/expanded rail? → nav.component.scss :host (--sidebar-width-collapsed, …). No --layout-sidebar-*.
4. Main column / map fill / workspace pane split? → workspace-pane.md geometry owners only. No global bridge.
5. Nav + overlay must share horizontal offset? → DOM siblings: duplicate collapsed-rail literal calc(0.25rem * 12) in overlay left (matches nav --sidebar-width-collapsed). Optional future: AppComponent :host row in spec + matrix — not scheduled.
6. None of the above? → STOP; add spec row (owner element + property) before coding.
```

**Settings overlay horizontal position** is owned by **`.settings-overlay`** `left` in `settings-overlay.component.scss`, **not** a global `--shell-*` unless this handoff’s ownership matrix gains an explicit `AppComponent` `:host` row (future).

---

*Created for cross-agent handoff — layout ownership and “stacked divs” diagnosis (2026-05-18). §10 token rules normative 2026-05-19.*
