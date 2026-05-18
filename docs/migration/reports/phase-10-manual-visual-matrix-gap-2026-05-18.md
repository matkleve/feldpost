# Phase 10 — Manual visual matrix gap (2026-05-18)

**Context:** [Phase 10 — Visual QA & polish](../phase-10-visual-qa.md) **Wave P4** expects a human **Screen checklist** and **High-risk migration spot-check** pass (three themes × viewports × key surfaces).

**What ran in this agent slice**

- **Automated / doc-only:** cross-links from `phase-10-visual-qa.md`; no headless or manual UI session.
- **Build / design system (repo verification):** `cd apps/web && npx ng build` → exit **0**; `npm run design-system:check` (repo root) → exit **0** — same day as this note (stdout captured for migration queue confidence only; not a substitute for visual sign-off).

**Gap (explicit)**

- **Screen checklist** table in `phase-10-visual-qa.md` — all rows still **unchecked**; no **Pass / Fail** recorded here.
- **Tight smoke** bullets (dropdowns, settings overlay, projects card view, workspace media detail, map shell, pill toggles, upload panel) — **not** exercised in a browser this slice.
- **High-risk spot-check** sections — **not** exercised.

**Next human run**

- Use **ThemeService** (or equivalent) for **`default`**, **`[data-theme="dark"]`**, **`[data-theme="sandstone"]`**; hard-refresh between theme switches per phase doc.
- Minimum viewports: **375×812**, **1280×800**, **1920×1080**; then update the checklist in `phase-10-visual-qa.md` or append a dated pass report under `docs/migration/reports/`.
