# Documentation audits (`docs/audits/`)

**Purpose:** Point-in-time inventories, move passes, and gap analyses. These files are **not** implementation contracts and can drift as the tree changes.

## How to read this folder

| Kind | Meaning | Action |
| --- | --- | --- |
| **Historical** | Dated pass (e.g. `2026-04-15`) recording what moved where | Use for archaeology only; do not drive new behavior from tables alone. |
| **Reference** | Product or UX investigation that may still inform design | Cross-check against `docs/design/` and current `docs/specs/` before relying on it. |
| **Superseded** | Entire approach replaced (e.g. old filter panel) | Prefer linked current spec in `docs/specs/`. |

**Normative contracts** always live under **`docs/specs/`** (see [`docs/specs/README.md`](../specs/README.md) and [`docs/specs/service/README.md`](../specs/service/README.md)). The removed **`docs/implementation-blueprints/`** folder is not coming back — link to specs instead.

## File index

| File | Kind | Summary |
| --- | --- | --- |
| [file-status-consolidated-2026-04-15.md](file-status-consolidated-2026-04-15.md) | Historical | Large per-path MOVED/ARCHIVED/PROTECTED matrix from doc cleanup. |
| [file-status-counts-2026-04-15.md](file-status-counts-2026-04-15.md) | Historical | Aggregate counts for that pass. |
| [moved-all-files-2026-04-15.md](moved-all-files-2026-04-15.md) | Historical | MOVED list snapshot. |
| [root-docs-coverage-2026-04-15.md](root-docs-coverage-2026-04-15.md) | Historical | Coverage notes for root docs. |
| [root-docs-move-pass-2026-04-15.md](root-docs-move-pass-2026-04-15.md) | Historical | Move pass log. |
| [root-docs-open-after-move-2026-04-15.md](root-docs-open-after-move-2026-04-15.md) | Historical | Open items after move (German headings). |
| [untouched-files-updated-root-and-readme-2026-04-15.md](untouched-files-updated-root-and-readme-2026-04-15.md) | Historical | README touch list. |
| [ui-containers-audit.md](ui-containers-audit.md) | Reference | Container system research / plan (2026-03-25); verify against current layout specs before execution. |

When adding a new audit, prefix the filename with an ISO date, add one row here, and include the standard banner at the top of the audit file (see existing files after this README lands).
