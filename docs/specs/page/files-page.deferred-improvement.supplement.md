# Deferred-improvement surface (supplement)

> **Parent:** [files-page.md](./files-page.md) · **Sibling:** [files-page.bulk-resolution.supplement.md](./files-page.bulk-resolution.supplement.md)
> **Reasoning:** [STUDY-009](../../study/009-tray-question-budget-and-priority.md) idea C · **Issue:** [#232](https://github.com/matkleve/feldpost/issues/232)
> **Code:** `apps/web/src/app/core/media-location-bulk/deferred-location.selection.ts`
> **Status:** counting built and shown 2026-09-20; **the run it should start is blocked on [#219](https://github.com/matkleve/feldpost/issues/219)** — see § What is not built

## What It Is

Two standing figures — *"158 items have no location"* and *"254 items could be located more
precisely"* — shown in the workspace pane's Upload tab, counted from the database rather than from
the current upload batch.

## Why this is a constraint on the budget, not a feature next to it

The address precision principle lets D-09 propose a house number **because it asks**; a silent write
would be fabricated precision. By identical logic, a **suppressed question is a decision taken on
the user's behalf**, and it is legitimate only if the user can see it was taken and can reverse it.

Without this surface, a tray budget ([#233](https://github.com/matkleve/feldpost/issues/233)) is not
"fewer questions" — it is silent data loss, and this repository has the precedent:
[TRAP-021](../../TRAPS.md#trap-021--a-resolution-event-with-zero-subscribers-looks-like-it-resumed-the-job),
a job that looked resolved, was never resumed, and logged nothing. **So this ships with #233, or
#233 does not ship.**

## Why two numbers

One merged number is one the user cannot plan against, because it hides two different jobs:

```
Archiv/2019/IMG_4471.jpg        pending   nothing was established at all
                                          → the job is: where was this taken?

Archiv/Wien/1010/IMG_0090.jpg   partial   "Wien 1010" resolved; no street, no pin
                                          → the job is: which street, which house number?
```

`partial` is the discriminator, and it is not a proxy: `resolveUploadLocationStatus` writes it for
exactly one case — an address was established and coordinates were not, which is the D-10 area-only
result (a city-precision location with no pin, a deliberate outcome rather than a failure). That is
literally *"has a location that could be more precise"*.

Coordinates were the obvious alternative discriminator and are the wrong one twice over: they live
on the linked `locations` row rather than on `media_items`, so every count would need a join; and
the D-10 population this figure is about has no coordinates by design.

## Rules

| # | Rule | Why |
| --- | --- | --- |
| **D1** | Eligibility is `isBulkEligibleStatus` — the same predicate the bulk engine uses. | A badge and a run that disagreed would produce a number the user cannot act on, which is worse than no number. |
| **D2** | The count reads only persisted `media_items` rows: no batch, no `issueKind`, no upload session. | Archive-import deferral and budget suppression leave the same trace. A counter told which mechanism to look for would miss the other. |
| **D3** | Counts are aggregates. Three `count`-only queries, no rows fetched. | A company archive is 40 000 items; a header figure must not cost 40 000 rows. |
| **D4** | The count query and the row classifier are pinned against each other by test. | They are two implementations of one rule, and the point of D1 is that they cannot drift. |
| **D5** | Never a negative figure. The three counts are three statements, not one snapshot. | An upload landing mid-count can push `located + improvable` past `all`. A stale badge is acceptable; a negative one is not. |
| **D6** | A failed count reports the failure and keeps the previous figures. It never shows `0`. | `0` reads as "nothing to do" — the silent-failure shape the constitution forbids. |
| **D7** | The block is hidden when the backlog is empty, and shown with a figure at `0` when only one job is empty. | An empty backlog is not news. Half a backlog is. |

## Why the Upload tab, and why it is not the archive figures

The workspace pane's Upload tab is persistent; the upload **panel's** archive-import figures are
not. Those count `UploadJob`s in the current batch (`computeArchiveImportProgress`) and vanish when
the session ends — which is exactly the gap #232 names, since the backlog outlives the session. The
two blocks sit beside each other and must not be confused: one reports an import in flight, the
other standing work.

## What is not built

| Acceptance criterion | State |
| --- | --- |
| A count visible outside the upload panel, outliving the session | **Built** |
| Distinguishes "no location" from "could be more precise" | **Built** |
| The count uses the same predicate as bulk eligibility | **Built** |
| Suppressed-by-budget items reachable here | **Built structurally** (D2) — untestable end to end until the budget exists |
| Clicking through starts a bulk resolution over exactly those items | **Not built** — see below |

`selectDeferredLocationIds` already produces the exact id set a run needs, and
`BulkResolutionService.plan()` / `.run()` are built and tested. What is missing is R7's
confirmation — nothing may be written until the user confirms an exact count and address — and that
dialog is [#219](https://github.com/matkleve/feldpost/issues/219). Rendering a second, smaller
confirmation here would be the second write path
[files-page.bulk-resolution.supplement.md](./files-page.bulk-resolution.supplement.md) exists to
prevent, so the figures are deliberately inert until #219 lands.

## Evidence

| Claim | Grade | Tracked in |
| --- | --- | --- |
| The classifier and the aggregate counts agree on any population | `[A]` — both run over the same fixture in `deferred-location-count.service.spec.ts` | — |
| The count queries return what they claim against a real database | `[D]` — never executed; no database URL, CLI or credentials in the build environment, as for Phases 5.5/5.6 | [#234](https://github.com/matkleve/feldpost/issues/234) |
| `partial` is emitted in production for the D-10 area-only case | `[C]` — the writer is unit-tested; that production rows carry it is not measured | [#218](https://github.com/matkleve/feldpost/issues/218) |

## Acceptance Criteria

- [x] Two figures, counted from the database, visible in a surface that outlives the upload session
- [x] "Has no location" and "could be more precise" are separate numbers, never merged
- [x] The count uses `isBulkEligibleStatus`, and a test pins it against the row classifier
- [x] Counting a 40 000-item library fetches no rows
- [x] A count failure shows the failure, not a zero
- [ ] Clicking a figure starts a bulk resolution over exactly those items — blocked on #219
- [ ] Budget-suppressed items verified reachable here — blocked on #233
