# Phase 10 — Manual visual matrix gap (2026-05-18)

**Context:** [Phase 10 — Visual QA & polish](../phase-10-visual-qa.md) **Wave P4** expects a human **Screen checklist** and **High-risk migration spot-check** pass (three themes × viewports × key surfaces).

**Revision (same date, doc follow-up):** extended this file with a **row-level unverified inventory**, **matrix additions** synced to the app route table (read-only route survey for gap honesty — not a browser run), and explicit separation between **desk audits** and **visual sign-off**. Still **no** interactive browser session in this lane.

**Revision (2026-05-19):** § **Legacy token verification (desk)** — grep gates + Token theme checklist rows linked to [legacy-token-deletion-status-2026-05-19.md](./legacy-token-deletion-status-2026-05-19.md).

**What ran in this agent slice**

- **Automated / doc-only:** cross-links from `phase-10-visual-qa.md`; no headless or manual UI session.
- **Build / design system (repo verification):** `cd apps/web && npx ng build` → exit **0**; `npm run design-system:check` (repo root) → exit **0** — same day as this note (stdout captured for migration queue confidence only; not a substitute for visual sign-off).

**Gap (explicit)**

- **Screen checklist** table in `phase-10-visual-qa.md` — all rows still **unchecked**; no **Pass / Fail** recorded here.
- **Tight smoke** bullets (dropdowns, settings overlay, projects card view, workspace media detail, map shell, pill toggles, upload panel) — **not** exercised in a browser this slice.
- **High-risk spot-check** sections — **not** exercised.
- **Stacking sanity**, **Token theme checklist**, **Interactive state matrix**, and **Acceptance criteria** table in the phase doc — **not** evidenced by a human run; treat as **open** until checklist rows are filled.

**Desk research / code-adjacent reports (do *not* count as Phase 10 Pass)**

These inform risk and copy/layout intent; they are **not** three-theme browser verification:

- [`settings-overlay-notion-adjacent-ux-2026-05-18.md`](./settings-overlay-notion-adjacent-ux-2026-05-18.md) — product-pattern notes, not pixels.
- [`settings-overlay-sections-layout-audit-2026-05-17.md`](./settings-overlay-sections-layout-audit-2026-05-17.md), [`upload-panel-design-audit-2026-05-17.md`](./upload-panel-design-audit-2026-05-17.md), [`dropdown-deep-analysis-2026-05-17.md`](./dropdown-deep-analysis-2026-05-17.md) — structure / audit angles.
- [`phase-10-migration-smoke-gates-2026-05-18.md`](./phase-10-migration-smoke-gates-2026-05-18.md) — **automated** gates only (`design-system:check`, `ng build`, `styles` row, grep-style guards where logged).

---

## Screen checklist — row status (honest)

**Rule:** Until a human records **Pass** (or **Fail** + ticket) in `phase-10-visual-qa.md`, every row below is **Unverified** — not “pending pass,” not implied green from CI.

| Phase 10 screen checklist row | Light | Dark | Sandstone | Evidence this lane |
| ----------------------------- | ----- | ---- | --------- | ------------------- |
| Login | — | — | — | None (no browser) |
| Register | — | — | — | None |
| Reset password | — | — | — | None |
| Update password | — | — | — | None |
| Map view (primary) | — | — | — | None |
| Projects — table view | — | — | — | None |
| Projects — card view | — | — | — | None |
| Projects — project-scoped URL (`/projects/:projectId`) | — | — | — | None — **added to parent matrix 2026-05-18**; same page component, selection/deep-link state still needs theme × viewport pass |
| Media — list layout | — | — | — | None |
| Media — grid layout | — | — | — | None |
| Media — toolbar (sort/filter/group/view toggles) | — | — | — | None |
| Anchored toolbar menus — Filter / Sort / Grouping (375px + desktop) | — | — | — | None |
| Toast / inline error surfaces (stacking + themes) | — | — | — | None |
| Map shell — clustering, markers, style switch | — | — | — | None |
| Settings overlay — General | — | — | — | None |
| Settings overlay — Appearance | — | — | — | None |
| Settings overlay — Notifications | — | — | — | None |
| Settings overlay — Map | — | — | — | None |
| Settings overlay — Search | — | — | — | None |
| Settings overlay — Data | — | — | — | None |
| Settings overlay — Account | — | — | — | None |
| Settings overlay — Invite | — | — | — | None |
| Settings — deep URL (`/settings/:section/:subsection`) | — | — | — | None — **added to parent matrix 2026-05-18**; rail + subsection sync + refresh/deep-link |
| Upload panel — location mode + lane switch | — | — | — | None |
| Workspace pane — media detail | — | — | — | None |
| Workspace pane — groupings | — | — | — | None |
| Workspace pane — collapsed / narrow | — | — | — | None |
| Dialog — confirm | — | — | — | None |
| Dialog — text input | — | — | — | None |
| Dialog — project select | — | — | — | None |
| Dialog — share link audience | — | — | — | None |
| Photo lightbox | — | — | — | None |
| Nav — desktop | — | — | — | None |
| Nav — mobile | — | — | — | None |

**Optional parity (same shell, still needs explicit pass if treated as a release surface):** authenticated **`/`** default map vs explicit **`/map`** — if QA policy is “one row covers both,” document that in the pass report; otherwise exercise both URLs once.

---

## High-risk spot-check — status (honest)

All bullet groups in **High-risk migration spot-check** and **Tight smoke** in `phase-10-visual-qa.md` remain **Unverified** here (map shell, settings rail/tokens, pill toggles, upload panel, theme smoke, dropdowns/menus).

---

## Legacy token verification (desk)

**Context:** Phase 7 is **Done** — the on-disk bridge is **removed**. Phase 10 must still **visually** sign off that tweakcn themes did not regress. Full deletion inventory: [legacy-token-deletion-status-2026-05-19.md](./legacy-token-deletion-status-2026-05-19.md).

**Rule:** **Desk grep green** does **not** replace **Token theme checklist** browser rows in [phase-10-visual-qa.md](../phase-10-visual-qa.md#token-theme-checklist).

### Automated / desk gates (2026-05-19)

| Gate | Command / check | Expected | This lane (2026-05-19) |
| ---- | ----------------- | -------- | ---------------------- |
| Legacy bridge file absent | `rg 'legacy-design-tokens\|_legacy-design-tokens' apps/web` | 0 matches | **Pass** (desk) |
| `tokens.scss` absent | `test ! -f apps/web/src/styles/tokens.scss` | absent | **Pass** (desk) |
| No legacy `load-css` | `rg 'load-css.*legacy' apps/web` | 0 matches | **Pass** (desk) |
| No Feldpost v1 `var(--color-*)` in app SCSS | `rg 'var\(--color-' apps/web/src/app --glob '*.scss'` | 0 matches | **Pass** (desk) |
| No `var(--fp-*)` in runtime | `rg 'var\(--fp-' apps/web/src` | 0 matches | **Pass** (desk) |
| `styles/` partial count | `ls apps/web/src/styles/` | 7 files, no `_legacy-design-tokens.scss` | **Pass** (desk) |
| Tailwind legacy **utility names** still wired | `rg 'bg-bg-base\|bg-surface\|text-text-primary' apps/web/src -g '*.{html,ts,scss}'` | small CVA set → `tailwind.config.js` | **Known remainder** — not a bridge file; Phase 5/8 v4 tail |

### Token theme checklist — browser (still open)

Maps to [phase-10-visual-qa.md § Token theme checklist](../phase-10-visual-qa.md#token-theme-checklist). Record **Pass / Fail** in the **parent** phase doc after a real browser run.

| Theme | Surfaces to spot-check (minimum) | Light | Dark | Sandstone | Evidence this lane |
| ----- | -------------------------------- | ----- | ---- | --------- | ------------------- |
| Default (light) | Map shell, settings overlay rail, toolbar menu panel, upload panel thumb row | — | — | — | None (no browser) |
| `[data-theme="dark"]` | Muted surfaces + map markers + toast stack | — | — | — | None |
| `[data-theme="sandstone"]` | Borders, focus rings, settings action hover wash | — | — | — | None |

**Human sign-off prompt:** After theme toggles, confirm **no** washed-out `muted` panels, **no** invisible map markers, and **no** focus rings that disappear on sandstone — failures may indicate per-component `:host` mixes, not a missing global bridge (grep gates above would still pass).

---

## Next human run

- Use **ThemeService** (or equivalent) for **`default`**, **`[data-theme="dark"]`**, **`[data-theme="sandstone"]`**; hard-refresh between theme switches per phase doc.
- Minimum viewports: **375×812**, **1280×800**, **1920×1080**; then update the checklist in `phase-10-visual-qa.md` or append a dated pass report under `docs/migration/reports/`.
- When signing a row, record **Pass** or **Fail + issue link** in the parent checklist only after **browser** verification — automated gates and desk audits are supplementary, not substitutes.
