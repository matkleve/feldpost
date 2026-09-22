# Study format

> **Provenance — read this before treating the format as canonical.**
> This file was written **to the specification recorded in** [`docs/audits/2026-09-08-grundriss-adoption.md`](../audits/2026-09-08-grundriss-adoption.md) § D4, which is a secondhand record of the study system in the sibling **Grundriss** repository. Grundriss is **not reachable from this environment**, so nothing here was checked against its canonical `STUDY-FORMAT.md` or its `new-study.mjs` scaffolder. Per § F3 (the sibling-repository rule) this is a port, not an invention — but it is an unverified port. **When Grundriss becomes accessible, reconcile field names, `type` and `status` vocabularies, and the id scheme against it, and treat every divergence as Grundriss-wins.**
>
> **Known Feldpost extension:** the `historical` status was added on 2026-09-10 so that dated audits and move passes have a status to be reclassified into. It may not exist in Grundriss; reconcile it first.

A **study** is a reasoning document: an analysis, an investigation, a comparison, or a proposal, recorded with a stated confidence for every claim and a status saying whether it still holds.

Studies exist because Feldpost's four kinds of memory get read at different moments and must not be merged ([§ 2 point 4](../audits/2026-09-08-grundriss-adoption.md)):

| Memory | Folder | Answers |
| --- | --- | --- |
| Contract | `docs/specs/` | What it **should** do |
| Reasoning | `docs/study/` | **Why this** and not the alternatives — with evidence grades |
| Narrative | `docs/ai-diary/` | What **happened** |
| Traps | [`docs/TRAPS.md`](../TRAPS.md) | How this code **misleads** people |

Point-in-time findings — what was **true** on a stated date — are studies too: `type: review`, `status: historical`. The folders that used to hold them (`docs/audits/`, `docs/backlog/`, `docs/implementation-blueprints/`, `docs/migration/reports/`) are **closed to new documents**; see [`README.md`](./README.md) § Where new reasoning goes. Enforced by `scripts/check-study-format.mjs`, which pins all four against the file list they closed with.

---

## Trust order

When two sources disagree, the higher one wins:

**owner correction → spec → live code → study**

A study never outranks the code it describes. If the code changed after the study was written, the code is right and the study is stale — mark it `superseded` or write a correcting study; do not edit the finding away.

---

## Frontmatter

YAML, first thing in the file, every field present (use `none` rather than omitting):

```yaml
---
id: STUDY-007
type: investigation
status: proposed
supersedes: none
corrected-by: none
---
```

| Field | Meaning |
| --- | --- |
| `id` | `STUDY-NNN`, sequential, never reused. The citable handle for issues, PRs and specs. |
| `type` | `analysis` · `investigation` · `review` · `proposal` · `comparison` |
| `status` | See below. |
| `supersedes` | Study ids this one **has already replaced** (owner-accepted). A study that merely *proposes* replacing something names the target in the body, not here. |
| `corrected-by` | Study ids that later corrected this one. Filled in **on the old file** when the correction lands. |

Below the frontmatter, state **when** it was measured, **on what** (branch and commit), and **how** (read source? ran a command? asked a service?). A study whose measurement conditions are unstated cannot be re-graded later.

## `status` values

| Status | Meaning |
| --- | --- |
| `draft` | Being written. Do not act on it. |
| `proposed` | Analysis complete; it recommends a change **nobody has accepted**. Not a contract. Not permission to implement. |
| `accepted` | The owner signed off. The normative text now lives in a spec; this file keeps the reasoning. |
| `active` | Describes the world as it is and still holds. |
| `partially-remediated` | Some findings are fixed. The body must name which ones, and where the fix landed. |
| `historical` | Describes the world as it was on a stated date, and makes **no claim to still hold**. The status a dated audit or move-pass gets when it is reclassified. Distinct from `active` (claims to still hold) and from `superseded` (names a specific replacement). |
| `rejected` | The proposal was declined. Kept so it is not re-derived from scratch. |
| `superseded` | Replaced by a later study named in `corrected-by`. |

Studies are **never deleted and never rewritten into agreement**. A claim that turned out wrong stays, with the correction linked. That is the whole value of the status axis.

### Correcting a study: append in place, reverse in a new study

The rule above says what must not happen. This says what must, because "never rewritten" was read as "never touched", and twice in one week a careful agent corrected a study in place anyway — once in STUDY-009 and once in STUDY-006 — inventing the same shape independently. A rule that two people break by converging on a better one is a rule missing a clause.

**Draw the line at the conclusion, not at the word count.**

| What changed | What to do |
| --- | --- |
| New evidence **adds to** the study's conclusion — a phase shipped, a blocker cleared, a number re-measured | An **`## Update YYYY-MM-DD`** section, at the end or beside the finding it touches. Same file. |
| New evidence **reverses** the study's conclusion — the recommendation was wrong, the premise did not hold | A **new study**. `corrected-by` on the old file names it; the old file's status becomes `superseded`. |

An `## Update` section is **append-only**:

- It **MUST NOT delete or edit a graded claim.** Say the earlier claim is superseded and why; leave its text where it is. `[A] the RPCs are absent` and `[A] the RPCs are present, 2026-09-22` can both be true of different days, and the pair is the record.
- It **MUST carry its own date and its own grades.** It is a measurement, not an annotation.
- It **MUST NOT change the frontmatter's `corrected-by`.** That field names *other studies*. A study does not correct itself in a reference field — if a reader needs warning before the stale sections, put a short banner under the frontmatter pointing at the update.

Enforced as far as a machine honestly can: `scripts/check-study-claim-deletion.mjs` fails a change that removes a graded line from `docs/study/` unless the commit body carries a `study-correction:` trailer saying why. Whether the removal was legitimate is a judgement — the gate only makes it deliberate and reviewable.

---

## Evidence grades

Every substantive claim carries a grade in square brackets: `[A]`, `[B]`, `[C]` or `[D]`. Grade individual claims, not whole documents — one study routinely mixes all four.

| Grade | Name | Means | Test |
| --- | --- | --- | --- |
| **`[A]`** | Verified | Directly observed **in this repository**, at a named `path:line` or as the quoted output of a command that was actually run. | Someone else can re-run it and get the same answer. |
| **`[B]`** | Measured, but not on the production path | A real measurement whose conditions differ from production: a one-off external call instead of the app's own adapter, a synthetic fixture instead of a device export, static reading of code that was never executed, a migration never applied to a database. | The number is real; it is **not necessarily the number production produces**. State the delta if it is known. |
| **`[C]`** | Inference | Reasoned from `[A]`/`[B]` evidence but not itself observed. Plausible, unfalsified, untested. | If it were wrong, would this document look any different? If no, it is `[C]`. |
| **`[D]`** | Decision or proposal | A **choice**, not a fact. Changeable by whoever owns it. | Ask "who could change this by simply deciding otherwise?" If someone can, it is `[D]`. |

**Why the grades exist at all:** a `[D]` read as an `[A]` is how an old proposal gets implemented as though it were a contract. The grade is a claim about *how a reader may use the sentence*, not about how confident the author feels.

Rules:

- Unmarked prose is context, not a claim. If it could be acted on, grade it.
- Never upgrade a grade without new evidence, and say what the new evidence was.
- A user-behaviour claim with no user research behind it is `[C]` at best — never `[A]`, however obvious it seems.
- Anything a product owner could overrule is `[D]`, even when the author agrees with it.

---

## Writing a study

1. Take the next free `STUDY-NNN`; file it as `docs/study/NNN-slug.md`.
2. Fill the frontmatter, then the measurement conditions.
3. Write the findings with a grade on every claim.
4. State explicitly what the study **could not** prove and what would settle it.
5. Add a row to [`README.md`](./README.md).
6. If it proposes changing something already signed off, say so in a section of its own — status stays `proposed` until the owner accepts.
