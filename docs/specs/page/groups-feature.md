# Groups feature (reserved)

## What It Is

Reserved `apps/web/src/app/features/groups` module for future organization **groups** management (distinct from workspace **grouping** of media). No routes or components are shipped yet; this document closes the registry gap and defines the contract boundary when work starts.

## What It Looks Like

Not implemented. Expectation: a management surface similar in ambition to [projects-page.md](projects-page.md) (list/detail, org-scoped actions) unless a superseding UX spec replaces it.

## Where It Lives

- **Code folder**: `apps/web/src/app/features/groups/` (empty placeholder).
- **Routes**: None in `app.routes.ts` today; add this spec’s **Where It Lives** when a path is introduced.
- **Not to confuse**: Workspace [grouping operators](../ui/workspace/workspace-pane.md) and project grouping live under map/workspace specs.

## Actions

| #   | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1   | _N/A_       | _No UI_         | _—_      |

## Component Hierarchy

```text
(reserved)
└── [future] GroupsFeature shell + child components (TBD)
```

## Data

Future: org-scoped groups tables and RLS — define in service specs and migrations when implemented.

## State

None shipped.

## File Map

| File              | Purpose                    |
| ----------------- | -------------------------- |
| `features/groups/` | Placeholder directory     |

## Wiring

None until components exist; link child component specs from here instead of inlining matrices.

## Acceptance Criteria

- [ ] First implementation adds routes, updates this page, and adds component specs under `docs/specs/component/` or `docs/specs/ui/` as appropriate.
- [ ] Docs distinguish **groups** (org entities) from **grouping** (workspace view) using glossary terms.
- [ ] Registry `code_path` remains aligned with `apps/web/src/app/features/groups`.
