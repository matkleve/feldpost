# Bulk Resolution Dialog

## What It Is

The confirmation between `BulkResolutionService.plan()` and `.run()`. It states the exact item count, the exact addresses, and what the run will **not** do — then applies, reports progress, and reports the outcome including failures.

## What It Looks Like

A modal with one stable state showing at a time: the plan (count, lookup cost, one row per address, skipped reasons, optional overwrite), or progress, or the final report. Cancel is always present; Apply exists only while the plan is confirmable.

## Where It Lives

- **Code:** `apps/web/src/app/shared/bulk-resolution-dialog/`
- **Contract:** [files-page.bulk-resolution.supplement.md](../../page/files-page.bulk-resolution.supplement.md) · **Issue:** [#219](https://github.com/matkleve/feldpost/issues/219)
- **Consumers:** the upload panel's deferred-location figures ([#232](https://github.com/matkleve/feldpost/issues/232)); the `/files` selection when that page exists.

## Why it is not `app-confirm-dialog`

That component takes `message: string` and renders it. R7 requires an exact count *and* an exact address, R5 requires the geocode cost to be visible rather than implied, and B2 requires skipped items to be shown rather than swallowed. None of those are one string, and none project into a `message` input.

## Actions

| #   | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1   | Reads the plan | Nothing is written | mount |
| 2   | Clicks Apply | `confirmed` emits; host calls `run(plan)` | button click |
| 3   | Clicks Cancel / Close | `cancelled` emits; nothing is written | button click |
| 4   | Toggles overwrite | `overwriteToggled` emits the new value | checkbox change |
| 5   | Plan has no eligible item | `nothing-to-do` renders; **no Apply is offered** | derived from `plan` |

## Component Hierarchy

```text
app-bulk-resolution-dialog
├── header (title)
├── body — exactly one of: confirming | nothing-to-do | running | done
└── actions (cancel/close + apply)
```

Nesting exceeds three levels through the dialog portal (`brnDialog → brnDialogContent → hlmDialogContent`). That structure is the shared dialog idiom, copied from `confirm-dialog.component.html` rather than invented here; the component's own content is three levels.

## Ownership Matrix

| Concern | Owner | Notes |
| --- | --- | --- |
| Open/close lifecycle | **Parent** | The component is mounted while open, unmounted otherwise; it has no `visible` input |
| Which stable state renders | **Component** | `stage()` derives it from `plan` / `running` / `report`; never set from outside |
| Plan contents | **`BulkResolutionService.plan()`** | The component formats, it never recomputes eligibility or grouping |
| Writing | **Parent** | The component calls no service and holds no run state |
| Progress values | **`run()`'s `onProgress`** | Passed down as an input; the component does not count |
| Overwrite decision (B3) | **Parent** | Component emits the toggle; the parent re-plans if it honours it |
| Geometry / spacing | **Component SCSS** | `.bulk-dialog__*`, one property per purpose |
| Dialog chrome, overlay, buttons | **Shared `hlm` / `brn` directives** | Not restyled here |

## Stable states (FSM)

| State | Entered when | Apply offered | Terminal |
| --- | --- | --- | --- |
| `confirming` | a plan with `eligibleCount > 0`, not running, no report | yes | no |
| `nothing-to-do` | a plan with `eligibleCount === 0` | **no** | no |
| `running` | `running` is true and no report yet | no | no |
| `done` | a `report` is present | no | **yes** |

`report` outranks `running`, so a late progress callback cannot pull a finished run back into `running`. The states are mutually exclusive by `@switch`, not by CSS.

**Why `nothing-to-do` is its own state.** A plan that writes nothing is a correct outcome, not an error. Verified against the project database on 2026-09-20: all five unresolved items are PDFs with `relative_path` NULL and no EXIF, so no source yields an address and the planner skips all five as `no_address_in_source`. Offering Apply there would write nothing and read as a broken button.

## Data

| Input | Type | Purpose |
| ----- | ---- | ------- |
| `plan` | `BulkResolutionPlan \| null` | What will be written; the thing being confirmed |
| `running` | `boolean` | A run is in flight |
| `progress` | `{ done: number; total: number } \| null` | From `run()`'s `onProgress` |
| `report` | `BulkResolutionReport \| null` | Terminal outcome, including `failed` and `completed` |
| `overwriteExisting` | `boolean` | B3; **false unless the parent says otherwise** |

The overwrite checkbox renders only when overwriting would change something — that is, when the plan skipped at least one item as `already_resolved`, or the parent already set it. A caller whose set is bulk-eligible by construction, like the deferred-location figures, can never produce one, and a control that does nothing either way is worse than no control.

## Outputs

| Output | Payload | When |
| --- | --- | --- |
| `confirmed` | `void` | Apply clicked |
| `cancelled` | `void` | Cancel or Close clicked |
| `overwriteToggled` | `boolean` | Overwrite checkbox changed |

## Acceptance Criteria

- [x] The plan renders before anything is written (R7)
- [x] Confirm emits once; cancel emits and writes nothing
- [x] Progress shows `done` of `total` from `run`'s `onProgress`
- [x] Skipped items are shown grouped by reason, never swallowed
- [x] Overwrite (B3) is off by default and shown only where it has an effect
- [x] A report with `failed > 0` reports the failures rather than claiming success
- [x] An incomplete run is marked incomplete rather than presented as finished
- [x] A plan with nothing to do says so and offers no Apply
