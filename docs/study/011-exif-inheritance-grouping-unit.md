---
id: STUDY-011
type: investigation
status: proposed
supersedes: none
corrected-by: none
---

# The unit for EXIF inheritance is the resolution group, not the folder

**Measured:** 2026-09-22 · **Branch:** `claude/study-system-audit-enforce-4e6oov` at `318180e`
(`origin/main` is at the same commit) · **How:** by executing the shipped
`buildSearchObjectFromRelativePath` against eight constructed paths under Vitest and printing the
`groupingKey` and `isSearchObjectMeaningless` it returns, plus a read of the priority table, the
orchestrator's skip branch and the tuning defaults. No upload was run; no media item was written;
no tray was opened.

**Why this file exists.** The reasoning below was written in the body of
[issue #245](https://github.com/matkleve/feldpost/issues/245) and cited from it as a study — first as
`STUDY-010`, then, after an edit at 10:39 the same morning, as `STUDY-011`. Neither file existed.
[STUDY-013](./013-study-system-audit.md) § S-03 found the dangling citation, and its
§ Update 2026-09-22 records what the renumbering turned out to be part of: three studies that do not
exist cascading across three consecutive ids in two minutes. This file is the document #245 points
at, filed at **011** to match the citation as it now stands rather than moving it a third time.

Every measurement here was **re-run** rather than copied from the issue — the issue's table and this
one agree, which is the only reason to trust either.

---

## What was asked

> *"Wenn Medien in einem Ordner sind wo die Fotos alle EXIF haben die in einer gleichen Area sind,
> dann könnte man eine low-key-priority Tray-Question machen, ob diese anderen Dokumente auch einen
> Average von diesen EXIF-Daten übernehmen sollen und die Adresse angepasst wird."*
> — owner, 2026-09-22

A `Plan.pdf` or `Leistungsverzeichnis.xlsx` has no GPS and never will. When the path yields no address
either, it reaches Issues as `document_unresolved` and someone places it by hand — while twenty photos
from the same site sit one file away carrying exactly the evidence needed. `[D]`

## The finding: the grouping already does this, and the folder does not

The question as posed says *"in einem Ordner"*. The folder is the wrong unit, and the right one already
exists.

**Measured.** `[A]` The shipped builder, run against eight paths (Vitest, `apps/web`, the same `geo`
fixture the builder's own spec uses):

| Path | `groupingKey` | `meaningless` |
| --- | --- | :---: |
| `Kunde Mueller/Seestadtstrasse/5/IMG_001.jpg` | `\|\|\|\|seestadtstrasse\|5` | false |
| `Kunde Mueller/Seestadtstrasse/5/LV.pdf` | `\|\|\|\|seestadtstrasse\|5` | false |
| `Kunde Mueller/Seestadtstrasse/5/Plan.xlsx` | `\|\|\|\|seestadtstrasse\|5` | false |
| `Kunde Mueller/Seestadtstrasse/5/clip.mp4` | `\|\|\|\|seestadtstrasse\|5` | false |
| `Kunde Mueller/Seestadtstrasse/5/notes.txt` | `\|\|\|\|seestadtstrasse\|5` | false |
| `Kunde Hofer/Seestadtstrasse/5/LV.pdf` | `\|\|\|\|seestadtstrasse\|5` | false |
| `Grossauftrag/Hauptstrasse/12/IMG_400.jpg` | `\|\|\|\|hauptstrasse\|12` | false |
| `Kunde Mueller/Unterlagen/LV.pdf` | `\|\|\|\|\|` | **true** |

Three things follow, and together they make the feature much smaller than it first looks:

1. **A document in an address folder is already in its photos' group.** `[A]` Identical key. There is
   nothing to build — no new grouping, no folder walk, no second index.
2. **The file type never enters the key.** `[A]` `buildSearchObjectFromRelativePath` takes a path and
   a file name and no media type. `.jpg`, `.pdf`, `.xlsx`, `.mp4` and `.txt` under one folder all
   produce one key. The mixed-media group the feature needs is what the pipeline already builds.
3. **A large import splits per street, for free.** `[A]` `Seestadtstrasse/5` and `Hauptstrasse/12` are
   different groups, so `Plan.pdf` joins its own street's donors. **Grouping by folder would have
   merged two sites into one donor set** — which is the defect this study exists to prevent, and it
   would have been invisible until a document landed at the wrong address.

So: **donors** are the items in a group that carry EXIF; **recipients** are items in the *same group*
that carry none. `[C]`

## A group may legitimately span two customers — do not "fix" it

`Kunde Mueller/Seestadtstrasse/5/` and `Kunde Hofer/Seestadtstrasse/5/` produce the **same** key.
`[A]` The leading customer segment carries no address field and is dropped.

This looks like a bug and is a decision. `[D]` Ruled by the owner on 2026-09-22, in
[#245](https://github.com/matkleve/feldpost/issues/245):

> *"Wenn wir jetzt zum Beispiel die gleiche Straße haben mit einem anderen Kunden, dann hätten wir
> zwei Trays. Das darf nicht passieren."*

**The ruling had no normative home, and now it does.** `[A]` When this study was written, #245
stated the rule was *"now normative in `upload-search-object.md` § Grouping identity is address
identity"* and that section did not exist — neither that spec nor its supplements mentioned the
customer segment at all. The **behaviour** was real and measured above; only the claim that it was
written down was false, which is how a decision becomes a bug report: the next reader of § Keys
philosophy would find a leading segment being silently dropped with no sentence saying it is meant
to be.

The section now exists, written from the measurement above and the owner's ruling, and states the
positive rule (a segment carrying no address field does not enter the key), the consequence (narrow
by geographic evidence, never by customer), and that media type is not in the key either.

**Consequence for this feature:** narrow the donor set by **dispersion**, never by the customer
segment. `[D]` A donor set that spans two customers at one address is correct; a donor set that spans
two addresses is not.

## Explicitly out of scope: the address-less document

`Kunde Mueller/Unterlagen/LV.pdf` is `meaningless` `[A]`, and
`upload-address-resolution.orchestrator.ts` skips it — `if (isSearchObjectMeaningless(so))` logs
*"skip meaningless SO — no real address signal"* and `continue`s. `[A]` It never receives a
`groupingKey`, so there is no group for it to inherit from.

Giving it one is a **separate proposal** with weaker evidence and a real failure mode: one
`Unterlagen/` folder can hold paperwork for five different sites. `[C]` Folding it in here would
quietly reintroduce the folder as the unit, which is the thing this study rules out.

## Why this is not what STUDY-007 warns against

[STUDY-007](./007-exif-coordinates-as-address-evidence.md) argues against clustering EXIF to *derive
an address*, because a GPS tag records where the camera stood, not where the subject is. That argument
is sound and it does not reach this case. `[C]`

| | STUDY-007's case | This case |
| --- | --- | --- |
| What EXIF is asked to supply | A **house number** | The **site** a document belongs to |
| Effect of being 15 m out | The wrong building | Nothing — it is the same site |
| Claim strength | Building-level | Site-level |

**Therefore the inherited location MUST be written at a site-level `AddressPrecisionTier`** — `street`
at best, never `houseNumber`. `[D]` Recording it as though the document carried its own fix would be
Constitution § 3: a value whose name claims a precision it does not have.

## Priority is a decision the build will force

`[A]` `TRAY_QUESTION_PRIORITY` (`core/upload/location/tray-question-priority.ts:45`) is a
`Record<UploadDisambiguationKind, UploadTrayQuestionPriority>` with a row for all seven kinds and **no
default branch** — `admin_level_conflict`, `city_step` and `source` are `critical`;
`containment_check`, `layer_package` and `geocode` are `high`; `house_step` is `low`. Adding a kind
without a row does not compile.

So `exif_inherit` cannot acquire a priority by omission. `[A]` That is deliberate, and it means the
decision below blocks the build rather than being deferred.

**The intuitive answer is `low`, and the table's own test argues against it.** `[C]` The dividing line
is *"is the item findable and in the right place?"* — `low` is for **refining an answer that is
already correct**, which is why `house_step` sits there. A recipient here has no answer at all: it is
an unplaced document. The counter-argument is that donors come from the item's own resolution group,
so a wrong answer cannot be far wrong. `[C]` Both readings are defensible and the owner picks.

Note the coupling: `isBudgetSuppressible` returns true for exactly one priority `[A]`, so choosing
`low` also chooses **suppressible by a question budget** — [#233](https://github.com/matkleve/feldpost/issues/233).
That is a second decision riding on the first, and it should be taken knowingly.

## What is still open

These are the issue's open questions, unchanged in substance and graded:

| | Question | Note |
| --- | --- | --- |
| 1 | Priority for `exif_inherit` | `[D]` Blocks the build. See above — `low` also means suppressible. |
| 2 | Average or **medoid**? | `[D]` **Recommend medoid.** A mean of coordinates can land in a courtyard, a river, or across a street corner where no photo was taken; a medoid is always a point someone stood on. |
| 3 | What counts as "same area"? | `[D]` Needs a named, org-tunable dispersion cap. Neighbours: `sourceAgreementRadiusMeters: 150` and `exifAssistRadiusMeters: 80` (`upload-location-config.ts:79`, `:81`) `[A]`. A group is one street and house number so its points *should* be tight — STUDY-007 § 1 is why to gate on it anyway. |
| 4 | Minimum donor count? | `[D]` One photo is not "the photos all agree". Recommend a floor; 3 is a guess, not a measurement. |
| 5 | Defer to an existing text address? | `[D]` A text-vs-EXIF disagreement already has a `source` tray at `critical` `[A]`. Does this question defer to it, or never fire when a text address exists? |
| 6 | Videos | `[D]` Some carry location metadata, some do not. Donor when it has coordinates, recipient when it does not, is the consistent reading. |

## What this study could not prove

| Claim | Why | What would settle it |
| --- | --- | --- |
| Real company archives produce tight per-group EXIF dispersion | No device exports were available; all eight paths are constructed. `[B]` | Run the trace harness over a real archive and measure per-group dispersion — the corpus profiles in `upload-trace-*` are the place. |
| The feature actually reduces `document_unresolved` volume | Nothing was executed end to end; no tray was opened. `[C]` | A trace run counting `document_unresolved` before and after, on the same corpus. |
| `low` is the right priority | It is a judgement about what users can tolerate, with no user research behind it. `[C]` at best, and really `[D]`. | The owner decides. |
| A medoid beats a mean in practice | Reasoned from geometry, not measured against real photo positions. `[C]` | Compute both over a real group and compare against the surveyed address. |

## Related

- [Issue #245](https://github.com/matkleve/feldpost/issues/245) — the feature, its acceptance criteria and its change class (**Sensitive**: upload pipeline, and it writes locations)
- [STUDY-007](./007-exif-coordinates-as-address-evidence.md) — why EXIF may not supply a house number
- [STUDY-009](./009-tray-question-budget-and-priority.md) — priority, budget, and the deferred-improvement surface
- [STUDY-013](./013-study-system-audit.md) § S-03 — how this study came to be cited before it existed
- [`upload-search-object.md`](../specs/service/media-upload-service/upload-search-object.md) § Grouping identity is address identity — the customer-segment rule, written from this study
