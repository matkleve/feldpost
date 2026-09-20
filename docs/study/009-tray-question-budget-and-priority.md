---
id: STUDY-009
type: proposal
status: proposed
supersedes: none
corrected-by: none
---

**Written 2026-09-20** on `claude/uploader-pipeline-test-badges-kktrpg`, from the owner's proposal
plus a read of the shipped tray code and config. **No question-volume measurement exists yet**, so
every claim about how many questions a real upload produces is graded `[D]` and this study says what
would settle it. The measurement is the first piece of work, not the last.

# Tray question budget and priority

## The owner's proposal, as stated

> We have priorities of tray questions. There are things that change the city or country — those
> questions have to be cleared up. But questions about being 20 meters off are low priority. So if we
> have 100 files let's ask the low priority questions, but if there are 10 000 files we won't. We add
> an interface where there are open tasks that say "there are 158 items that could be closer to their
> location". I don't know how many GPS/street tray questions there will be at 100 files — this could
> depend on different folder structures in various companies, uploads or sources.

Three separable ideas are bundled here, and they have different costs, different risks and different
prerequisites. Separating them is most of this study's value:

| | Idea | Nature |
| --- | --- | --- |
| **A** | A question carries a **priority**, from what breaks if it is answered wrong | Classification — cheap, static, testable today |
| **B** | A **budget** suppresses low-priority questions when there are too many | Policy — needs a measurement first |
| **C** | A **deferred-improvement surface** lists what was suppressed, resolvable in bulk later | UI + engine — mostly already built |

## Why this is the right problem

The proposal is correct that volume is the threat, and it arrives at the right moment: D-09
(Phase 5.7) is the first rule in the pipeline whose input is **present on essentially every photo**.
Every previous question kind fires on an *exception* — a conflict, an ambiguity, a missing field.
`exif→houseNumber` fires on the normal case.

That is a category change in the pipeline's question economics, and it is worth stating as the
finding that justifies this study: **the pipeline has never had a question source whose frequency
scales with the corpus rather than with its messiness.**

## What already exists — and the thing that does not

Four mechanisms already control tray volume. Any new one has to compose with them, and proposing a
fifth without mapping the four is how contradictions get built.

| # | Mechanism | Where | What it actually does |
| --- | --- | --- | --- |
| 1 | **Group merge by `groupingKey`** | `upload-search-object.builder.ts` | Files sharing an address become **one** question. Collapsed 549 files into a single question in the trace corpus. |
| 2 | **Ask once per address, not per file** | STUDY-007, D-09 | The same rule applied to the EXIF house number specifically. |
| 3 | **Chunked classification** (Phase 3.3) | `upload-manager-submit.util.ts` | Defers tray **presentation** — registration still happens per chunk. Not a volume control; a responsiveness control. |
| 4 | **Archive import mode** (Phase 4) | `upload-location-disambiguation-registration.service.ts` | Suppresses tray **registration** entirely; unresolved items become `missing_data` + `issueKind: 'address_deferred'`. Measured: **0 tray questions** vs 7 for the same corpus interactively. |

**And one that does not exist although it looks like it does.**
`UploadLocationConfig.presentationBundleMaxDialogueUnits: 5` is declared in
`upload-location-config.ts:46,96` and documented in `upload-location-config.md:65` as *"Max dialogue
units per resolver tray bundle"* — and **no code reads it**. `grep` across `apps/web/src` returns the
declaration and the default, nothing else.

This matters directly: anyone designing idea **B** would reasonably conclude a per-bundle cap already
exists and build on top of it. It is [TRAP-010](../TRAPS.md#trap-010--dead-code-that-outlives-its-producer)'s
shape — dead code outliving its producer, with the spec outliving both. Filed separately; it should
be deleted or implemented before **B** is designed, not left as a decoy.

**The most important consequence of mechanism 1:** archive import mode is *already* idea **B** at its
extreme setting — suppress everything, defer to a backlog — and it is already built and measured. So
**B is not a new capability. It is a dial on an existing one.** That reframing removes most of the
risk, and it is the strongest argument that the owner's instinct fits the system rather than fighting
it.

## Correction 1 — the budget must count questions, not files

`[D]` **"If there are 10 000 files we won't ask" uses the wrong denominator.** Mechanism 1 means file
count and question count are only loosely related. Two real shapes:

```
Company A — one site, photographed exhaustively
  Baustelle Nord/Wien/1010/Thalistraße 4/   10 000 files, 1 address
  → after group merge: 1 question
  → suppressing it because "10 000 files" would hide the single cheapest question in the batch

Company B — a decade of scattered jobs
  Archiv/2019/Kirchengasse 11/  … 400 folders, ~25 files each = 10 000 files
  → after group merge: up to 400 questions
  → this is the batch that actually needs a budget
```

Both are 10 000 files. One needs no budget at all; the other needs it badly. A file-count trigger
gets **both** wrong — it suppresses Company A's one useful question and, at a 5 000-file threshold,
would not fire at all for a 4 000-file Company-B upload producing 300 questions.

**The budget must be evaluated on question count after merge.** That is also convenient: the number
is known at the end of classification, before any tray is presented, which is exactly where
Phase 3.3 already sits.

## Correction 2 — "20 metres" is a proxy, and a leaky one

`[D]` The proposal reaches for **distance** as the low-priority signal. Distance is a decent proxy for
*how wrong the answer can be in metres*, but not for *what breaks*. Two questions at the same 20 m:

```
(a) Thalistraße 4 vs Thalistraße 6 — adjacent buildings, one owner, one job
    Getting it wrong: the photo is 20 m off on a map. Nobody is harmed.

(b) Thalistraße 4 vs Thalistraße 4a — two separate properties, two clients,
    a damage claim attached to one of them
    Getting it wrong: evidence is filed against the wrong party.
```

Same metres, opposite stakes. Distance cannot tell them apart, because the thing that differs is the
**consequence of the field being wrong**, not the magnitude of the error.

**The honest axis is: what does this question decide, and what depends on that field downstream?**
And that is a property of the **question kind**, which the code already carries.

## The priority table this implies

`UploadDisambiguationKind` already has exactly seven values (`upload-manager.types.ts:86`). A static
kind→priority table is therefore cheap, complete, and unit-testable today — no new data, no
measurement needed:

| Kind | What it decides | Proposed priority | If answered wrong |
| --- | --- | --- | --- |
| `admin_level_conflict` | Which city/state/country the item belongs to | **critical** | Item is in the wrong place entirely; search will never find it |
| `city_step` | The city, when the path gave only a street | **critical** | Same — a street with no city is not an address |
| `source` | Text vs EXIF disagree about where this is | **critical** | Two sources disagree; picking wrong puts the item somewhere it never was |
| `containment_check` | Whether a point belongs inside a claimed area | **high** | Wrong area assignment; recoverable but misleading |
| `layer_package` | Which package of address fields wins | **high** | Mixed evidence from two places |
| `geocode` | Which of several geocode hits is meant | **high** | Could be a different town with the same street name |
| `house_step` | Which house number on an already-correct street | **low** | Right street, right city, imprecise by a building |
| *(proposed)* `exif_house_number` | Whether GPS may supply a missing house number | **low** | The address is already correct without it; this is an enrichment |

`[D]` The split falls naturally at **"is the item findable and in the right place?"** Everything
`critical`/`high` answers that question. Everything `low` refines an answer that is already right.
That is a sharper line than "20 metres", and it is derivable from the kind alone.

**Note the asymmetry it exposes:** `house_step` already exists and is already low-priority by this
logic — so the budget idea has a second beneficiary besides D-09, and can be tested against a kind
that ships today.

## What is genuinely unknown

`[D]` **Nobody knows the question-per-file curve.** The owner said this plainly and it is the crux.
Everything about **B**'s thresholds is guesswork until it is measured, and a guessed threshold here
has the same problem as a guessed radius in D-09: it looks like a decision and is actually an
invention.

**This is measurable now, without a database.** `upload-pipeline-trace` already runs the real
classifier over a generated corpus and records tray outcomes; the scale tier already goes to 20 000
jobs. What it does not do is report **questions by kind at several corpus shapes**. Adding that is a
harness change, not a product change.

The shapes worth measuring, because they are the ones that differ in the field:

| Shape | Example | Expected question driver |
| --- | --- | --- |
| Deep and uniform | one site, dated subfolders | ~1 address → merge does all the work |
| Wide and flat | `Archiv/<address>/` × 400 | address count |
| Mixed evidence | half the folders named, half only `IMG_*.jpg` | EXIF-only items |
| Noisy names | `Neuer Ordner`, `Kopie von …`, `(1)` suffixes | parse failures |
| No GPS at all | scanned archives | should produce **zero** D-09 questions |

Until those numbers exist, a threshold like "100 files" or "10 000 files" is a placeholder, and
should be written down as one.

## Correction 3 — suppression is only legal if it is visible

`[D]` This is the load-bearing constraint on the whole idea, and it is the same argument that made
D-09 legal in the first place.

D-09 is allowed to propose a house number **because it asks**. A silent write would be fabricated
precision. By exactly the same logic: a suppressed question is a decision taken on the user's behalf,
and it is only legitimate if the user can see it was taken and reverse it.

Without idea **C**, idea **B** is not "fewer questions" — it is **silent data loss**, and it has a
precedent in this repository:
[TRAP-021](../TRAPS.md#trap-021--a-resolution-event-with-zero-subscribers-looks-like-it-resumed-the-job)
— a job that looked resolved, was never resumed, and nothing logged an error. Work that looks done
while sitting in a state nobody watches is this codebase's most expensive recurring failure.

**Therefore: C is not the optional third piece. C ships with B or B does not ship.** The owner's own
phrasing — *"an interface where there are open tasks"* — already contains this; it is worth making it
a hard constraint rather than a feature.

Encouragingly, C is the cheapest of the three: the backlog state (`missing_data` +
`address_deferred`), the counting, and the bulk resolution engine that clears it all exist. What is
missing is the surface, which overlaps almost exactly with the unbuilt `/files` tree badge (#220) and
the bulk dialog (#219).

## Correction 4 — priority and budget must not interact silently

`[D]` If the budget can suppress a `critical` question, it is a bug, not a policy. State it as an
invariant: **the budget applies only to `low`; `critical` and `high` are never suppressed.**

But that invariant immediately exposes the real gap:

```
10 000 files, Company B shape, 300 admin_level_conflict questions
  → priority says: all critical, none suppressible
  → budget says: nothing I can do
  → user faces 300 unavoidable questions
```

**A budget does not solve high-volume *critical* questions, and nothing in the proposal does.** The
existing answer is archive import mode — defer everything, resolve in bulk — which is a *different
mechanism* chosen at submit time, not a priority. So the composed design is three layers, and the
composition is where the difficulty actually lives:

| Layer | Chosen | Applies to |
| --- | --- | --- |
| Import mode (`interactive` / `archive`) | At submit, by the user | Everything |
| Priority | Static, by question kind | Deciding what a budget may touch |
| Budget | At classification end, by question count | `low` only |

## Options for B, with their costs

| Option | Rule | For | Against |
| --- | --- | --- | --- |
| **B1** | Fixed threshold on low-priority question count (e.g. > 20 → suppress) | Trivial to implement and explain | The number is invented until measured |
| **B2** | Ratio — suppress when low-priority questions exceed N× critical ones | Adapts to batch shape without a magic absolute | Harder to explain; two knobs instead of one |
| **B3** | Always suppress `low` during upload; they only ever live in the backlog | No threshold to invent at all; one rule; trivially testable | Loses the small-batch case the owner explicitly wanted ("if we have 100 files let's ask") |
| **B4** | User picks, with a suggested default shown alongside the counts | Honest — the count is known before asking | One more decision at upload time |

`[D]` **B3 deserves more consideration than it first appears**, because it is the only option with no
invented constant, and because the backlog surface (C) makes the "lost" questions recoverable in
bulk — very likely *faster* to answer 158 house numbers in one grouped screen than 158 trays during
upload. B1/B2/B4 all become available later without rework, once the measurement exists. The owner's
"100 files → ask" intuition may be a preference for *answering while the context is fresh*, which is
real; that should be tested against the backlog experience rather than assumed.

## What would change this study

- **The question-per-file measurement across corpus shapes.** `[D]` Every threshold claim is
  guesswork until this exists. Highest-value missing input by a wide margin.
- **A real customer folder export.** `[D]` The corpus is invented. Company A vs Company B above is a
  plausible dichotomy, not an observed one.
- **A measurement of how users actually clear a backlog.** `[D]` If answering 158 deferred questions
  in a grouped screen turns out to be slower than 158 trays, B3 collapses and B4 wins.
- **Reversing D-09.** If the EXIF house number is never switched on (its radius is still unchosen —
  #221), the volume pressure that motivates this study drops substantially, though `house_step`
  keeps it alive.

## Out of scope

| Topic | Why |
| --- | --- |
| Changing what any existing question *asks* | This study is about **whether and when** to ask, never about the content of a question |
| Auto-answering low-priority questions | That is fabricated precision, which the address precision principle forbids — the whole point is deferral, not guessing |
| Per-organization tuning | No evidence yet that companies differ in a way a shared default cannot cover; revisit after the measurement |
