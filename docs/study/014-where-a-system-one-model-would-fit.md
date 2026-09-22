---
id: STUDY-014
type: analysis
status: proposed
supersedes: none
corrected-by: none
---

# Where a System One model would fit in Feldpost — and where it would not

**Measured:** 2026-09-22 · **Branch:** `main` at `3df51f7` · **How:** by inventorying the decision
points in `apps/web/src/app/core` (`grep` over closed-set verdict types and classifier entry points),
reading how each one decides today, and then **executing** the shipped
`buildSearchObjectFromRelativePath` and `isNoiseSegment` against 30 real Austrian/German construction
trade words and 8 realistic company folder paths under Vitest. No external model was called. No
network request was made.

**The question this answers**, restated from the owner, 2026-09-22:

> *"Is there any way in our repo where this would make sense? Like list our processes and potential
> cases and then compare it."*

That is deliberately **not** a benchmark — neither the owner nor this environment can call
[Jev](./012-disambiguation-model-evaluation.md#what-jev-was-and-what-this-study-is-therefore-not).
It is the question that has to be answered *first* and can be answered entirely from this repository:
**which decisions does Feldpost already make that are shaped like a typed decision, how are they made
today, and which of them are badly enough served to be worth an external dependency?**

[STUDY-012](./012-disambiguation-model-evaluation.md) § What `jev` was describes the model: TypeSafe
AI's System One model, no text generation, returns a typed decision — a choice, a score, or a yes/no
— trained with calibration as the objective. `[C]`, vendor-stated.

---

## Summary

Feldpost makes **25+ closed-set decisions** in `core/` alone. Most are state machines, not judgements,
and a model has nothing to offer them. `[A]`

**Three are genuine candidates**, and they are the same three links of one chain — the one that turns
a folder path into an address:

| | Decision | Decided today by | Fit |
| --- | --- | --- | :---: |
| **C-1** | Which kind of thing is this path token? (9-way) | Fuse.js fuzzy match + hand-assigned confidence constants | **Strong** |
| **C-2** | Is this token part of the street name, or a trade word stuck to it? | Nothing — it is not asked | **Strong** |
| **C-3** | Which city, when the path gave street + number but no city? | A ranker that structurally cannot decide ([STUDY-012](./012-disambiguation-model-evaluation.md)) | **Strong, but fix it first** |

**The finding that surprised me: the classifier is much better than I expected, and the case does not
rest on it being bad.** `[A]` I predicted that trade vocabulary would be misread as street names.
Measured: **0 of 30** trade words became a street, alone or beside a house number. The classifier is
deliberately conservative — a leftover word becomes a street *candidate* at `WEAK_STREET_CONFIDENCE =
0.5`, below the `UNCERTAIN_LOW = 0.9` write gate, so it never reaches the flat `street` field.

So the cost is not wrong addresses. **The cost is silence**, and silence is a tray question or an
Issues row — which is the volume [STUDY-009](./009-tray-question-budget-and-priority.md) measured.
That reframes the whole case: a System One model here is not a correctness fix, it is a **coverage**
play, and it must be judged against the tray-question count, not against an accuracy score.

---

## 1 — The inventory

`grep -rnE "^export type [A-Za-z]+(Kind|Decision|Verdict|Status|Mode|Tier|Reason) ="` over
`apps/web/src/app/core`, plus the classifier and ranker entry points. `[A]` Grouped by what they
actually are:

### 1a. State, not judgement — no fit

`UploadResolutionStatus`, `LocationStatus`, `CanonicalLocationStatus`, `PreviewGenerationStatus`,
`MediaRenderStatus`, `ShareUrlSyncStatus`, `ShareLinkRestoreStatus`, `WideEventStatus`,
`UploadGroupResolutionStatus`. `[A]`

These report **what happened**, not what should be chosen. `'pending' | 'resolved' | 'failed'` is the
outcome of an operation that already ran. A model cannot improve them and would be a catastrophic
place to put one: a probabilistic `'resolved'` is Constitution § 2 with extra steps.

### 1b. Configuration and user choice — no fit

`UploadJobMode`, `UploadImportMode`, `UploadLocationRequirementMode`, `ThemeMode`,
`ProjectsSortMode`, `TrayAnswerKind`, `MediaTier`. `[A]` A person or a config file picks these.
Inferring them would take agency away from the user, which is what the tray exists to protect.

### 1c. Derived by rule, correctly — no fit

`AddressPrecisionTier` (derived from which address fields are present), `PlacementSourceKind`
(`'text' | 'exif'` — the provenance is known, not guessed), `UploadJobIssueKind`,
`NoQuestionReason`. `[A]` These are deterministic functions of data already in hand. A model would
replace a correct answer with a probable one.

### 1d. Judgement under ambiguity — the candidates

Four, of which three are worth pursuing:

| | Where | What it decides |
| --- | --- | --- |
| **C-1** | `path-token-classifier.ts:427` `classifyTokensInSegment` | One of 9 kinds per token |
| **C-2** | *nowhere* | Street-name boundary inside a segment |
| **C-3** | `location-path-parser.service.ts:425` `resolveDisambiguation` | Which city |
| C-4 | `exif-house-number.ts:100` `exifHouseNumberProposal` | Propose a house number from GPS, or not |

**C-4 is deliberately excluded.** `[D]` It is already a clean rule with a named reason for every
refusal, it is confirm-only by owner decision ([STUDY-007](./007-exif-coordinates-as-address-evidence.md)),
and its inputs are two coordinates and a street string — there is no linguistic ambiguity for a model
to resolve. Adding one would replace an auditable `'street_mismatch'` with a probability.

`address-reconciliation.types.ts:43`'s `'apply' | 'suppress' | 'retry'` looks like a candidate and is
not: `[A]` it is a retry policy over a network result, not a judgement about content.

---

## 2 — C-1: the classifier's confidence is not a probability

`classifyWithFuse` (`path-token-classifier.ts:193`) resolves a token against the gazetteer: exact hit
→ `confidence: 1`; otherwise Fuse.js fuzzy search, and

```ts
function fuseConfidence(fuseScore: number | undefined): number {
  return Math.max(0, Math.min(1, 1 - fuseScore));
}
```

`[A]` **That is a fuzzy-match distance subtracted from one.** It is then compared against
`UNCERTAIN_LOW = 0.9`, and elsewhere against `0.98`, as though it were a probability that the token
means what the match says. It is not, and the repository already knows it is not — the comment above
`isPlausibleFuzzyLength` records the proof:

> *"`Wien` matches `Schottwien` at 0.992, above the write threshold, so Austria's largest city was
> stored as a Semmering village."*

`[A]` A **wrong** answer scored 0.992 — above the `0.98` "certain" gate. The fix was a **length
heuristic bolted on beside the score** (`isPlausibleFuzzyLength`, `FUZZY_LENGTH_RATIO = 0.25`), not a
better score, because there was no better score available. Verified still closed: `Wien` now resolves
to `Wien` with `Schottwien` present in the gazetteer. `[A]`

This is Constitution § 3 in the same shape as [STUDY-012](./012-disambiguation-model-evaluation.md)
§ F-2, and the two are the largest instances of one pattern: **Feldpost compares hand-made numbers
against thresholds as if they were calibrated, and patches the failures with more hand-made numbers.**
The constants in this one file: `1`, `0.98`, `0.95`, `0.9`, `0.5`, `0.5`, `0.4`, `0.25`. `[A]`

**Why this is the strongest fit.** A model whose training objective *is* calibration replaces the
number, not the logic. The thresholds, the write gate and the evidence model all stay; only the thing
being compared becomes meaningful. And it is testable without adopting anything: score the existing
classifier's confidence against ground truth and see how badly it is calibrated today. **That
measurement needs no external model and nobody has done it.** `[D]`

## 3 — C-2: a measured defect that has no owner

Running 8 realistic company paths through the shipped builder: `[A]`

| Path | city | street | house |
| --- | --- | --- | --- |
| `Wien/Seestadtstrasse/5/IMG_1.jpg` | Wien | Seestadtstrasse | 5 |
| `Wien/1010/Stephansplatz/1/IMG_1.jpg` | Wien | Stephansplatz | 1 |
| `Kunde Mueller/Baustellendoku/Seestadtstrasse 5/Rohbau/IMG_1.jpg` | **null** | Seestadtstrasse | 5 |
| `Projekte 2026/Angebot/Wien Seestadtstrasse 5/IMG_1.jpg` | Wien | Seestadtstrasse | 5 |
| **`Baustelle Seestadtstrasse 5/Abnahme/IMG_1.jpg`** | null | **`Baustelle Seestadtstrasse`** | 5 |
| `Baustellendoku/Rohbau/Seestadtstrasse 5 Wien.jpg` | Wien | Seestadtstrasse | 5 |
| `Kunde Mueller/Unterlagen/Angebot.pdf` | null | null | null |
| `Baustellendoku/KW 12/IMG_1.jpg` | null | null | null |

Six of eight resolve, including two where the address is buried in company structure and one where it
is only in the file name. **The classifier is good.** `[A]`

**Row five is a defect.** `Baustelle Seestadtstrasse 5` yields street `"Baustelle Seestadtstrasse"`
and `groupingKey` `||||baustelle seestadtstrasse|5`. `[A]` The same building written
`Seestadtstrasse 5` yields `||||seestadtstrasse|5`. **Two keys, so two geocode calls, two groups and
two tray questions for one address** — precisely what
[`upload-search-object.md`](../specs/service/media-upload-service/upload-search-object.md)
§ Grouping identity is address identity exists to prevent, arriving by a route that section does not
cover. It is the same failure shape as [STUDY-011](./011-exif-inheritance-grouping-unit.md)'s
customer-segment case, one level down: inside a segment rather than across segments.

**Nothing decides this today.** `[A]` `isNoiseSegment` operates on whole segments and is an
**18-word list** — `fotos, fotos von montag, urlaub, neu, misc, images, bilder, camera, kamera, woche,
kw, tag, monat, jahr, week, day, month, year`. Measured against 30 real trade words
(`Baustellendoku`, `Abnahme`, `Rohbau`, `Gerüst`, `Sanitär`, `Aufmaß`, `Estrich`, `Bestandsplan`, …):
**it catches 0.** `[A]`

That is not a bug in the list — it is a list, and German construction vocabulary is open. **"Is this
word part of the street name or a trade prefix?" is a typed yes/no over open natural language**, which
is the one class of question a word list can never answer and a System One model is built for.

**And it is worth doing regardless of adoption.** `[D]` Even without a model, `Baustelle` belongs in
the noise vocabulary, and the spec section above should cover intra-segment prefixes. That fix is
cheap; the model is what makes it general.

## 4 — C-3: real, but blocked behind its own repair

The disambiguation step — street + house number present, no city — is a closed-set choice over
candidates returning a score. Textbook typed decision.

**Do not put a model behind it yet.** `[D]` [STUDY-012](./012-disambiguation-model-evaluation.md)
measured that the incumbent cannot auto-assign at all in production (reachable only at
`parserConfidence ≤ 0.013` against a parser floor of `0.5` — a 20× gap), that its context is declared
and never supplied, and that the obvious fix saturates at one batch item. **A comparison against a
model that cannot fire is not a comparison**, and "the external model is better than nothing" is not
a finding worth paying a dependency for.

Fix F-1/F-5 and re-measure first. The incumbent baseline in STUDY-012 § F-4 is what any comparison
must beat, and right now that baseline is *zero auto-assignments*.

---

## 5 — What would have to be true before any of this ships

These are not objections; they are the gate, and they apply to all three candidates. `[D]`

1. **Constitution § 1 comes first.** Folder paths carry customer names and site addresses — personal
   data of a construction company's clients, under DSGVO. Sending them to an external service is a
   **Sensitive**-class question about data egress *before* it is a quality question. That is an owner
   decision and no measurement changes it.
2. **Constitution § 2 governs the failure path.** What does the pipeline do when the service is slow
   or down? "It failed but the flow continued" is only correct if someone decided it may and wrote
   down why. The honest shape is a fallback to the current classifier, which means keeping it.
3. **Score calibration, not accuracy.** A model right 70 % of the time that *says so* is usable behind
   a 0.9 write gate; one right 90 % that always says 0.99 is not. This is the entire point, and an
   accuracy-only comparison would miss it.
4. **Measure against tray-question count, not tokens.** § Summary: the cost of the current classifier
   is silence, not error. `upload-trace-report.ts` already counts `disambiguationGroups()`, and
   [STUDY-009](./009-tray-question-budget-and-priority.md) § The measurement is the corpus and the
   method. That is the number that would have to move.
5. **Re-measure the vendor's figures.** Every one is self-reported and publicly noted as not
   independently reproduced ([STUDY-012](./012-disambiguation-model-evaluation.md) § What `jev` was).

## 6 — The recommendation

`[D]`, and the order matters more than the verdict:

1. **Calibrate what exists, before adopting anything.** Score the current classifier's `confidence`
   against ground truth on the trace corpus and plot it. If `0.9` and `0.98` are roughly right, the
   case for a model is coverage only. If they are not — and the `Schottwien` incident says they are
   not — the miscalibration is measured, in-house, at zero cost, and it is the strongest possible
   input to the adoption decision. **Nobody has done this and it needs no external model.**
2. **Fix C-2 as a rule** (`Baustelle` in the noise vocabulary; the spec section covering intra-segment
   prefixes). Cheap, and it is a real defect independent of any model.
3. **Fix C-3's F-1/F-5** so the incumbent can fire at all.
4. **Only then** put the three candidates behind one corpus and compare — with the § 5 gate answered
   first, because a `no` on data egress ends it regardless of the numbers.

---

## What this study could not prove

| Claim | Why | What would settle it |
| --- | --- | --- |
| That a System One model would actually classify these better | Nothing was called. This study establishes *fit*, which is a claim about problem shape, not about performance. `[C]` | The comparison in § 6.4, after § 5 is answered. |
| That the current classifier's confidence is badly calibrated | The `Schottwien` incident is one measured instance of a wrong answer scoring 0.992 `[A]`; one instance is not a calibration curve. `[C]` | § 6.1 — and it is the cheapest useful thing on this list. |
| That C-2 is common in real archives | Eight constructed paths, one of which fails. `[B]` No real company archive was available. | Run the trace corpus profiles and count keys that differ only by a leading trade word. |
| That the 30 trade words are representative | Chosen from domain knowledge, not from a corpus. `[C]` | Take the vocabulary from a real import's folder names. |
| That no other decision point qualifies | The sweep covered `core/` closed-set types and classifier entry points; `features/` and `supabase/` were not inventoried. `[B]` | Extend the sweep if the first three prove out. |

## Related

- [STUDY-012](./012-disambiguation-model-evaluation.md) — what Jev is, and C-3's incumbent measured
- [STUDY-009](./009-tray-question-budget-and-priority.md) — the tray-question volume any gain must be measured against
- [STUDY-005](./005-upload-pipeline-trace-findings.md) F-02 — the `Wien` → `Schottwien` incident, and F-11 on segment ranking
- [STUDY-011](./011-exif-inheritance-grouping-unit.md) — the same key-splitting failure one level up
- [`upload-search-object.md`](../specs/service/media-upload-service/upload-search-object.md) § Grouping identity is address identity — which C-2 defeats from inside a segment
- [`docs/CONSTITUTION.md`](../CONSTITUTION.md) § 1, § 2, § 3 — the gate in § 5
