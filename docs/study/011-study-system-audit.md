---
id: STUDY-011
type: review
status: proposed
supersedes: none
corrected-by: none
---

# The study system audits itself

**Measured:** 2026-09-22 · **Branch:** `claude/study-system-audit-enforce-4e6oov` at `318180e`
(`origin/main` is at the same commit) · **How:** by running checks, not by reading prose. A parser over every
`docs/study/NNN-*.md` frontmatter and the README index (the code became
`scripts/check-study-format.mjs`); `git ls-files` over the four closed folders; `git log` over the
folders' history; `node` against the shipped `at-plz.json` and `at-gemeinden-bev.json`; `grep` across
`apps/web/src`, `docs/`, `.cursor/rules/` and `scripts/`; and the GitHub REST issue list — **all 155
open issues**, both pages, read for study citations. Where a claim below is a static reading and
nothing was executed, it says so and is graded accordingly (Constitution § 4).

**What this study did not touch.** No study body was edited. No `status` was changed. No `[D]` was
altered. No file was moved out of a closed folder. Each of those is recorded under § What was
deliberately left alone, with the reason.

---

## Summary

The folder's **structural** claims about itself are true, with one exception, and the exception is
recent. Nine studies, nine index rows, nine unique ids, every id matching its filename, every
internal reference resolving. The four closed folders have held: **zero** files added to any of them
since they were closed on 2026-09-10. `[A]`

Three things are not true:

1. **STUDY-009 carries a `status` and a `corrected-by` that no document defines** — `decided`, and
   `self (§ The measurement, 2026-09-21)`. `[A]` (§ S-01, § S-02)
2. **Two studies that do not exist are cited as if they did**, in open issues, one of them reusing an
   id the repository has already assigned. `[A]` (§ S-03)
3. **The rule against rewriting a study into agreement was broken 15 hours before this audit ran**,
   in the study `AGENTS.md` names as mandatory reading. `[A]` (§ S-04)

The pattern under all three: every one of them is a *mechanical* property that no mechanism was
checking. Part 2 of this work closes the ones a linter may honestly own; § S-04 is not one of them,
and § What a gate cannot do says why.

---

## 1 — Structural integrity

Run `node scripts/check-study-format.mjs` to reproduce every row here.

| Question | Answer | Evidence |
| --- | --- | --- |
| Complete frontmatter (all five fields, `none` not omitted)? | **Yes**, 9/9 | `[A]` |
| `type` from the documented vocabulary? | **Yes**, 9/9 | `[A]` |
| `status` from the documented vocabulary? | **No**, 8/9 — STUDY-009 | `[A]` § S-01 |
| Ids unique? | **Yes** | `[A]` |
| Filename `NNN` matches `id`? | **Yes**, 9/9 | `[A]` |
| Exactly one index row per study? | **Yes**, 9 rows for 9 studies | `[A]` |
| Index row status matches the file? | **Yes**, 9/9 (including STUDY-009's invalid value, which agrees in both places) | `[A]` |
| Every id in `supersedes` / `corrected-by` exists? | **N/A** — `supersedes` is `none` in all nine; the one `corrected-by` is not an id at all | `[A]` § S-02 |
| Relationship symmetric (B supersedes A ⟹ A names B)? | **Vacuously true** — no study supersedes any other | `[A]` |

**The supersession machinery has never been exercised.** `[A]` Every `supersedes` field in the folder
is `none`. The one correction that has happened (STUDY-009's own, 2026-09-21) was written *into the
file it corrects*, not as a new study — which is exactly the case the fields exist for, and it went
around them. `[C]` That is why § S-02 matters more than a malformed string usually would: the field's
first real use was its first misuse, and there is no worked example in the repository showing the
intended shape.

### S-01 — `status: decided` is not a status

`docs/study/009-tray-question-budget-and-priority.md:4` reads `status: decided`. `[A]`
`STUDY-FORMAT.md` § `status` values lists eight: `draft`, `proposed`, `accepted`, `active`,
`partially-remediated`, `historical`, `rejected`, `superseded`. `decided` is none of them. `[A]`
The index row agrees with the file (`README.md:53`), so the two are consistent and both wrong. `[A]`

Introduced by `cfc7c78`, *"docs: STUDY-009 is decided — the budget was closed, not deferred (#233)"*,
2026-09-21. `[A]` It was a deliberate edit, not a typo: the commit subject uses the word.

**What it should be is not mine to say.** `accepted` is the closest documented fit — STUDY-FORMAT
defines it as *"the owner signed off; the normative text now lives in a spec, this file keeps the
reasoning"*, and the study's § Tracked as records that priority (#231) and the backlog surface (#232)
shipped while the budget (#230) was closed as not planned. `[C]` But `accepted` is an owner call
(prohibition 5), and the author may have reached for a ninth value precisely because a proposal whose
answer was *"do not build it"* is neither `accepted` nor `rejected`. `[C]`

**Recommend:** (a) the owner picks the status. If the answer is that the eight values genuinely do
not cover "measured, and the measurement closed the question", that is a `STUDY-FORMAT.md` amendment,
not a one-file exception — and it must be reconciled against Grundriss first (§ 5).

### S-02 — `corrected-by: self (…)` is not a study id

`docs/study/009-tray-question-budget-and-priority.md:6` reads
`corrected-by: self (§ The measurement, 2026-09-21)`. `[A]` `STUDY-FORMAT.md` § Frontmatter defines
the field as *"Study ids that later corrected this one"*. `[A]`

The thing it points at is real and is good work: § The measurement, 2026-09-21 (#229) measured the
question curve and found the study's central premise did not hold at the sizes it worried about, and
§ Correction 1 … § Correction 5 say so without deleting what was claimed before. `[A]` So this is not
a study hiding a wrong answer. It is a **self-correction**, a shape the format does not describe: the
format says a correction arrives as a **new study** with `corrected-by` filled in on the old file
(`STUDY-FORMAT.md:70`). `[A]`

**Recommend:** (b) the owner decides between two coherent answers and only then does anyone touch the
file — either the self-correction is legitimate and `STUDY-FORMAT.md` gains a rule for it (with a
field shape a machine can read, e.g. `corrected-by: self`), or the measurement is split into its own
study and this field names it. Both are cheap; picking is the part that is not mine.

### Why neither is fixed here

Prohibition 1 permits changing `status` on an existing study. Prohibition 5 forbids me from choosing
`accepted`. Between them the only status I could legally write is one I have no basis to prefer, so
both violations are registered as **known debt** in `scripts/check-study-format.mjs` (`KNOWN_DEBT`,
measured 2026-09-22, 2 violations in 1 file) rather than fixed or waived. The list is a ratchet: a
violation outside it fails the gate, and an entry that no longer matches *also* fails, so the debt
cannot be carried after it is paid.

---

## 2 — Format compliance

### Measurement conditions: when, on what, how

`STUDY-FORMAT.md:55` requires all three below the frontmatter.

| Study | When | On what (branch **and commit**) | How | |
| --- | :---: | :---: | :---: | --- |
| STUDY-001 | ✓ | ✓ `8fc56deb` | ✓ | `[A]` |
| STUDY-002 | ✓ | ✓ `8fc56deb` | ✓ | `[A]` |
| STUDY-003 | ✓ | ✓ `8fc56deb` → `18f8c208` | ✓ *(in § The measurement ceiling, not the header)* | `[A]` |
| STUDY-004 | ✓ | ✓ `870963cb` | ✓ | `[A]` |
| STUDY-005 | ✓ | ✓ `650f495` | ✓ | `[A]` |
| STUDY-006 | ✓ | **✗ no commit** | **✗ no method stated** | `[A]` |
| STUDY-007 | ✓ | ✓ `fe58d49` | ✓ | `[A]` |
| STUDY-008 | ✓ | ✓ `8420035` | ✓ | `[A]` |
| STUDY-009 | ✓ | **✗ branch only, no commit** | ✓ | `[A]` |

**STUDY-006 states neither a commit nor a method.** `[A]` `grep -n "Method\|@ \`\|at \`[0-9a-f]\{7\}"`
over the file returns nothing. Its header gives a write date, a last-updated date and a merge date,
which is provenance of a different kind — useful, and not what the rule asks for. This is the study
`AGENTS.md` § Document Authority names as mandatory reading before upload-pipeline work, and it is
829 lines of decisions and phase plans. Its § Phase 5 is maintained to the day (a `2026-09-22` entry
landed in `bcd3012`), so *when* is never in doubt in practice — but a reader cannot re-grade a 2026-09-12
claim in it without knowing what tree it was measured against. `[C]`

**Recommend:** (c) this is not staleness and not a wrong claim — it is a missing header, and
prohibition 1 does not permit me to add one. It is the clearest candidate for the format's own
"a file is reclassified when it is next edited" convention: whoever next edits STUDY-006 adds the
measurement line.

### `partially-remediated` studies name which findings are fixed and where

Both do. Confirmed, not assumed:

- **STUDY-003** — a Findings table with a `State at 18f8c208` column marking 4 of 8 remediated, and
  each remediated finding's body names the file and line that fixed it
  (`20260910160000_fix_address_precision_overloads.sql:68`, `:143`, `:220`). `[A]`
- **STUDY-005** — a 22-row Register with struck-through titles and `**fixed**` on the closed ones,
  and bodies carrying `**Fixed 2026-09-13** (Phase 1.1–1.2, D-01 option A′)` and similar, naming
  phase, date and mechanism. `[A]`

### Actionable claims carrying no grade

Every study carries grades; none is ungraded wholesale. `[A]` Counts, `grep -o` per file:

| | A | B | C | D | total | lines |
| --- | --: | --: | --: | --: | --: | --: |
| 001 | 3 | 7 | 5 | 4 | 19 | 98 |
| 002 | 6 | 1 | 9 | 6 | 22 | 87 |
| 003 | 0 | 10 | 0 | 0 | 10 | 96 |
| 004 | 87 | 9 | 11 | 3 | 110 | 229 |
| 005 | 133 | 13 | 15 | 3 | 164 | 1077 |
| 006 | 24 | 4 | 10 | 27 | 65 | 829 |
| 007 | 8 | 6 | 9 | 19 | 42 | 234 |
| 008 | 4 | 4 | 4 | 11 | 23 | 161 |
| 009 | 9 | 2 | 0 | 12 | 23 | 367 |

STUDY-003's zero `[A]`s are not an omission: its § The measurement ceiling declares that nothing in
it is graded above `[B]` because nothing was executed, and the file keeps that promise. `[A]` That is
the format working.

**There is one systematic gap, and it has already caused a wrong reading.** `[A]` The **summary
tables** carry no grades — STUDY-005's Register and STUDY-006's § Status at a glance. Their cells say
`**fixed**`, `Decided (Option A′) — built`, `built and verified`. Every one of those is an actionable
claim about the current world, and a reader who consults the register instead of the 1 077-line body
— which is what a register is *for* — acts on ungraded prose.

The consequence is not hypothetical. STUDY-005's Register lists **F-09, F-10 and F-13 as open**
(no strikethrough, no `**fixed**`), while their bodies say `**Resolved 2026-09-12**`,
`Rewritten 2026-09-12` and — for F-13 — nothing, because F-13 was closed by a commit the study never
learned about (§ S-05). `[A]` The graded body and the ungraded summary disagree, and the ungraded one
is the one people read.

**Recommend:** (b) a correcting study, or (c) the register rows gain grades when STUDY-005 is next
edited. Not a gate: "is this row's state true" is exactly the judgement a linter must not pretend to
make (§ What a gate cannot do).

---

## 3 — Staleness

Trust order: owner correction → spec → live code → study. Where they disagree the **code is right**.

### S-05 — STUDY-005 F-13 is stale; the code closed it six days later

| | |
| --- | --- |
| **The study's claim** | *"`ng test` never loads `vitest.config.ts`, so its aliases are inert in CI … The builder's `--runner-config` option opts in; `angular.json`'s test block sets only `setupFiles`."* Register: **open**. Body: **"Not fixed here."** `[A]` (`005-upload-pipeline-trace-findings.md:717`, `:734`) |
| **The current code** | `apps/web/angular.json:98-105` — the `test` target sets `"setupFiles": ["src/test/vitest.setup.ts"]` **and `"runnerConfig": true`**. `[A]` |
| **When it changed** | `2eb608b`, 2026-09-16, whose message says so outright: *"angular.json now sets runnerConfig: true, so @angular/build:unit-test loads vitest.config.ts and both ways of running a spec apply one configuration — closing F-13."* `[A]` |

The commit closed the finding and did not update the study. The study has said "not fixed" for six
days about a thing that was fixed. Blast radius: STUDY-005 is `AGENTS.md`-mandatory reading before
upload-pipeline work and is cited from **35 files** outside `docs/study/` (§ 4), so this is the most
widely-read stale sentence in the folder. `[A]`

**Recommend: (b) a correcting study** — or, more proportionately, the register-and-body sync that
§ 2's grade gap already calls for, done in one edit that covers F-09, F-10 and F-13 together. Not
(a) `superseded`: 19 of the 22 findings are still accurate and the document is load-bearing. I did
not fix the code, because the code is already right.

### The other open findings in STUDY-005 still hold

Checked, not assumed:

- **F-17** (a parked job keeps its content-hash reservation) — **still true.** `[A]`
  `apps/web/src/app/core/upload/support/upload-job-state.service.ts:224-225` still releases the
  reservation only inside `if (TERMINAL_PHASES.has(phase))`, and `:12` documents the terminal set as
  `complete, error, missing_data, skipped` — `awaiting_disambiguation` is not among them. The file
  moved into `support/` since the study was written; the study names it without a path, so the
  reference still resolves. `[A]`
- **F-18** (the postcode table is a 21-row stub) — **still true, and the half the study called fixed
  is fixed.** `[A]` `node` over the shipped assets: `at-plz.json` has **21** entries;
  `at-gemeinden-bev.json` has **2 118**, matching the study's stated rebuild exactly.
- **F-09 / F-10** — the register says open, the bodies say resolved (§ 2). The bodies are right:
  `verify.mjs` carries the `evidence` hook F-09's fix describes (`scripts/verify.mjs:143`,
  `:196-206`) and the rewritten debt notes F-10 asked for. `[A]`

### STUDY-007 and STUDY-008 are `proposed`; both shipped

| Study | Status | What is in the tree today |
| --- | --- | --- |
| STUDY-007 | `proposed` | `apps/web/src/app/core/upload/location/exif-house-number.ts:1-18` — *"D-09 / STUDY-006 Phase 5.7 — EXIF may supply a house number, **confirm-only**"*, the study's own recommendation, with a spec at `docs/specs/service/media-upload-service/upload-exif-house-number.supplement.md`. STUDY-006 § Status at a glance records D-09 as **"Decided 2026-09-15"**. `[A]` |
| STUDY-008 | `proposed` | `enqueueAndClassifyInChunks` at `apps/web/src/app/core/upload/manager/upload-manager-submit.util.ts:244`, called from three submit paths (`:71`, `:144`, `:195`), with a spec at `…/upload-manager-pipeline.chunked-classification.supplement.md`. `[A]` |

`proposed` means, in the format's own words, *"it recommends a change **nobody has accepted**. Not a
contract. Not permission to implement."* (`STUDY-FORMAT.md:62`). Both were accepted and both were
implemented. The status field is now saying the opposite of what happened. `[A]`

This is the failure mode the grades exist to prevent, running backwards: not a `[D]` read as an
`[A]`, but an accepted decision still labelled unaccepted — so a reader who obeys the status will
decline to rely on reasoning the product already depends on. `[C]`

**Recommend:** (a)-adjacent — the owner marks both `accepted`. The normative halves are already in
specs, which is exactly the condition `accepted` describes. I did not apply it (prohibition 5).

### STUDY-001, STUDY-002 and STUDY-004 are `proposed` and still accurate

- **STUDY-001** — the equal-area disc is still a proposal, not code. `[A]` Radius selection still uses
  `map.distance` per cell (`apps/web/src/app/features/map/map-shell/radius/radius-selection.service.ts:59`);
  `boundingbox` still has **zero** occurrences under `apps/web/src/app/core/geocoding/`; the shared
  `haversine.util.ts` it cites exists. No disagreement with the code.
- **STUDY-002** — its load-bearing claim holds. `[A]` `locationPinEligible` still returns true only
  for a non-empty `street` plus valid coordinates
  (`apps/web/src/app/core/media-locations/media-locations.helpers.ts:303-309`), still gates
  `locationsWithGps` (`:311`) and `countZoomableLinks` (`:316`), and `viewport_markers` is still
  defined by `supabase/migrations/20260524120000_locations_nn_junction.sql` with no street or
  precision predicate — no later migration redefines it. `[A]` **Line numbers have drifted** by ~6:
  the study cites `:309-315`, `:318-320`, `:323-325`. The claims are unaffected; the citations are
  now approximate.
- **STUDY-004** — conflicts C-01, C-02 and C-03 are all still open, and **C-03 has got worse**. `[A]`
  `.github/copilot-instructions.md` still carries 113 lines of restated rules; `.github/instructions/`
  still holds nine path-scoped rule files; and `CONTRIBUTING.md:26-33` still says *"Three checks are
  soft"* with `specs` 201, `lint` 151 + **1068**, and *"the test bundle does not compile — ~101 TS
  errors"*, while `scripts/verify.mjs` today has **four** soft checks, `specs` **198**, `lint` 151 +
  **1072**, and a `test` debt note recording **0 failing across 1 551 tests**. `[A]` The single
  sentence in `CONTRIBUTING.md` that a new contributor reads about the test suite is now the exact
  opposite of the truth.

### S-06 — the `test` gate's debt note states a number that no longer matches

This is STUDY-005 F-10's finding recurring, in the same file, two weeks later — and it is the reason
it belongs in an audit of the reasoning layer rather than only in a bug report: F-10 was closed by
rewriting one note, not by removing the thing that lets notes drift.

`scripts/verify.mjs:156` records the `test` debt as **"0 failing tests (measured 2026-09-20, three
consecutive cold runs, 1 551 tests)"**. `[A]` Measured on this branch's base — `318180e`, with a cold
`.vite` cache, which is what the check does — the suite reports **4 failing of 1 710 tests across 3
failing files**: `[A]`

```
FAIL  src/app/core/location-path-parser/upload-search-object.builder.spec.ts
        > classifies country before postcode and street tokens
FAIL  src/app/core/location-path-parser/upload-search-object.unit-parsing.integration.spec.ts
        > EX-09: slash top on folder segment
FAIL  src/app/core/upload/location/exif-house-number.spec.ts
        > compares streets through the same fold the grouping key uses, not raw equality
FAIL  src/app/core/upload/location/exif-house-number.spec.ts
        > folds the street into the key, so spelling twins do not ask twice
Tests  4 failed | 1706 passed (1710)
```

The ratchet is therefore stated **4 failures below its real value**, and the suite has grown by 159
tests since the note was written, so the note's denominator is stale too. `[A]` Nothing here was
introduced by this study: the audit's two commits touch four files, **none of them under
`apps/web/`**, and the run above is the base commit with no local changes. `[A]`

The gate's own `evidence` hook is what surfaced this — it prints the measured count on every run
precisely so the summary number is observed rather than remembered (`scripts/verify.mjs:41-51`),
which is F-09's fix working exactly as designed. `[A]` What it cannot do is compare that count with
the note beside it; that comparison is still a human reading two lines of the same screen.

**Recommend:** raise with the owner as its own piece of work, not as part of this one. The four
failures are in upload and EXIF-fold specs that this audit has no business touching, and the note
must not simply be rewritten upward — `AGENTS.md` is explicit that the counts **may only go down**.
Either the four are fixed and the note stays at 0, or someone establishes what regressed and when.
The measurement above is the starting point either way. **Not fixed here** (prohibition 6: do not add
to known debt — and quietly raising a ratchet to match reality is how a ratchet stops being one).

**Recommend:** (c) for STUDY-001 and STUDY-002 — the studies are right and nothing has diverged.
For STUDY-004, also (c): the study is right, and what is stale is `CONTRIBUTING.md`. Fixing it is a
**Trivial**-class change to a file this audit was not asked to touch, and it is the kind of drift
`gates-and-commands.md:27` already solved for itself by refusing to restate counts —
`CONTRIBUTING.md` should point at `node scripts/verify.mjs --list` the same way. Filed here rather
than fixed, because "you are not tidying prose".

---

## 4 — Reachability

### Who cites what

`grep` for `STUDY-NNN` and `study/NNN-` across `*.md`, `*.ts`, `*.mjs`, `*.mdc`, `*.json`, `*.yml`,
excluding `node_modules` and `docs/study/` itself, plus all 155 open GitHub issues. `[A]`

| Study | Files outside `docs/study/` | `AGENTS.md` | `docs/specs/` | `.cursor/rules/` | Open issues |
| --- | --: | :---: | :---: | :---: | --- |
| STUDY-001 | 1 | — | — | — | #155, #159 |
| STUDY-002 | 1 | — | — | — | — |
| STUDY-003 | 1 | — | — | — | — |
| **STUDY-004** | **0** | — | — | — | **—** |
| STUDY-005 | 35 | **✓** | 8 specs | — | #225, #226, #228 |
| STUDY-006 | 26 | **✓** | 11 specs | — | #203, #204, #217, #218, #220, #221, #224, #225, #228 |
| STUDY-007 | 8 | — | 2 specs | — | #221, #245 |
| STUDY-008 | 5 | — | 2 specs | — | — |
| STUDY-009 | 16 | — | 2 specs | — | #241, #242, #243 |

- **`.cursor/rules/` cites no study at all.** `[A]` `grep -rn "STUDY-\|docs/study" .cursor/rules/`
  returns nothing across all eight rule files. The rule layer is normative
  (`AGENTS.md` § Instruction precedence, item 3) and is wired to nothing in the reasoning layer.
  Whether that is a gap or correct separation is a `[D]`, and it is the owner's.
- **STUDY-004 is cited by nothing.** `[A]` Zero references outside the folder, zero open issues. Its
  subject is the instruction system itself, its § 4 Conflict register is still accurate six days on
  (§ 3), and nothing points at it — so the document describing the repository's organizational drift
  is itself organizationally orphaned.
- **STUDY-001, -002 and -003's only citation outside the folder is
  `scripts/issues-2026-09-10-upload-and-cleanup.json`** `[A]` — a one-off issue-creation payload, not
  a live document. Effectively unreferenced.

### S-03 — two studies are cited that do not exist, and one reuses a live id

`[A]` Both found by reading every open issue body; neither is catchable by `doc-links`, which scans
tracked Markdown and cannot see GitHub.

| Citation | Where | Reality |
| --- | --- | --- |
| `docs/study/010-exif-inheritance-grouping-unit.md`, described as **"now `accepted`"** | issue **#245** | **No such file.** Never existed: `git log --all -- 'docs/study/010*'` is empty, and `grep -rl "exif-inheritance-grouping"` over the tree returns nothing. |
| `docs/study/009-jev-system-one-model-evaluation.md`, cited for **"§ F-1 / F-3 / F-4, graded `[A]`"** | issues **#241**, **#242** | **No such file** — and `STUDY-009` is taken, by `009-tray-question-budget-and-priority.md`. Two different documents are being cited under one id. |

In-tree citations are clean by contrast: every `docs/study/NNN-…md` path referenced anywhere in the
repository resolves. `[A]` The drift is entirely in the issue tracker, which is where studies are
cited most casually and where nothing checks.

**Why this matters more than a broken link.** `STUDY-FORMAT.md:49` calls the id *"the citable handle
for issues, PRs and specs"* and says it is *"never reused"*. The handle's whole value is that
`STUDY-009` means one document. It currently means two, in a repository where three open issues
(#241, #242, #243) carry acceptance criteria that cite the wrong one for their evidence. A reader
following #241's `[A]` grade to `docs/study/009-…` lands on a tray-question budget study that says
nothing about `resolveIssue`. `[A]`

**This is also why this study is STUDY-011 and not STUDY-010**, which `STUDY-FORMAT.md:98` would
otherwise require ("take the next free `STUDY-NNN`"). `STUDY-010` is unfree in the only sense that
matters: it is publicly cited, in an open issue, as a specific accepted document. Taking it would
create a *second* collision of exactly the kind § S-03 is about. The gap at 010 is deliberate and is
recorded here so nobody closes it by accident. `[D]`

**Recommend:** (b) for both — whoever owns #245 and #241/#242 either writes the study that was cited
or corrects the citation. Reusing `STUDY-010` for anything else needs the owner's word first.

### The closed folders

**No file has been added to any of the four since they closed on 2026-09-10.** `[A]`
`git log --since=2026-09-11 --diff-filter=A -- docs/audits docs/backlog docs/implementation-blueprints docs/migration/reports`
returns nothing.

| Folder | Tracked files | Documents (excluding the folder README) |
| --- | --: | --: |
| `docs/audits/` | 36 | 35 |
| `docs/migration/reports/` | 19 (18 `.md` + 1 `.json`) | 18 |
| `docs/backlog/` | 8 | 7 |
| `docs/implementation-blueprints/` | 2 | 1 |
| **Total** | **65** | **61** |

**None were moved. Reported only** (prohibition 2; `docs/study/README.md` § Migrating an existing
document, on the authority of audit item D4).

Two count discrepancies, neither of them drift:

- `docs/study/README.md:16` says **63** documents across the four folders, as *"36 in `audits/`, 18 in
  `migration/reports/`, 8 in `backlog/`, 1 in `implementation-blueprints/`"*. Those four numbers count
  folder READMEs as documents in three folders and not in the fourth. `[A]` Counted consistently the
  figure is **61**, and counted the README's way it is still 63 — so **nothing has been added and
  nothing has been migrated out**, which is the fact the sentence is there to establish. The number
  is not wrong so much as unreproducible.
- STUDY-004 § 5 says **64** legacy reasoning docs. `[A]` Same cause.

**Recommend:** (c) both studies are right about the world; only the counting rule is unstated. The
`study-format` check now pins the file list exactly (`CLOSED_FOLDER_BASELINE`, 65 paths), so the
question cannot recur unnoticed.

### The closed folders' READMEs are accurate

All four say where new reasoning goes, and all four say it correctly. `[A]`

- `docs/audits/README.md:3` — *"Closed to new documents (2026-09-10) … An audit is a study with
  `type: review` and `status: historical`"*, and the reclassify-on-edit rule.
- `docs/backlog/README.md:3` — closed; open work is a GitHub Issue; reasoning is `type: proposal`.
- `docs/implementation-blueprints/README.md:3` — closed; *"holds exactly one blueprint and gains no
  more"*, which matches the tree (1 document + README).
- `docs/migration/README.md:47` — *"`reports/` is closed to new documents (2026-09-10) … The 18
  reports below"*, which matches the 18 `.md` files exactly.

---

## 5 — Where `STUDY-FORMAT.md` and `README.md` diverge

`STUDY-FORMAT.md` carries a provenance warning: it is an **unverified port** from the sibling
Grundriss repository, which is not reachable from this environment. `[A]` I did not resolve any
ambiguity below by inventing a rule; each is reported for the reconciliation the warning asks for.

1. **Three closed folders or four?** `STUDY-FORMAT.md:19` names `docs/audits/`, `docs/backlog/` and
   `docs/implementation-blueprints/`. `docs/study/README.md:14` names those three **and**
   `docs/migration/reports/` (*"in scope for the same rule and closes with it"*), and its table has a
   fourth row for it. `[A]` This is an omission rather than a contradiction — nothing in
   `STUDY-FORMAT.md` says `migration/reports/` is open — but the two normative lists are not the same
   list, and a reader who reads only the format file will not know the fourth folder is closed. The
   check enforces four, following the README, which is the more specific and later document.
   **Recommend:** the next edit to `STUDY-FORMAT.md` adds the fourth folder, *after* Grundriss
   reconciliation, since the line is part of the ported text.
2. **The `historical` status is a known Feldpost extension** and `STUDY-FORMAT.md:6` says so, flagging
   that it may not exist in Grundriss. `[A]` The check accepts it, on the file's own authority. If
   Grundriss wins and drops it, the check's `STATUSES` list changes with the format — one line, and
   it is named in the docblock.
3. **`decided` is a second, undocumented extension** that arrived without a note (§ S-01). `[A]` The
   difference between it and `historical` is entirely that one was written down.
4. **Nothing says whether an `accepted` study may keep being appended to.** `[A]` STUDY-006 is
   `accepted` and has been edited on at least 2026-09-16, -18, -20 and -22. The format forbids
   rewriting a study *into agreement*; it says nothing about appending status updates to an accepted
   plan, which is what STUDY-006 does and which is plainly useful. I read this as permitted and out of
   the prohibition's scope, but it is genuinely unstated. **Recommend:** say so explicitly, either way.

---

## 6 — S-04: the rule was broken six days in, in the study that matters most

This one is not structural and no gate below catches it. It is here because it is the most serious
thing this audit found.

`STUDY-FORMAT.md:70`: *"Studies are **never deleted and never rewritten into agreement**. A claim that
turned out wrong stays, with the correction linked. That is the whole value of the status axis."*

`bcd3012` (2026-09-22, ~15 hours before this audit ran) edited `docs/study/006-upload-pipeline-correction-plan.md`
and **deleted a graded claim**: `[A]`

```
- `[A]` **The tree RPCs are confirmed absent.** Querying `pg_proc` for `media_folder_tree` and its
- siblings returns nothing: `20260920120000_media_folder_tree_rpcs.sql` has never been applied. "Never
- applied" is now measured rather than assumed.
```

replaced by an `Update 2026-09-22` recording that the migration is now applied on hosted. The same
commit also replaced the eight-line *"5.5 has a blocker this environment cannot clear"* paragraph with
a three-line update. `[A]`

**In mitigation, and it is real mitigation:** the replacement text explicitly names what it
superseded — *"The 2026-09-20 `[A]` 'RPCs confirmed absent' claim is **superseded for hosted** — it was
true then, not now"* — so the reader is told a claim changed, and the new claim carries its own
evidence (project id, `schema_migrations` version, the two function names). This is a careful edit by
someone who understood the trust order. `[C]`

**It is still the prohibited operation.** The old claim's text is gone from the file; only the new
file's description of it survives. The format's rule is not "explain what you overwrote", it is
"the claim stays". `[A]` And the general case is worse than this instance: the next person to do
this will be less careful, and `git log` is the only place the original will exist.

**Recommend:** raise with the owner as a process question, not a revert. Reverting would itself be a
study-body edit. The two coherent answers are (i) the rule means what it says and this should have
been a new study with `corrected-by` on STUDY-006 — in which case the guidance needs to be somewhere
an agent editing a study will actually hit it, because `STUDY-FORMAT.md:70` was not enough; or (ii)
an in-place dated `Update` that names what it supersedes is an accepted pattern, in which case write
it down, because two agents have now invented it independently (this commit and STUDY-009's
self-correction, § S-02).

---

## 7 — What the gate does, and what it cannot

`scripts/check-study-format.mjs`, wired into `npm run verify` as `study-format` (hard) and runnable
alone with `node scripts/verify.mjs study-format`.

**It fails on** — missing or malformed frontmatter; a `type` or `status` outside the documented
vocabularies; an `id` that is malformed, disagrees with its filename, or is duplicated; a study with
no index row; an index row whose status disagrees with the file; an index row pointing at a file that
does not exist; a `supersedes` / `corrected-by` that is not `none` or a list of existing ids; and any
file added to one of the four closed folders. Each rule was verified by introducing the violation and
watching the check fail (§ 8).

**It does not fail on** — staleness, grade quality, whether a claim is true, whether a status is the
*right* status, or whether a measurement header is present. Every one of those needs judgement, and
`AGENTS.md`'s own soft-check reasoning applies: a gate that is red on a clean tree, or that reports
opinions, teaches people to ignore it — and then they ignore its real findings too. `[D]`

### What a gate cannot do

Three of this audit's findings are out of reach of any linter, and saying so is part of the
deliverable:

- **§ S-04** — detecting that an edit *removed a graded claim* requires reading a diff and judging
  whether the removal was a rewrite-into-agreement or an honest append. A machine can flag that a
  study body changed; it cannot say whether that was allowed. `[C]` The only mechanism that fits is a
  review rule — a line in `.cursor/rules/` or `AGENTS.md` that says a diff deleting a graded sentence
  from `docs/study/` needs an explicit justification. **Recommended, not built:** it is a rule change,
  and rules are the owner's.
- **§ S-03** — the dangling citations live in GitHub issue bodies. Nothing in `verify` can see them,
  and a gate that fails the build because someone typed a filename into an issue would be the wrong
  shape of check anyway. `[C]`
- **§ 3** — F-13's staleness is invisible structurally. The study is well-formed; it is simply wrong
  about `angular.json`. Only someone reading both can tell. `[A]`

---

## 8 — What this study could not prove, and what would settle it

| Claim | Why it is not `[A]` | What would settle it |
| --- | --- | --- |
| The `study-format` check's rules match Grundriss | Grundriss is unreachable from this environment; `STUDY-FORMAT.md` is an unverified port and says so. The check enforces Feldpost's written vocabularies, including the `historical` extension. `[B]` | Reconcile against Grundriss's own `STUDY-FORMAT.md` and `new-study.mjs`, treating every divergence as Grundriss-wins (`STUDY-FORMAT.md:4`). The check's `TYPES` and `STATUSES` are two named constants. |
| Every study's *claims* are still true | Only the studies with status `proposed` or `active`, plus STUDY-005's open findings and STUDY-006's Phase 5, were re-checked against code. STUDY-006's 829 lines of decisions were not re-derived. `[C]` | A per-finding re-run of the trace harness (`docs/playbooks/upload-pipeline-trace.md`), which is a study of its own. |
| STUDY-007's and STUDY-008's status *should* be `accepted` | Their recommendations shipped, which is evidence the owner accepted them, not proof. `[C]` | The owner says so. Prohibition 5. |
| F-17 still reproduces at runtime | Read from source: the terminal-phase set and the single `unregisterInflightDedupHash` call site. Not executed. `[B]` | Re-run trace run A then run B, per F-17's own method. |
| The closed folders hold *only* what `git ls-files` reports | Untracked files are invisible to the check by design (same rule as `doc-links`), so a new document that was never `git add`ed would not be caught. `[A]` for tracked, unknown for untracked. | Nothing worth building; an uncommitted file is not yet a document. |
| The 155 open issues are the whole citation surface | Closed issues and PR bodies were not searched. `[B]` | A wider `search_issues` pass including closed issues. |

---

## Decisions this study is waiting on

None of these were applied. Each is an owner call.

| # | Decision | Section |
| --- | --- | --- |
| 1 | What status replaces STUDY-009's `decided` — or does `STUDY-FORMAT.md` gain a ninth value? | § S-01 |
| 2 | Is `corrected-by: self` a legitimate shape, or does STUDY-009's measurement become its own study? | § S-02 |
| 3 | Do STUDY-007 and STUDY-008 become `accepted`? | § 3 |
| 4 | Who writes — or un-cites — `STUDY-010` and `009-jev-system-one-model-evaluation`? Is `STUDY-010` reserved? | § S-03 |
| 5 | Is an in-place dated `Update` to an accepted study permitted, or must corrections be new studies? | § S-04, § 5.4 |
| 6 | Should `.cursor/rules/` cite studies at all? | § 4 |
| 7 | Does `CONTRIBUTING.md` § Known debt stop restating counts and point at `verify.mjs --list`? | § 3 |
| 8 | The `test` gate is 4 failures above its stated ratchet. Fix the four, or establish what regressed? | § S-06 |

## Related

- [`STUDY-FORMAT.md`](./STUDY-FORMAT.md) — the rules this audits, and its provenance warning
- [`README.md`](./README.md) § Where new reasoning goes — the closed-folder rule
- [STUDY-004](./004-organizational-redundancy-audit.md) — the previous audit of the instruction layers; § 4 C-01…C-03 are still open
- [STUDY-005](./005-upload-pipeline-trace-findings.md) F-09, F-10, F-13 — the register/body disagreement
- [`docs/CONSTITUTION.md`](../CONSTITUTION.md) § 4 — a static reading is not a verification
