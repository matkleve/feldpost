---
id: STUDY-006
type: proposal
status: proposed
supersedes: none
corrected-by: none
---

# Upload pipeline — decisions to take, and the plan to correct it

**Written:** 2026-09-12 · **Branch:** `claude/uploader-pipeline-test-badges-kktrpg` at `650f495`
**Findings this answers:** [STUDY-005](./005-upload-pipeline-trace-findings.md) F-01 … F-10.

`status: proposed` means **nobody has accepted this**. Per
[`STUDY-FORMAT.md`](./STUDY-FORMAT.md), a `[D]` is a decision, not a fact: the six decisions in
§ 1 are the product owner's to take, and § 2's plan assumes the recommendation in each. Taking a
different option changes the plan, not just its schedule.

The upload pipeline is **Sensitive** class ([`AGENTS.md`](../../AGENTS.md) § Change Classification):
every step below needs the full ceremony — ownership matrix, FSM tables where state changes,
`/security-review` where a boundary moves, red-test-first, live verification, and a fresh-context
adversarial review by a different agent than the implementer.

---

## 1 · Decisions to take first

Four of the ten findings are **spec-level**: the code does what the contract says, so the contract
has to change before the code may. Those cannot be "fixed" by an implementer without this section
being answered.

### D-01 — May a file name write an admin field at all? (F-01)

The spec today says yes: a token matching the country's postcode pattern becomes a postcode
(pass 2), and level 0 — the file name — wins the flat collapse. That turns `IMG_1274.jpg` into
postcode 1274.

| Option | What it means | Cost |
| --- | --- | --- |
| **A — File names never write admin fields** (recommended) `[D]` | `country`, `state`, `city`, `postcode` may only come from folder levels ≥ 1. Street-level fields are unaffected. | Loses the rare case where the file name is the only address carrier (`1090 Währinger Straße 12.jpg`). |
| B — Numeric guard only | Extend `isWeakFilenameStreetLevel`'s idea to numbers: a numeric token in a name matching `^(img\|dsc\|dscn\|p)_?\d+$` is never an admin field. | Narrower fix, still wrong for `Foto 1274.jpg`; a new camera prefix reopens it. |
| C — Folder always outranks file name for admin fields | Keep the parse, change the collapse to prefer the **highest**-confidence folder entry when one exists. | Keeps a bogus value on the SO where no folder entry exists. |
| D — Leave it; make it a tray | Today's behaviour, which is a tray per file. | This is the status quo, and it is what makes 100 % of groups ask a question. |

**Recommendation: A.** `[D]` It is the only option where a photo named by a camera cannot invent an
address. B leaves the same defect one rename away. The lost case in A is better served by the folder
the user already has to choose.

### D-02 — What is the confidence floor for a gazetteer substitution? (F-02)

`Wien` becomes `Schottwien` at 0.992 because the municipality list has no plain `Wien`, and 0.992
clears the spec's 0.98 "write it" bar.

| Option | What it means | Cost |
| --- | --- | --- |
| **A — Exact match first, fuzzy only as fallback, and never across a length gap** (recommended) `[D]` | Consult a normalized exact map before Fuse; when falling back, reject a hit whose length differs from the token by more than a small ratio. `Wien` → `Schottwien` is a 6-character addition and would be rejected. | A genuinely misspelled input may now fail to match instead of matching wrongly. That is the safer direction. |
| B — Fix the data only | Add `Wien` (and the other 22 statutory cities) to `at-gemeinden-bev.json`. | Fixes the instance, not the class — the next absent name substitutes just as confidently. Should be done **as well**, not instead. |
| C — Raise the threshold | Require ≥ 0.995. | Guesswork; `Schottwien` at 0.992 shows how little headroom there is, and a real typo scores lower than a wrong substitution. |

**Recommendation: A + B.** `[D]` A closes the class, B closes the instance, and B alone is a trap
because it looks like a fix.

### D-03 — Does city classification still require an explicit country segment? (F-03)

Today the AT gazetteer is only consulted when the path already contains a country token, so
`Graz/Annenstraße 10` yields nothing.

| Option | What it means | Cost |
| --- | --- | --- |
| **A — Default the country from the organisation** (recommended) `[D]` | An org has a home country; use it as the classification default when the path names none. The SO records that the country was defaulted, not parsed. | Needs an org-level setting and a provenance field. Wrong for an org working across borders — which is why the provenance matters. |
| B — Always consult the AT gazetteer | Drop the `useAtGeo` condition. | Silently assumes Austria for everyone; worse than A in exactly the case A is careful about. |
| C — Leave it | Users must put `AT` at the top of every tree. | Undiscoverable. It is not in any UI copy today. |

**Recommendation: A.** `[D]` It is the only option that stays honest when the assumption is wrong.

### D-04 — What is the import mode for a company-sized archive? (F-08, F-06, F-07)

45 000 tray questions and ~1.5 h of main-thread work for 100 000 files is not a tuning problem.
`[C]`

| Option | What it means | Cost |
| --- | --- | --- |
| **A — A distinct "archive import" mode** (recommended) `[D]` | Chunked classification that yields, uploads starting immediately, **no trays during import**: everything unresolved lands in Issues, and the user works the Issues lane afterwards with folder-level bulk answers. | A second flow to build and to spec. It is the honest shape: a migration is not an interactive batch. |
| B — Make the existing flow fast enough | Fix F-06 and F-07, keep trays. | Removes the waiting, not the 45 000 questions. |
| C — Cap the batch | Refuse folders over N files and tell the user to split. | Ships fastest, answers the customer's actual request with "no". |

**Recommendation: A**, with B's two performance fixes as its foundation. `[D]` They are needed
either way.

### D-05 — Should `locationRequirementMode: 'optional'` skip classification entirely? (F-05)

| Option | What it means | Cost |
| --- | --- | --- |
| **A — Spec wins: skip `classifyBatch` when optional** (recommended) `[D]` | Matches the trigger matrix; folder uploads behave like the flat multi-file path. | Loses the folder address for files the user later wants placed — mitigated by keeping the parse and storing it as a **hint** without gating. |
| B — Code wins: change the spec to say trays still gate | Documents today's behaviour. | Then the mode does not do what its name says, and the escape hatch has no escape. |
| C — Middle: classify, never gate | Build the SO, write the hints, open no tray. | Keeps the ~9 ms/file cost for an upload that opted out of addressing. |

**Recommendation: A.** `[D]` Whichever is chosen, the divergence must end — one of the two documents
is lying today, and that is the thing that costs a session.

### D-06 — Is the `test` gate allowed to pass while compiling nothing? (F-09, F-10)

| Option | What it means | Cost |
| --- | --- | --- |
| **A — A bundle that does not compile is a hard failure** (recommended) `[D]` | Separate "the suite ran and N tests failed" (soft, ratcheted) from "the suite did not run" (hard). | The gate goes red until the seven type errors are fixed — which is the point. |
| B — Fix the seven errors, leave the gate | Green again, same blindness next time. | It already happened once without anyone noticing. |

**Recommendation: A + fix the seven errors.** `[D]` A ratchet that cannot tell zero tests from all
tests passing is not a ratchet.

---

## 2 · The plan

Ordered so that each phase is independently shippable and each one is verified by something that
was **red first**. Sizes are effort, not calendar.

### Phase 0 — Make the evidence repeatable (no product change)

| Step | Change | Verified by |
| --- | --- | --- |
| 0.1 | Fix the seven type errors that stop the `ng test` bundle compiling (F-09). | `node scripts/verify.mjs test` compiles and reports a real pass/fail count. |
| 0.2 | Split the `test` gate into "did not run" (hard) and "ran with N failures" (soft), per D-06. | Deleting a random type annotation turns the gate red instead of `known debt`. |
| 0.3 | Re-measure and correct the `lint` and `test` debt notes (F-10). | The note matches a fresh measurement on `main`. |

**Class:** Standard. **Why first:** every phase below claims a test proves something, and today no
test in the repository runs in CI.

### Phase 1 — Stop writing wrong data (F-01, F-02)

| Step | Change | Verified by |
| --- | --- | --- |
| 1.1 | Amend `upload-search-object.md` per **D-01**: admin fields come from folder levels only. Update the § Admin level map collapse rule and the pass-2 table in the same change. | Spec lint green; the changed rule is quoted in the PR. |
| 1.2 | Implement 1.1 in `path-token-classifier.ts` / `upload-address-level-map.helpers.ts`. | A red-first test: `AT/Wien/1090/Währinger Straße 12/IMG_1274.jpg` keeps postcode 1090, and `IMG_1274`/`IMG_1275` in one folder share a `groupingKey`. |
| 1.3 | Amend the spec per **D-02**: exact-match-first, then bounded fuzzy. | Spec lint green. |
| 1.4 | Implement the normalized exact map in `classifyWithFuse`, and add the 23 statutory cities to `at-gemeinden-bev.json` via `scripts/build-at-gemeinden-bev.mjs` (never by hand). | Red-first: `Wien` classifies as `Wien`; `Schottwien` still classifies as `Schottwien`; a deliberate typo still matches. |
| 1.5 | Re-run the harness and record the new baseline in the playbook. | `GROUP-SPLIT-WITHIN-FOLDER` and `SO-CITY-NOT-IN-PATH` report zero findings on the curated corpus. |

**Class:** Sensitive. **Ordering note:** 1.4's exact map is also ~30 % of F-06's cost, so Phase 1
pays part of Phase 3 forward.

### Phase 2 — Stop asking avoidable questions (F-03, F-04, F-05)

| Step | Change | Verified by |
| --- | --- | --- |
| 2.1 | Org home-country setting + SO country provenance (`parsed` vs `defaulted`), per **D-03**; spec first. | Red-first: `Graz/Annenstraße 10/DSC_0001.jpg` yields city `Graz` and a non-empty `groupingKey`. |
| 2.2 | Widen the weak-filename guard (F-04) so a single-token file name with no house number never forms a street package. | Red-first: `foto.jpg` and `Abnahmeprotokoll.pdf` under an addressed folder open no `layer_package` tray. |
| 2.3 | Resolve **D-05** — make code and `upload-address-resolution.phases.md` agree, in one change. | Red-first: harness run C parks **0** files in `awaiting_disambiguation`. |

**Class:** Sensitive (2.1 touches org-scoped settings — `/security-review` applies).

### Phase 3 — Make the size work (F-06, F-07)

| Step | Change | Verified by |
| --- | --- | --- |
| 3.1 | Key `UploadJobStateService` by job id (`Map`) so `updateJob` and `findJob` are `O(1)`; keep the signal for rendering. | Harness scale tier: `updateJob` flat across 100 → 20 000 jobs instead of 0.002 → 0.573 ms. |
| 3.2 | Cache the Fuse index per geo dataset (one index, not one per token). | Scale tier: measurable drop in ms/file; index construction no longer in the profile. |
| 3.3 | Chunk `classifyBatch` so it yields to the event loop, and start the queue after the first chunk instead of the whole tree. | A 5 000-file folder begins uploading in under a second; harness reports first-upload latency. |

**Class:** Sensitive (3.1 is the state store for a stateful service — FSM and idempotency invariants
must be restated). **Note:** 3.1 and 3.2 are independently valuable and independently testable; do
not bundle them.

### Phase 4 — The archive import mode (D-04)

Only after Phase 3, and only if **D-04 option A** is accepted. Spec first — a new flow, not a flag:
chunked import, uploads first, no trays during import, everything unresolved to Issues, and
folder-level bulk resolution in the Issues lane afterwards. Needs its own ownership matrix and FSM
table, and a decision about what "done" means for an import that leaves 40 000 items in Issues.

### Not in this plan

- **Rewriting the tray system.** F-08 is a product decision (D-04), and the merging that exists
  already works — one question covered 549 files. `[B]`
- **Touching `address_dedupe_key`, RLS or migrations.** Nothing in STUDY-005 implicates them, and
  the harness cannot see them.
- **Optimising storage or thumbnailing.** Unmeasured by the harness; no evidence either way.

---

## 3 · How each phase gets proven

Per `AGENTS.md` § Red-test-first, a Sensitive change must show the acceptance test **failing before**
and passing after. The harness gives three complementary levels, and a phase should use the
narrowest one that can fail:

| Level | Use it for |
| --- | --- |
| Unit spec next to the changed file | One rule: a token classification, a collapse, a guard. |
| `upload-pipeline-trace.spec.ts` runs A–C | An end-to-end consequence: which lane, which tray, which payload. |
| `--scale=N` tier | A cost claim: ms/file, per-write cost, tray count. |

Plus, on every run, the FSM assertion from `src/test/vitest.setup.ts` — an illegal `UploadPhase`
transition throws — so a green harness run is also evidence the state machine held for the whole
corpus. `[A]`

## 4 · What would change this plan

- **A real customer folder tree.** `[D]` The corpus is invented. One exported archive would settle
  how much F-01 and F-03 actually cost, and could reorder Phases 1 and 2.
- **A measurement in a real browser.** `[D]` The timings are Node + jsdom on one core. If a browser
  is materially slower, Phase 3 moves ahead of Phase 2.
- **A different answer to D-01 or D-04.** `[D]` D-01 option D (leave it) deletes Phase 1.2 and makes
  Phase 4 mandatory rather than optional; D-04 option C (cap the batch) deletes Phase 4 and most of
  Phase 3.
