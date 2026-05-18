# Component Registry

> Source of truth for reusable Angular components in the Feldpost app.
> Consult before creating any new component. If a required variant is absent, flag it — do not invent.

## What It Is

Canonical index of shared selectors, file paths, variant axes, and spec links. Detail tables live in linked supplement files so this parent stays within the spec line budget.

## What It Looks Like

One parent index plus three split-out bodies (markdown tables and bullet entries per component).

| Slice | Body |
| --- | --- |
| Shared primitives, containers, dropdowns, grid, media, dialogs, toasts, account, view toggle | [`registry.primitives-and-layout.supplement.md`](registry.primitives-and-layout.supplement.md) (**`[hlmPillToggle]`** pill shell + **`hlmToggleGroup`** / **`hlmToggleGroupItem`** local helm — **no** global `hlm-toggle-group.scss`) |
| Workspace pane (shell, chrome, footer, toolbar, media detail) | [`registry.workspace-pane.supplement.md`](registry.workspace-pane.supplement.md) |
| Feature-local components, extraction candidates, Figma gaps | [`registry.feature-local.supplement.md`](registry.feature-local.supplement.md) |

## Where It Lives

- **Index (this file):** `docs/specs/component/registry.md`
- **Bodies:** `docs/specs/component/registry.*.supplement.md`
- **Code:** `apps/web/src/app/shared/` and `apps/web/src/app/features/` (per-row paths in supplements)

## Actions

1. Search the relevant supplement for the UI pattern you need.
2. If found: use the listed selector and pass the documented variant inputs.
3. If the exact variant is missing: stop, flag it in a comment, and ask before implementing.
4. If no component covers the pattern: propose extraction before writing inline HTML.
5. When adding or changing a registered entry, edit the appropriate **supplement** file first, then run `node scripts/lint-specs.mjs` from the repo root.

## Component Hierarchy

- **Parent:** `registry.md` (index + governance links)
- **Children:** `registry.primitives-and-layout.supplement.md`, `registry.workspace-pane.supplement.md`, `registry.feature-local.supplement.md`

## Acceptance Criteria

- [ ] New reusable components are checked against the supplements before implementation.
- [ ] Missing variants are flagged rather than duplicated inline.
- [ ] Supplement edits keep per-row paths and spec links accurate.
