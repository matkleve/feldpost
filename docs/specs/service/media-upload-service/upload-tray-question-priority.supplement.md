# Tray question priority (supplement)

> **Parent:** [upload-resolver-tray-orchestrator.md](./upload-resolver-tray-orchestrator.md)
> **Reasoning:** [STUDY-009](../../../study/009-tray-question-budget-and-priority.md) idea A · **Issue:** [#231](https://github.com/matkleve/feldpost/issues/231)
> **Code:** `apps/web/src/app/core/upload/location/tray-question-priority.ts`
> **Status:** implemented 2026-09-20; **classification only — no runtime caller until the budget ([#233](https://github.com/matkleve/feldpost/issues/233))**

## What It Is

A pure, static table mapping `UploadDisambiguationKind` to one of three priorities, plus the single
gate that says which of them a question budget is allowed to suppress. It changes what no question
asks, suppresses nothing, and renders nothing.

## Why kind, and not distance

The original proposal used distance: *"questions about being 20 metres off are low priority."*
Distance measures how wrong an answer can be in metres. It does not measure what breaks. Two
questions at the same 20 m, opposite stakes:

```
Thalistraße 4  vs  Thalistraße 6    adjacent buildings, one owner, one job
                                    wrong → the photo sits 20 m off on a map, nobody is harmed

Thalistraße 4  vs  Thalistraße 4a   two properties, two clients, a damage claim on one
                                    wrong → evidence is filed against the wrong party
```

Distance cannot tell these apart, because what differs is the **consequence of the field being
wrong**, not the magnitude of the error. That consequence is a property of the question's kind,
which every group already carries as `disambiguationKind`.

## The table

The line falls at **"is the item findable and in the right place?"** Everything `critical`/`high`
answers that. Everything `low` refines an answer that is already correct.

| Kind | What it decides | Priority | What a wrong answer costs |
| --- | --- | --- | --- |
| `admin_level_conflict` | city / state / country | `critical` | `Halle` resolved as Hallein (Salzburg) instead of Halle (Tirol) — the item is in the wrong Bundesland and search never finds it |
| `city_step` | the city, when the path gave only a street | `critical` | `Thalistraße 4/` with no city is not an address; there are Thalistraßen in several Gemeinden |
| `source` | text vs EXIF disagreement | `critical` | path says `Wien/1010/Stephansplatz/`, EXIF says Graz — pick wrong and the item lands somewhere it never was |
| `containment_check` | whether a point is inside a claimed area | `high` | wrong area assignment: misleading, but the coordinates are still right |
| `layer_package` | which package of address fields wins | `high` | mixed evidence from two places in the path |
| `geocode` | which of several geocode hits | `high` | `Kirchengasse 11` exists in Wien, Graz and Linz — same street, different town |
| `house_step` | which house number on an already-correct street | `low` | right street, right city, imprecise by one building |

`house_step` ships today, so the table has a real beneficiary now, independent of D-09.

## Exhaustiveness is a typecheck, not a convention

`TRAY_QUESTION_PRIORITY` is annotated `Record<UploadDisambiguationKind, UploadTrayQuestionPriority>`.
Adding a value to the union without adding a row **fails the build**. There is no default branch and
no fallback priority, because a fallback is how a new kind acquires a priority nobody chose.

The case this is waiting for: `exif_house_number`, which [#221](https://github.com/matkleve/feldpost/issues/221)
adds when D-09's radius is chosen and its tray is built. STUDY-009 already argues its priority is
`low` — the address is correct without it, so the question is enrichment — but the value is not
written here, because the kind has no producer yet and a priority for a kind that cannot occur is
[TRAP-010](../../../TRAPS.md#trap-010--dead-code-that-outlives-its-producer)'s shape.

## The invariant: a budget may only ever suppress `low`

`critical` and `high` are never suppressible, whatever the question count. A budget that can silence
an `admin_level_conflict` is a bug, not a policy. This is written down now, **before** any budget
exists, so the budget cannot be built around it.

| Rule | Where |
| --- | --- |
| `low` is the only suppressible priority | `BUDGET_SUPPRESSIBLE_PRIORITY` — one named constant, not an inline comparison |
| Callers ask the gate, never compare priorities themselves | `isBudgetSuppressible(kind)` |
| A budget operates on the selected subset and nothing else | `selectBudgetSuppressible(items, kindOf)` |

When `selectBudgetSuppressible` returns fewer items than a budget wanted to drop, the budget's
answer is *"fewer than you asked for"* — never *"make up the difference from the `high` pile"*.

**A question with no kind is rated `critical`.** `disambiguationKind` is optional on
`UploadDisambiguationGroup`, so absent is a real case. This is the same fail-safe direction
`isBulkEligibleStatus` takes, for the same reason: a question wrongly *asked* is visible and cheap; a
question wrongly *suppressed* is invisible, and invisible deferred work is what
[#232](https://github.com/matkleve/feldpost/issues/232) exists to prevent.

## What this does not decide

| Topic | Where it lives |
| --- | --- |
| When, or whether, to suppress anything | [#233](https://github.com/matkleve/feldpost/issues/233), blocked on the measurement in [#229](https://github.com/matkleve/feldpost/issues/229) |
| Where suppressed questions become visible again | [#232](https://github.com/matkleve/feldpost/issues/232) — and it ships with the budget or the budget does not ship |
| What any question asks | Unchanged; [upload-resolver-tray.question-copy.md](../../component/upload/upload-resolver-tray.question-copy.md) |

## Acceptance Criteria

- [x] A pure kind→priority function, unit-tested per kind — `tray-question-priority.spec.ts`
- [x] All seven kinds have a priority; an added kind fails the typecheck rather than defaulting
- [x] The table's key set is pinned by a test, so a kind cannot be quietly dropped from it
- [x] "Never suppress non-low" is expressed as one gate and pinned by a test over every kind
- [x] An absent kind is non-suppressible
- [x] The table and its reasoning are recorded here, not only in the study
