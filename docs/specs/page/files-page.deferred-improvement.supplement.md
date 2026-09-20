# Deferred-improvement surface (supplement)

> **Parent:** [files-page.md](./files-page.md) · **Sibling:** [files-page.bulk-resolution.supplement.md](./files-page.bulk-resolution.supplement.md)
> **Reasoning:** [STUDY-009](../../study/009-tray-question-budget-and-priority.md) idea C · **Issue:** [#232](https://github.com/matkleve/feldpost/issues/232)
> **Code:** `apps/web/src/app/core/media-location-bulk/deferred-location.selection.ts`
> **Status:** built end to end 2026-09-20 — figures, confirmation and run. Counts live-verified against the project database the same day.

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

## What clicking a figure does

```
click "254 items could be located more precisely"
  → DeferredLocationFetchService.loadBucket('improvable')      the set, frozen here (R1)
  → BulkResolutionService.plan(rows, { source: 'folder' })     writes nothing
  → app-bulk-resolution-dialog                                 exact count, exact addresses (R7)
  → user confirms
  → BulkResolutionService.run(plan, { onProgress })            one geocode per address (R5)
  → DeferredLocationCountService.refresh()                     recount, never a delta
```

**The set is frozen at open.** `confirm()` never re-queries: an upload landing while the user reads
the confirmation is not in the set they agreed to, and appears in the next recount instead. That is
R1, enforced as behaviour rather than as a comment.

**The recount is a recount, not arithmetic.** Subtracting `report.resolved` from the badge would
drift the first time anything else writes a location.

| # | Rule | Why |
| --- | --- | --- |
| **D8** | Each figure is its own action. | They are different jobs; one "resolve everything" button would merge them again at the point the user acts. |
| **D9** | The overwrite toggle (B3) does not appear in this flow. | The buckets are bulk-eligible by construction, so `already_resolved` cannot occur and the control could not change anything. The dialog derives this from the plan, so no caller has to know it. |

## Evidence## Evidence

| Claim | Grade | Evidence |
| --- | --- | --- |
| The classifier and the aggregate counts agree on any population | `[A]` | Both run over the same fixture in `deferred-location-count.service.spec.ts` |
| The count queries return what they claim against a real database | `[A]` | Run on the project database 2026-09-20: `all 20, located 15, partial 0` → `no_location 5`, which is exactly the 4 `pending` + 1 `unresolvable` rows present |
| The counts are organization-scoped by RLS, with no predicate in the adapter | `[A]` | Policy `media_items: org read` is `organization_id = user_org_id()`. Simulated as `authenticated`: a member of the owning org counts 20, a subject in no org counts **0** |
| `NOT IN` would have dropped NULL-status rows | `[A]` | On the same engine, over `('resolved','gps','pending','partial',NULL)`: `IN` matches 2, `NOT IN` matches 2, `count(*) − IN` gives **3**. The subtraction is why the adapter does not use `NOT IN` |
| `partial` is emitted in production for the D-10 area-only case | `[D]` | **Zero `partial` rows exist** on the project database (15 `resolved`, 4 `pending`, 1 `unresolvable`). The writer is unit-tested; that it ever fires in practice is unobserved. Tracked in [#218](https://github.com/matkleve/feldpost/issues/218) |
| A bulk run over a figure writes correct locations | `[D]` | Unexercisable on the project database: all 20 rows have `relative_path` NULL **and** `exif_latitude` NULL, so no source yields an address. Every item plans as `no_address_in_source` — which is why the dialog has a `nothing-to-do` state. Tracked in [#236](https://github.com/matkleve/feldpost/issues/236) |

## Acceptance Criteria

- [x] Two figures, counted from the database, visible in a surface that outlives the upload session
- [x] "Has no location" and "could be more precise" are separate numbers, never merged
- [x] The count uses `isBulkEligibleStatus`, and a test pins it against the row classifier
- [x] Counting a 40 000-item library fetches no rows
- [x] A count failure shows the failure, not a zero
- [x] Clicking a figure starts a bulk resolution over exactly those items
- [x] Nothing is written before the user confirms an exact count and address (R7)
- [ ] Budget-suppressed items verified reachable here — structurally in place (D2); untestable until #233
