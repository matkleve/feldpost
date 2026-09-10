# DEAD CODE — not built, not referenced

This directory is **not** part of the production Angular compilation: `apps/web/tsconfig.app.json` → `exclude` lists `src/app/archive/**/*.ts`. It is kept for historical reference only.

Canonical home of the dead-code rule (moved out of root `AGENTS.md` on 2026-09-10 so that file stays under its 150-line cap; the rule itself is unchanged and still normative).

## Rules

- **Do not** import, extend, or wire these files into production routes or libraries.
- **Do not** cite them in specs, service contracts, or active implementation as a pattern source.
- **Do not** copy SCSS, token names, or component structure from here — the tree is intentionally frozen and may reference removed paths or legacy conventions.

## Current contents (avoid by name)

| Path | What it holds |
| --- | --- |
| `item-grid-legacy/media-page/` | Legacy **`MediaGridComponent`**, **`MediaCardComponent`**, **`MediaLoadingComponent`** (`.ts` / `.html` / `.scss` snapshots) |
| `media-detail-location-single/` | Superseded single-location media-detail slice (see its own `README.md`) |

Keep this table current when anything is archived or removed.
