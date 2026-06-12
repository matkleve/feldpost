# Upload panel — design audit (2026-05-17)

**Scope:** `apps/web/src/app/features/upload/upload-panel.component.{html,scss,ts}`, `upload-panel-item.component.{html,scss,ts}`  
**Contracts:** [`docs/specs/component/upload/upload-panel.md`](../../specs/component/upload/upload-panel.md), [`upload-panel-system.md`](../../specs/ui/upload/upload-panel-system.md), [`upload-panel.feedback-triage.md`](../../specs/component/upload/upload-panel.feedback-triage.md)

This report is **migration-adjacent documentation** (like [dropdown deep analysis](./dropdown-deep-analysis-2026-05-17.md)): it does not complete a token batch by itself. Use it to queue **i18n**, **spec sync**, **SCSS ownership**, and **visual QA** work without duplicating status paragraphs in [`docs/migration/README.md`](../README.md).

---

## 1. Executive summary

- **Ship blockers (product + governance):** Hardcoded **German** labels on `app-project-select-dialog`; multiple **English-hardcoded** intake strings and some **non-i18n** `aria-label` fragments. Violates mandatory i18n workflow ([`.cursor/rules/i18n-workflow.mdc`](../../../.cursor/rules/i18n-workflow.mdc)).
- **Spec vs code:** Upload panel spec still mandates **strict layout primitives** / **`.ui-item`** row geometry; implementation uses **custom BEM** and a different DOM shape — treat as **drift** until spec or code is reconciled ([`phase-11-spec-sync.md`](../phase-11-spec-sync.md)).
- **SCSS ownership:** Row surface styles exist in **both** `upload-panel.component.scss` and `upload-panel-item.component.scss` under the same `upload-panel__*` BEM — drift risk; consolidate when touching upload SCSS ([`phase-8-global-scss-elimination.md`](../phase-8-global-scss-elimination.md) hygiene + component rules).
- **Motion / tokens:** Literal durations (`120ms`, `0.15s`, `700ms`, `2s`) bypass motion tokens — align with [`phase-7-token-migration.md`](../phase-7-token-migration.md) and [`docs/design/motion.md`](../../design/motion.md).
- **Visual behavior:** Interactive row **hover hides thumbnail** while triage still mentions **hover preview** gaps — reconcile UX intent before Phase 10 spot-check ([`phase-10-visual-qa.md`](../phase-10-visual-qa.md)).

---

## 2. Findings (detail)

### 2.1 i18n (P0)

| Issue | Location | Note |
|-------|----------|------|
| `confirmLabel="Auswaehlen"` / `cancelLabel="Abbrechen"` | `upload-panel.component.html` → `app-project-select-dialog` | Must use `t(key, fallback)` + workbench CSV + `seed_i18n.sql` pipeline |
| Title, subtitle, “Upload folder”, “Take photo” | `upload-panel.component.html` | Replace with `t(...)` |
| English concatenated `aria-label` on row main button | `upload-panel-item.component.html` | Use keyed strings |
| `aria-label="File name"`, section `aria-label="Upload files"` | templates | Keyed i18n |

### 2.2 Spec / structure (P1)

- **`upload-panel.md` § Component hierarchy:** “STRICT PRIMITIVE REQUIREMENT”, `.ui-item`, flat DOM — **not** reflected in current templates.
- **Root “unstyled” wording:** Outer `.upload-panel` carries layout-only flex/gap (fine); spec prose can clarify “no chrome on root” vs “layout allowed.”
- **Lane switch class:** `upload-panel__area--switch` without base `upload-panel__area` — matches “no card on lane strip” but **BEM naming** is misleading (not a compiled `&__area--switch` child today); future edits could accidentally add card styles.

### 2.3 Visual / interaction (P1–P2)

- **Hover vs thumbnail:** `.upload-panel__file-main--interactive:hover .upload-panel__thumbnail-helper { opacity: 0 }` vs triage “hover thumbnail preview” — align spec + triage + implementation.
- **Row menu:** TS implements **down-first** with upward fallback (`rect.bottom` / `rect.top - menuHeight`) — matches component spec; triage “opens upward first” may refer to another path or be stale.

### 2.4 SCSS / technical debt (P2)

- **Duplicate `.upload-panel__file-*` rules** in parent vs item SCSS.
- **No `@layer components` / `@layer states`** on these files — backlog when refactoring upload SCSS.
- **`::ng-deep`** on `upload-panel__universal-media` — fragile; plan removal with Universal Media API or encapsulation ([`phase-10-visual-qa.md`](../phase-10-visual-qa.md) “no new `::ng-deep`”).

### 2.5 Typography policy (P2)

- Semantic **`h3` / `h4`** carry **`.upload-panel__*title`** classes that set `font-size` / `font-weight` / `line-height`. Repo intent: heading **ramp** from global `styles.scss`; per-context variants should be **global modifier classes** or non-heading elements — verify against [`apps/web/AGENTS.md`](../../../apps/web/AGENTS.md) typography section when refactoring.

### 2.6 Accessibility (verify in QA)

- Drop zone `role="button"` vs sibling real buttons — OK structurally; watch SR **redundancy** (region label + title + control).
- Full-surface **`upload-panel__row-main-action`** — ensure **`:focus-within`** on row remains visible for keyboard users.

---

## 3. Migration phase mapping

| Finding bucket | Primary phase doc | Secondary |
|----------------|-------------------|-----------|
| i18n keys, CSV, SQL seed | **Process** — [i18n-workflow.mdc](../../../.cursor/rules/i18n-workflow.mdc) | — |
| Motion literals → tokens | [phase-7-token-migration.md](../phase-7-token-migration.md) | [`motion.md`](../../design/motion.md) |
| `::ng-deep`, SCSS consolidation, `@layer` | [phase-8-global-scss-elimination.md](../phase-8-global-scss-elimination.md) | Component SCSS ownership rules |
| Cross-theme / hover / row menus | [phase-10-visual-qa.md](../phase-10-visual-qa.md) | High-risk spot-check in same doc |
| Primitives / hierarchy / triage table sync | [phase-11-spec-sync.md](../phase-11-spec-sync.md) | `upload-panel.md`, `upload-panel.feedback-triage.md` |

**Suggested implementation order:** (1) i18n P0, (2) spec/triage reconciliation for primitives + hover story, (3) dedupe SCSS ownership, (4) motion tokens on touch, (5) `::ng-deep` removal when universal-media boundary allows.

---

## 4. Positive notes (keep)

- Surfaces/colors largely use **design tokens** / `color-mix` (not raw hex drift).
- **Lane overflow:** transparent wrapper, **five** visible rows, internal scroll — matches spec.
- **Embedded vs compact:** checkboxes + bulk footer gated on `embeddedInPane()` as specified.
- **Menu anchor:** down-first + viewport clamp in `upload-panel-item.component.ts`.

---

## 5. Related docs

- [`upload-panel.feedback-triage.md`](../../specs/component/upload/upload-panel.feedback-triage.md) — product backlog rows (download, lane stability, segmented switch, etc.); **§ Related audits** links here.
- [`dropdown-system.md`](../../specs/component/filters/dropdown-system.md) — anchored shell / padding rhythm (referenced in upload SCSS comments)
- [`phase-10-visual-qa.md`](../phase-10-visual-qa.md) — **High-risk migration spot-check → Upload panel** bullets derived from this audit.
- [`phase-11-spec-sync.md`](../phase-11-spec-sync.md) — **Recent shipped / doc drift** checklist item for upload-panel primitive vs BEM reconciliation.
