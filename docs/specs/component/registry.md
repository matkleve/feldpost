# Component Registry

> Source of truth for reusable Angular components in the Feldpost app.
> Consult before creating any new component. If a required variant is absent, flag it — do not invent.

## What It Is

Canonical index of shared selectors, file paths, variant axes, and spec links. [`registry.json`](registry.json) is the source; the three supplements are generated from it so the catalog cannot drift from the code unnoticed.

## What It Looks Like

One parent index plus three generated bodies (markdown tables and bullet entries per component), rendered from `registry.json` by `node scripts/generate-component-registry.mjs`.

| Slice | Body |
| --- | --- |
| Shared primitives, containers, dropdowns, grid, media, dialogs, toasts, account, view toggle | [`registry.primitives-and-layout.supplement.md`](registry.primitives-and-layout.supplement.md) (**`[hlmPillToggle]`** pill shell + **`hlmToggleGroup`** / **`hlmToggleGroupItem`** local helm — **no** global `hlm-toggle-group.scss`) |
| Workspace pane (shell, chrome, footer, toolbar, media detail) | [`registry.workspace-pane.supplement.md`](registry.workspace-pane.supplement.md) |
| Feature-local components, extraction candidates, Figma gaps | [`registry.feature-local.supplement.md`](registry.feature-local.supplement.md) |

## Where It Lives

- **Index (this file):** `docs/specs/component/registry.md`
- **Source:** `docs/specs/component/registry.json`
- **Bodies (generated — do not hand-edit):** `docs/specs/component/registry.*.supplement.md`
- **Generator:** `scripts/generate-component-registry.mjs`
- **Code:** `apps/web/src/app/shared/` and `apps/web/src/app/features/` (per-entry paths in `registry.json`)

## Actions

1. Search the relevant supplement for the UI pattern you need.
2. If found: use the listed selector and pass the documented variant inputs.
3. If the exact variant is missing: stop, flag it in a comment, and ask before implementing.
4. If no component covers the pattern: propose extraction before writing inline HTML.
5. When adding or changing a registered entry, edit `registry.json` — never a supplement — then run `node scripts/generate-component-registry.mjs`.

## Component Hierarchy

- **Parent:** `registry.md` (index + governance links)
- **Children:** `registry.primitives-and-layout.supplement.md`, `registry.workspace-pane.supplement.md`, `registry.feature-local.supplement.md`

## Data

Entry schema in `registry.json`. `useFor` is the prose that makes the reuse gate usable; `notFor` renders as a `Not for` bullet on a live entry and as the status line on a deprecated or stale one.

| Field | Meaning |
| --- | --- |
| `name`, `selector` | Human name and the selector as used in templates |
| `path` | Repo-relative implementation path (a directory when the entry covers a folder) |
| `spec`, `specId` | Repo-relative spec file, and the same path relative to `docs/specs/` without `.md` |
| `useFor` / `notFor` | What the component is for; what it must not be reached for |
| `slice`, `section` | Which supplement and which heading the entry renders under |
| `status` | `active`, `deprecated` (intentionally removed), or `stale` (component gone, entry undecided) |

## Acceptance Criteria

- [ ] New reusable components are checked against the supplements before implementation.
- [ ] Missing variants are flagged rather than duplicated inline.
- [ ] Catalog edits happen in `registry.json`; the supplements are regenerated in the same commit.
