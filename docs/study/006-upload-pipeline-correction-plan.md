---
id: STUDY-006
type: proposal
status: accepted
supersedes: none
corrected-by: none
---

# Upload pipeline — decisions to take, and the plan to correct it

**Written:** 2026-09-12 · **Last updated:** 2026-09-16 · **Merged to `main`** 2026-09-16 (the work is
no longer branch-only). **Status `accepted`:** the owner signed off on D-01 … D-12 and Phases 0–4 are
built and measured; the normative halves live in specs, and this file keeps the reasoning and the
plan. **Start at § Phase 5** for what is still open.
**Findings this answers:** [STUDY-005](./005-upload-pipeline-trace-findings.md) F-01 … F-22.

## Status at a glance

| | Question | Status |
| --- | --- | --- |
| [D-01](#d-01----may-a-file-name-write-an-admin-field-at-all-f-01) | May a filename write an admin field at all? | Decided (Option A′) — built |
| [D-02](#d-02----what-is-the-confidence-floor-for-a-gazetteer-substitution-f-02) | Confidence floor for a gazetteer substitution | Decided as recommended — built |
| [D-03](#d-03) | How is `country` established, without assuming one? | Re-derived, decided — built (`place→country`) |
| [D-04](#d-04----what-is-the-import-mode-for-a-company-sized-archive-f-08-f-06-f-07) | Import mode for a company-sized archive | Decided (dedicated archive-import mode) — **pipeline built and measured 2026-09-16**; UI wiring is Phase 5 |
| [D-05](#d-05----should-locationrequirementmode-optional-skip-classification-entirely-f-05) | Does `optional` skip classification entirely? | Decided (spec wins) — **built 2026-09-16** |
| [D-06](#d-06----is-the-test-gate-allowed-to-pass-while-compiling-nothing-f-09-f-10) | Can the `test` gate pass while compiling nothing? | Decided — built (`verify.mjs` evidence hook) |
| [D-09](#d-09----may-exif-supply-a-house-number-open) | May EXIF supply a house number? | **Decided 2026-09-15** — yes, confirm-only. Reasoning in [STUDY-007](./007-exif-coordinates-as-address-evidence.md); contract in the [exif house number supplement](../specs/service/media-upload-service/upload-exif-house-number.supplement.md) |
| [D-10](#d-10) | Persist an area-only path, with no coordinates | Decided — **built and verified** ([F-19](./005-upload-pipeline-trace-findings.md#f-19)) |
| [D-11](#d-11) | Corroborate a `city` conflict with the street before asking | Decided — **built and verified** |
| [D-12](#d-12) | What should answering a **cross-field** admin conflict do? | Decided (**C + D**) — **built and verified** ([F-21](./005-upload-pipeline-trace-findings.md#f-21), [F-22](./005-upload-pipeline-trace-findings.md#f-22)) |

`status: proposed` means the study as a whole is not fully closed — every decision above is now
answered, but build status varies by row (table above) and Phase 4 has not started. Per [`STUDY-FORMAT.md`](./STUDY-FORMAT.md) a `[D]` marks a
decision, not a fact — including any recommendation nobody has answered yet.

The upload pipeline is **Sensitive** class ([`AGENTS.md`](../../AGENTS.md) § Change Classification):
every step below needs the full ceremony — ownership matrix, FSM tables where state changes,
`/security-review` where a boundary moves, red-test-first, live verification, and a fresh-context
adversarial review by a different agent than the implementer.

---

## 0 · Decisions taken, 2026-09-12

Recorded verbatim in effect, with what each one changed in this document.

| | Owner's answer | Effect |
| --- | --- | --- |
| **D-01** | Street names **do** occur in file names (`Mühlenstraße`) and must land on the Search Object. | Clarifies rather than rejects: "admin field" means only `country`, `state`, `city`, `postcode` (`AreaFieldKey`, `upload-area-evidence.types.ts:6`) `[A]` — street-level fields were never in scope. Recommendation tightened to **A′** below, and the requirement is now pinned by two harness scenarios (S16, S17). It also surfaced [F-11](./005-upload-pipeline-trace-findings.md#f-11), which is the real obstacle to that requirement. |
| **D-02** | Accepted as recommended. | Exact-match-first, bounded fuzzy fallback, **plus** the missing statutory cities in the data. Phase 1.3/1.4 unchanged. |
| **D-03** | Rejected: an organisation may work in Germany *and* Austria, so a home country is the wrong primitive. A country restriction may exist as an **extra option**, but not as the mechanism. | Recommendation replaced — see **D-03 (re-derived)** below. The replacement needs no org setting at all, and the mechanism it restores is already in the tree. |
| **D-05** | Accepted: the spec wins, and generally — **spec first, then code**. | Phase ordering unchanged; the "spec first" rule is now explicit in every phase that touches behaviour. |
| **D-04** | A dedicated **archive-import** mode, as recommended. | Phase 4 is no longer conditional. Its two performance prerequisites (F-06, F-07) stay in Phase 3, which now blocks Phase 4 rather than merely preceding it. |
| **D-06** | Implicit in choosing Phase 0 to start: implemented as recommended. | Done — `verify.mjs` gained the `evidence` hook, a `did not run` result is a hard failure, and the measured counts print every run. |

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

**Recommendation: A′ — a refinement of A, after the owner's clarification.** `[D]`

> A file name may write a **numeric** admin field — in practice a postcode — **only when the same
> file name also yields a street-level token at confidence ≥ 0.9**. Named admin tokens (`Graz`,
> `Wien`, `AT`) are not gated.
>
> **Narrowed 2026-09-13, during implementation.** The first wording gated *all* admin fields, and an
> existing test objected: `Graz.jpg` under `AT/Wien/` deliberately contributes `city = Graz`
> (`upload-search-object.builder.spec.ts` § records filename-derived admin tokens at level 0) `[A]`.
> Every measured instance of the defect is numeric, and a camera writes `IMG_1274.jpg`, never
> `Graz.jpg` `[C]` — so the narrow gate fixes F-01 without the collateral. The broader wording is
> still available if a filename city later proves harmful.

Scope, stated explicitly because the first draft of this section was read as wider than it is:
"admin field" is `country`, `state`, `city`, `postcode` and nothing else — `AreaFieldKey`,
`upload-area-evidence.types.ts:6`. `[A]` `street`, `houseNumber`, `staircase` and `door` are
street-level fields, live in the layer packages, and are **not touched by any option here**. `[A]`

What A′ decides, case by case: `[C]` (reasoning from the `[A]` evidence in F-01 and F-11)

| File name under a folder naming a country | Today | Under A′ |
| --- | --- | --- |
| `IMG_1274.jpg` | postcode 1274, overriding the folder | no admin field — `^img_\d+$` yields no street package |
| `1090 Mühlenstraße 12.jpg` | postcode 1090 (correct) | postcode 1090 — street package present |
| `Mühlenstraße 12.jpg` | street + house number, no admin field | unchanged |
| `Kopie von IMG_1274.jpg` | postcode 1274 | no admin field — no high-confidence street either |
| `Graz.jpg` | city Graz | city Graz — named tokens are not gated |

Gating on *confidence* rather than on a name pattern is what makes the `Kopie von IMG_1274.jpg` row
work: it needs no list of camera prefixes, so a new prefix cannot reopen the defect. `[C]` The
street-fragment half of the problem is untouched — the filename's low-confidence `IMG` is still
appended to `street`, which is [F-04](./005-upload-pipeline-trace-findings.md#f-04) and stays in
Phase 2.2. `[A]`

**What A′ gives up is smaller than first stated.** Measured on scenario S17: a file-name postcode
under a folder that names no country is **already dropped today**
([F-01 correction](./005-upload-pipeline-trace-findings.md#f-01)). `[A]` The only case A′ removes is a
camera-shaped name under a country-naming folder — which is the defect.

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

### D-03 (re-derived) — How is the country established, without assuming one? {#d-03}

**The owner's objection, and why it lands.** The first recommendation was "default the country from
the organisation". An organisation working in Germany *and* Austria has no single home country, so
that primitive is wrong — and a wrong default is worse than none, because it is invisible in the
result. `[D]`

**What the re-derivation found.** The mechanism this needs is already in the repository and the
Search Object path stopped using it. `[A]`

- `CITY_REGISTRY` (`city-registry.const.ts:10`) holds city records that each **carry their own
  country**: `{ name, country, zips, lat, lng, aliases }`, and it contains `Wien` with
  `country: 'AT'`. `[A]`
- `findCityBySegment(segment)` (`location-path-parser.util.ts:50-59`) returns
  `{ city, country }` on an **exact** normalized name-or-alias match — no country needed up front,
  no fuzziness, and it derives the country from the match. `[A]`
- Its only callers are in `location-path-parser.service.ts` `[A]`, which the Search Object spec marks
  **non-normative** ("Legacy narrative parser — **non-normative**; use SO specs above",
  `upload-search-object.md` § Normative index). `[A]` The normative path instead gates the AT-only
  fuzzy gazetteer behind `useAtGeo = countryCode === 'AT'` (`path-token-classifier.ts:210`). `[A]`

So `Graz/Annenstraße 10` fails not because the information is missing, but because the new path
consults a country-scoped dataset that needs the answer as its input. `[C]`

**Recommendation: E — country-carrying exact lookup first, country derived from the match.** `[D]`

1. **Exact match against every country-carrying registry**, before any fuzzy step. A hit sets `city`
   **and derives `country`**. `Graz` → `{ Graz, AT }` with no `AT` segment in the path; `Wien` →
   `{ Wien, AT }`, which also closes [F-02](./005-upload-pipeline-trace-findings.md#f-02) as a side
   effect since the substitution never gets a chance to run.
2. **A name in two countries is not guessed.** Write `city`, leave `country` null, record the
   candidate countries. The existing tray machinery asks, or the geocoder settles it. This is the
   part that makes a DE+AT organisation correct rather than lucky.
3. **Fuzzy only as a bounded fallback** (D-02's rule), and only within the countries still in play.
4. **The org-level country list is the "extra option", and it may only narrow.** It filters the
   candidate set; it never supplies a default and never fills `country` on its own. An org that
   leaves it empty gets the full set.
5. **Provenance on the Search Object**: `country` records whether it was `parsed` from a path token,
   `derived` from a city match, or `narrowed` by the org filter. Without it, step 2 is
   indistinguishable from a guess three months later.

**What this gives up, stated plainly.** `[A]`/`[C]`

- Only Austria has a municipality dataset today (`at-gemeinden-bev.json`, 2 114 records) `[A]`, and
  `CITY_REGISTRY` holds **seven** cities `[A]`. A German folder (`Hamburg/Mühlenstraße 12`) matches
  nothing until DE data is added — honest failure rather than a wrong country, but still a failure.
  `[C]` Postcode patterns already cover DE, CH, IT, FR, GB and US (`postcode-patterns.ts:7-15`) `[A]`,
  so the data is the gap, not the structure.
- **A postcode may never set the country by itself:** AT and CH share `^\d{4}$`
  (`postcode-patterns.ts:8,10`). `[A]` A 4-digit token is ambiguous between two countries, so step 1
  must run on names, with postcodes only confirming a country that is already in play.

**Rejected alternatives**, kept so they are not re-proposed: `[D]`

| | Why not |
| --- | --- |
| Org home country (the original recommendation) | The owner's case — one org, two countries — has no single answer, and the default would be silent. |
| Always consult the AT gazetteer | Assumes Austria for everyone; strictly worse than E in exactly the case E is careful about. |
| Keep requiring `AT` in the path | Undiscoverable; it appears in no UI copy today. `[A]` |

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

### D-09 — May EXIF supply a house number? (open)

The owner asked whether a street without a house number can take one from the photo's GPS. That
**conflicts with a signed-off principle**: [never fabricate precision](./../specs/service/media-upload-service/address-resolution-model.md#address-precision-principle)
forbids reverse-geocoding a pin into a house the user did not supply.

**Recommendation: allow it only as confirmation, never as invention.** `[D]` Reverse-geocode the EXIF
point; adopt its house number **only if** the street it returns is the street we already established
**and** the point lies within `exifAssistRadiusMeters` (80 m) of the geocoded street position. Then it
is the same address enriched, marked `origin: 'derived'`, `rule: 'exif→houseNumber'`, and the tray can
show where the number came from. A different street, a missing street, or a point further away
changes nothing.

Without that guard the pipeline would put a house number on a photo taken across the road, which is
precisely the failure the principle exists to prevent.

**Owner decision, 2026-09-15:** yes — when EXIF is the only source, adopt the number **and ask**,
keeping tray volume low but decisive. Asking is what reconciles this with the precision principle:
the principle forbids presenting a fabricated number as fact, and a confirmation tray presents it as
a proposal with its provenance shown.

The owner also asked whether nearby EXIF points could be clustered into one address. That question
turned out to constrain this one, so both are worked through in
**[STUDY-007](./007-exif-coordinates-as-address-evidence.md)**. Its two load-bearing conclusions:
ask **once per proposed address, not once per file** (per-file is the highest-volume, least
answerable question in the system), and **do not cluster on distance** — a GPS tag records the
camera, not the subject, so walking around one building spreads points *further* apart than
photographing a row of separate houses. D-09 also gets its own radius rather than reusing
`exifAssistRadiusMeters: 80`, which is "same block" and contains a whole terrace.

---

### D-10 (decided, done) — Persist an area-only path, with no coordinates {#d-10}

The owner's own case — "ein Ordner heißt Wien, die Fotos gehören zu Wien" — a folder naming only a
place, ended in Issues ([F-19](./005-upload-pipeline-trace-findings.md#f-19)), even though the SO
already had everything the path gave it (`place→country`, `city→state`). **Decided 2026-09-12**: an
area-only result gets **no coordinates, ever** — it is resolved via its text and precision tier, not
a geocoder guess at a building somewhere in a city.

**Done 2026-09-13.** Three gates were coords-only and had to open for a text-only, no-coordinates
placement, each found by tracing one curated scenario through to its actual outcome rather than
assuming the first fix was enough:

1. `handlePartialPreResolve` treated every `'partial'` group status the same (routed to Issues).
   Split on `geocodeBranch === 'metadata_only'`: that branch places the job (`textOnlyLocation: true`,
   `titleAddress` = the area label, no `coords`) and returns `continue` instead of `partial`.
2. `routePreparedNewJob`'s only route to the upload phase was `if (job.coords)`. Widened to
   `job.coords || job.textOnlyLocation`.
3. `finalizeNewUploadPhase` (post-save enrichment) forward-geocoded any text placement lacking
   `coords`/`titleAddressCoords` — which every area-only job lacks by design, so it tried to geocode
   "Wien" and, finding nothing usable, routed to `missing_gps` anyway. Given its own early exit for
   `locationRequirementMode: 'optional'`.

Two supporting fixes surfaced only by running the curated scenarios, not by reasoning about the code:

- `isSearchObjectMeaningless` anchored only on `city`/`postcode`/high-confidence `street` — a
  state-only path (`AT/Niederösterreich/…`) never even reached `classifyBatch`'s grouping. Added
  `state` as an anchor. **Not** `country` alone: a real run turned up `country: 'DE'` parsed from
  `"CV Matthias Kleveta ERP DE.pdf"` — the exact false positive this function exists to catch — so a
  bare country code stays insufficient on its own.
- `formatSearchObjectLabel` fell back to the raw filename when nothing at city level or below was
  set — the state/country label was never built. Added a state+country fallback.

`resolveUploadAddress`/`resolve_media_location` already accepted `p_latitude`/`p_longitude` as
optional — that half of the real infrastructure (added 2026-09-10 for pin-drop persist) needed no
schema change, only threading `lat`/`lng` through as optional on the client.

**Verified**: `npm run trace:upload` — all three scenarios (S19 city-only, S20 city+postcode, S21
state-only) now reach `phase=complete`, `lane=Uploaded`, `coords=—`, each with its own `mediaId` and a
`resolve_media_location` call carrying `p_latitude: null, p_longitude: null` and the area label.

**Not done**: `locations.state` has no column and `resolve_media_location` has no `p_state` parameter
— a `state`-precision area-only row persists its label as text (e.g. `"Niederösterreich, AT"`) with
`address_precision: 'state'`, but the state name is not queryable as a structured column. That is a
schema migration of its own (mirroring `20260910140000_upload_address_precision.sql`'s
five-function-plus-overload-drop pattern) and is out of scope here. Finding a coordinate-less
location by its area text already works today: `search_locations` (used by the org address picker in
media detail) filters on nothing but organization — `db-address.provider.ts` (the map top-bar search)
still requires coordinates, which is correct for that search's purpose (navigating a map to a point),
not a gap this decision needs to close.

---

### D-11 (decided, built) — Corroborate a `city` admin-level conflict with the street before asking {#d-11}

The owner's question: `AT/Wien/Innsbruck/Maria-Theresien-Straße 18/` opens a **C3** tray
(`admin_level_conflict` — two folder levels both look like a city) and asks every time, even when the
street named in the path only exists in one of the two candidates. Could the pipeline check that
first and skip the question when it's clean?

**Decided: yes, and built** — one geocoder query the pipeline already knew how to make (`street_only`'s
own bare `{street, countryCode}` call, reused a step earlier via
`UploadLocationTrayFlowService.registerAreaConflictGroupsAfterClassify`), read the same way class A1
already reads it (the hit's own `address.city`, never just "did we get a result"), gated so it can
only ever *add* information: write silently on a clean single match (`resolved` directly with the
hit's own pin when the Search Object has a house number, `needsGeocode` when it doesn't — see the
[supplement](../specs/service/media-upload-service/contradiction-resolution-model.c3-street-corroboration.supplement.md)),
**suggest** a match outside the candidate set without removing the folder's own guesses
(`suggestedAreaCandidate`), and fall through to today's plain question on any tie, miss, or failed
call. Never invents an answer from weak evidence. Verified: unit tests on the pure decision logic
(`upload-location-street-corroboration.helpers.spec.ts`), an integration suite exercising all six
outcomes against the real `classifyBatch` pipeline (`upload-location-tray-flow.service.spec.ts`), and
a clean run through the trace harness (both tiers correctly return zero hits and fall through to the
plain tray for the synthetic stub gazetteer's hyphenated street name — see the trace playbook's
"real vs mock" caveat on fuzzy matching).

Two things worth flagging without re-deriving the whole mechanism here:
- The **provenance** half of the ask (a visible "why" line) reuses infrastructure that already exists
  and nothing renders today — every derived field already carries `origin`/`rule`/`derivedFrom`, with
  zero UI consumers (verified by grep). This decision's rule (`street→city (corroboration)`) is simply
  the first thing that needs it — still no UI consumer after this build, by design (out of scope here).
- **Not decided**: whether this also applies to the symmetric `state` conflict (two folder levels
  naming different Bundesländer) — plausible, not measured. Scoped to `city` for this build. When
  settling the city surfaces a *different*, residual conflict (typically a stale cross-field `state`
  derivation from the rejected candidate city — the same thing a manual tray answer already cascades
  into), the pre-check cascades to a plain tray for that new conflict rather than attempting a second
  round of corroboration.

Full mechanism, the two-tier query (house number embedded first, bare street as fallback for new
construction), the tray-copy rules, and the worked examples all live in
[contradiction-resolution-model.c3-street-corroboration.supplement.md](../specs/service/media-upload-service/contradiction-resolution-model.c3-street-corroboration.supplement.md)
— that file is the one to keep current; this entry should not repeat it.

---

### D-12 (decided, built) — What should answering a *cross-field* admin conflict do? {#d-12}

[F-21](./005-upload-pipeline-trace-findings.md#f-21): when an `admin_level_conflict` spans two
fields — `city: Mödling` against `state: Wien`, the owner's own S18 case — answering it is
impossible. `applyAdminLevelSelectionsToSearchObject` writes only the chosen field, the other side of
the contradiction survives untouched, `detectAreaConflicts` re-raises the identical conflict, and the
tray re-opens. Measured: **55 answers to one question in a single run**, still unresolved. Both
offered options loop; only "Manual: city" typed as a Wien city escapes, which means the tray lists the
folder's own value while being structurally unable to accept it.

| Option | What it means | Cost |
| --- | --- | --- |
| **C — Re-derive the dependent field from the answer** (recommended) `[D]` | Choosing `city = Mödling` re-runs the existing `city→state` derivation and replaces the stale `state` evidence with `Niederösterreich`. The answer becomes authoritative for everything it implies. | Silently overwrites a value the path really did assert (`1160 Wien` in the filename). Cheapest change: the rule already exists (`deriveStateFromCity`, used by `corroborateAreaEvidence`), it is simply not re-run after a tray answer. |
| B — Ask for the whole area package at once | One question: *"Mödling, Niederösterreich"* or *"Wien 1160"* — the two coherent readings of the path, not one field at a time. | The most honest question and the most work: the tray's candidate model is per-field (`admin-level\|{field}\|…`), so this needs a new candidate shape and new copy. Converges by construction. |
| A — Clear the other field's contradicting evidence | Choosing `city` drops any evidence that contradicts it, leaving the field empty rather than re-derived. | Loses information without replacing it — an emptied `state` then has to be re-derived or asked for anyway, so this is B or C with an extra step. |
| D — Loop guard only | Detect the re-registration of an identical conflict signature and route to Issues instead. | Stops the infinite loop without making the question answerable; the file still cannot be placed. A safety net under whichever of A–C is chosen, not a substitute. |

**Recommendation: C, with D as a guard.** `[D]` C matches how every other derived field already
works (`postcode→city`, `place→country`, `city→state`) and re-uses the rule that is already in the
tree — the gap is only that the derivation pass never runs again after a tray answer. D belongs in
regardless: no answer path should be able to re-register a conflict signature it has already been
asked, and today nothing checks.

**Owner's answer, 2026-09-15: C with the D guard, and fix F-22 in the same pass.** `[A]`

So a tray answer now outranks a path token the user did not touch. Built as specified in
[cross-field answers supplement](../specs/service/media-upload-service/contradiction-resolution-model.cross-field-answers.supplement.md):
the answer drops exactly the evidence the detector would have contradicted it with, the existing
`city→state` derivation refills the dependent field (`Mödling` → `Niederösterreich`, `origin:
'derived'`), a signature already asked in this batch can never be asked again (it goes to Issues
instead), and both the layer and admin answer paths return their jobs to the queue.

## 2 · The plan

Ordered so that each phase is independently shippable and each one is verified by something that
was **red first**. Sizes are effort, not calendar.

### Phase 0 — Make the evidence repeatable (no product change)

| Step | Change | Verified by |
| --- | --- | --- |
| 0.1 | Fix the seven type errors that stop the `ng test` bundle compiling (F-09). | `node scripts/verify.mjs test` compiles and reports a real pass/fail count. |
| 0.2 | Split the `test` gate into "did not run" (hard) and "ran with N failures" (soft), per D-06. | Deleting a random type annotation turns the gate red instead of `known debt`. |
| 0.3 | Re-measure and correct the `lint` and `test` debt notes (F-10). | The note matches a fresh measurement on `main`. |
| 0.4a | **Make the count reproducible.** Clear `apps/web/node_modules/.vite` before the test check: warm, the count is 34 or 39 depending on run history; cold it is 39 every time, which is also what CI sees. | Five consecutive cold runs give the same count. **Done 2026-09-13.** |
| 0.4b | **Fix the pollution itself** ([F-12](./005-upload-pipeline-trace-findings.md#f-12)). **Re-scoped 2026-09-16:** the premise ("14 files pass in isolation, fail in a full run") is wrong — **8 of 9 failing files fail on their own**, several with zero commits on this branch, and `nav.component.spec.ts` asserts 4 nav items against a component that has shipped 5 since before this work. They are stale or broken tests, not pollution. Fixed so far: `supabase-runtime-config` (`vi.mock` on a relative import — unloadable under `ng test`), `settings-overlay` (incomplete `I18nService` / `AuthService` stubs), `auth.service` (`Object.assign` on a getter-only `crypto.subtle`). Remaining: repair the stale assertions per file; and **`upload.service.spec.ts` is the one real order-dependent case**. | The failing count reaches 0, and each file is fixed for the reason it actually fails. |
| 0.5 | **Decide what to do about [F-13](./005-upload-pipeline-trace-findings.md#f-13)** — `ng test` does not load `vitest.config.ts`, so its `heic2any` alias is inert in CI. **Done 2026-09-16:** `runnerConfig: true` in `angular.json`, so the builder loads `vitest.config.ts` and both ways of running a spec apply one configuration. Measured over the full suite: same 1 482 tests collected, failing set unchanged but for `upload.service.spec.ts`, which is order-dependent either way. | Both runners apply the same configuration; the suite collects the same tests. |

**Class:** Standard. **Why first:** every phase below claims a test proves something, and today no
test in the repository runs in CI.

**Status, 2026-09-12:** 0.1 and 0.2 are done on branch
`claude/uploader-pipeline-test-badges-kktrpg` — the suite compiles and runs (1 364 tests, 210 files),
and a `did not run` result is now a hard gate failure with the measured counts printed every run.
0.3 is done for `test` and `lint`. 0.4a is done — the count is now reproducible at 39/14, and the
mechanism turned out to be a build cache changing file order, not chance. **0.4b (the pollution
itself) and 0.5 (F-13) are open**, and both were found by 0.1: they only became visible once the
suite actually ran.

### Phase 1 — Stop writing wrong data (F-01, F-02)

| Step | Change | Verified by |
| --- | --- | --- |
| 1.1 | Amend `upload-search-object.md` per **D-01**: admin fields come from folder levels only. Update the § Admin level map collapse rule and the pass-2 table in the same change. | Spec lint green; the changed rule is quoted in the PR. |
| 1.2 | Implement 1.1 in `path-token-classifier.ts` / `upload-area-evidence.helpers.ts`. | A red-first test: `AT/Wien/1090/Währinger Straße 12/IMG_1274.jpg` keeps postcode 1090, and `IMG_1274`/`IMG_1275` in one folder share a `groupingKey`. |
| 1.3 | Amend the spec per **D-02**: exact-match-first, then bounded fuzzy. | Spec lint green. |
| 1.4 | Implement the normalized exact map in `classifyWithFuse`, and add the 23 statutory cities to `at-gemeinden-bev.json` via `scripts/build-at-gemeinden-bev.mjs` (never by hand). | Red-first: `Wien` classifies as `Wien`; `Schottwien` still classifies as `Schottwien`; a deliberate typo still matches. |
| 1.6 | **[F-11](./005-upload-pipeline-trace-findings.md#f-11)** — a folder segment that yields only low-confidence street fragments must not form a competing street package. This is what makes the owner's `Mühlenstraße` requirement actually hold. | Red-first: S16 `Baustelle Nord/Mühlenstraße 12.jpg` yields `groupingKey` `\|\|\|\|muhlenstraße\|12` through the **folder** path and opens no tray. |
| 1.7 | **[F-14](./005-upload-pipeline-trace-findings.md#f-14)** — an async source-conflict registration writes `awaiting_disambiguation` while the job is in `hashing`; hashing's completion then overwrites it and the job strands in `dedup_check`. Pre-existing (13 stranded in the 5 000-file run before any fix), now reachable in the 17-file corpus. Make the gate authoritative rather than a phase label a later step can erase, and only then reconcile the FSM map. Sensitive: needs the FSM/transition table and its own red test. | A full curated run leaves **0** jobs in an active phase, and no illegal-transition report. |
| 1.5 | Re-run the harness and record the new baseline in the playbook. | `GROUP-SPLIT-WITHIN-FOLDER` and `SO-CITY-NOT-IN-PATH` report zero findings on the curated corpus. |

**Status, 2026-09-13:** 1.1-1.4 and **1.7** are done. 1.7 took three code changes rather than one —
the hold predicate and one park exit, pre-resolve testing the hold at entry and after dedup, and the
dedup step no longer relabelling a held job — and then a fourth defect had to be fixed before the
stranding actually went away: [F-16](./005-upload-pipeline-trace-findings.md#f-16), a group-level loop
returning one job's hold as every job's verdict. Run A of the curated corpus now settles with **0** jobs
in an active phase and no illegal-transition report, which is this phase's acceptance criterion. It also
surfaced [F-17](./005-upload-pipeline-trace-findings.md#f-17) (a parked job keeps its content-hash
reservation), which is **open** and needs its own decision. 1.5 and 1.6 remain open.

**Class:** Sensitive. **Ordering notes:** 1.4's exact map is also ~30 % of F-06's cost, so Phase 1
pays part of Phase 3 forward. `[B]` And D-03's step 1 (exact, country-carrying lookup first) makes the
`Wien` → `Schottwien` substitution unreachable, so 1.3/1.4 and 2.1 overlap — decide during
implementation whether they are one change; if they are, the spec amendment covers both. `[C]`

### Phase 2 — Stop asking avoidable questions (F-03, F-04, F-05)

| Step | Change | Verified by |
| --- | --- | --- |
| 2.1 | Per **D-03 (re-derived)**: put the country-carrying exact lookup in front of the AT-only fuzzy gate, derive `country` from the city match, leave it null on cross-country ambiguity, add `country` provenance (`parsed` / `derived` / `narrowed`). Spec first. The org country list is a **later, optional** narrowing filter — not part of this step. | Red-first: `Graz/Annenstraße 10/DSC_0001.jpg` yields city `Graz`, country `AT` marked `derived`, and a non-empty `groupingKey`; a name present in two registries leaves `country` null instead of picking one. |
| 2.2 | Widen the weak-filename guard (F-04) so a single-token file name with no house number never forms a street package. | Red-first: `foto.jpg` and `Abnahmeprotokoll.pdf` under an addressed folder open no `layer_package` tray. |
| 2.3 | Resolve **D-05** — make code and `upload-address-resolution.phases.md` agree, in one change. **Done 2026-09-16:** the matrix already said "Skip pipeline", so the code moved to meet it — `enqueueAndClassifyInChunks` skips classification when every job in the batch is `optional`. Harness run C: **0 parked** (was 13 of 15), and the run now asserts it. | Red-first: harness run C parks **0** files in `awaiting_disambiguation`. ✅ |

**Class:** Sensitive. 2.1 does **not** touch org-scoped settings after all — the org country list
stayed out of it, which is why it needed no security review.

**Status, 2026-09-13:** 2.1 is **done**. Contract first, as decided:
[`upload-search-object.country-derivation.md`](../specs/service/media-upload-service/upload-search-object.country-derivation.md),
then `path-token-classifier.ts` (`exactPlaceHits` / `classifyPlaceToken`),
`findCitiesBySegment` in `location-path-parser.util.ts`, and `countryProvenance` on the Search
Object. Two deviations from the recommendation above, both deliberate:

- **Ambiguity keeps the places.** Step 2 said "write `city`, leave `country` null, record the
  candidate countries". There is no field for candidate countries, and there is already machinery
  for two values of one admin field: every exact hit is written, so a contested name lands as two
  `areaEvidence` entries and `areaConflicts` opens the tray. Identical values collapse to
  one city with no country — which is also correct, and asks nothing it cannot answer.
- **`narrowed` is not a provenance value yet.** Only `parsed` and `derived` exist. The narrowing
  filter adds its own when it lands; an unused enum member would have been a claim the code does
  not keep.

Measured effect is in [F-03](./005-upload-pipeline-trace-findings.md#f-03) and
[F-15](./005-upload-pipeline-trace-findings.md#f-15). **1.7 is now the blocking step**: a curated run
still strands one job in `dedup_check` and the suite exits non-zero on the illegal
`hashing → awaiting_disambiguation` transition. That was already true after 1.3/1.4 — 2.1 neither
caused nor fixed it — but with classification correct it is the last thing between a curated run and
a clean one.

### Phase 3 — Make the size work (F-06, F-07)

| Step | Change | Verified by |
| --- | --- | --- |
| 3.1 | Key `UploadJobStateService` by job id (`Map`) so `updateJob` and `findJob` are `O(1)`; keep the signal for rendering. | Harness scale tier: `updateJob` flat across 100 → 20 000 jobs instead of 0.002 → 0.573 ms. |
| 3.2 | Cache the Fuse index per geo dataset (one index, not one per token). | Scale tier: measurable drop in ms/file; index construction no longer in the profile. |
| 3.3 | Chunk `classifyBatch` so it yields to the event loop, and start the queue after the first chunk instead of the whole tree. | A 5 000-file folder begins uploading in under a second; harness reports first-upload latency. |

**Class:** Sensitive (3.1 is the state store for a stateful service — FSM and idempotency invariants
must be restated). **Note:** 3.1 and 3.2 are independently valuable and independently testable; do
not bundle them.

**Status, 2026-09-15:** 3.1 is **done**. Spec first, as the Sensitive class requires:
[`upload-manager.job-store.supplement.md`](../specs/service/media-upload-service/upload-manager.job-store.supplement.md)
restates the store's guarantees (G1 identity, G2 insertion order, G3 immutable snapshots, G4 a write
for an unknown id is a no-op that notifies nobody, G5 one notification per real change, G6 terminal
removal) before the rewrite, so the invariants are the acceptance criteria rather than a description
of whatever the new code happens to do.

The store is now an id-keyed `Map` with a `revision` signal; `jobs` is a `computed` projection over
it. `updateJob`/`findJob` are `O(1)`; the `O(n)` array build happens once per notified read instead
of once per write. `revision` only advances on a real change, which is what makes G4 and G5
testable — and G4 was proven red by stashing only the service (`× G4: a write for an unknown id
changes nothing and notifies nobody`).

The acceptance criterion is met with room to spare — `updateJob` is flat at ~0.001 ms from 100 to
20 000 jobs (was 0.0029 → 0.9448 ms), and a full 20 000-job batch costs 315 ms instead of 4.7
minutes. Full table in [F-07](./005-upload-pipeline-trace-findings.md#f-07). Lanes are identical
before and after on both corpora, so this is a cost change only.

Upload suite: **402 tests over 59 files** (`npx vitest run src/app/core/upload`), up from 391.

**Note on that command, 2026-09-15.** The figure is reproducible, but only with the exact argument:
`src/app/core/upload` is a **substring** filter, so it also matches
`upload-resolver-tray-orchestrator*.spec.ts` alongside the `upload/` directory. Adding a trailing
slash (`src/app/core/upload/`) narrows it to the directory and yields **387 over 56** instead. Both
numbers are right; they count different sets. Recorded because a first attempt to re-derive 402 used
the trailing-slash form, concluded the figure was unreproducible, and "corrected" a number that was
in fact correct — the missing thing was never the measurement, only the command beside it.

**3.2 is also done, 2026-09-15**, as a separate change — the note above says not to bundle them, and
keeping them apart is what makes the 29 % attributable to one cause. Spec first again
([gazetteer lookup supplement](../specs/service/media-upload-service/upload-search-object.gazetteer-lookup.supplement.md)),
which states the two-stage lookup (exact wins, fuzzy only on a miss) and the five guarantees a cache
must not break, then the red test, then the cache.

`classifyWithFuse` built `new Fuse(items, …)` — the whole 2 114-entry municipality index — on **every
token that missed the exact stage**. It is now memoized in a `WeakMap` keyed by the dataset array,
exactly as the exact index already was. Measured on 2 000 generated paths, both naming modes:
**6.97 / 6.86 → 4.89 / 4.91 ms per file (−29 %)**, with groups (1 483) and trays (634) unchanged.
That is close to the ~30 % the earlier build-vs-search split predicted, which is the useful part: the
prediction was testable and it held.

**Status, 2026-09-15: 3.3 is done.** Spec first
([chunked classification supplement](../specs/service/media-upload-service/upload-manager-pipeline.chunked-classification.supplement.md)),
then the red tests, then the code. The three submit paths shared an identical four-line tail, so the
change is one shared `enqueueAndClassifyInChunks` rather than three edits: add a chunk's jobs,
classify only those jobs, drain, yield, repeat.

Two things made it correct rather than merely chunked, both from
[STUDY-008](./008-classification-chunking-strategy.md):

- **Tray *presentation* is held until the whole batch is classified**, via the pre-resolve wave —
  armed once with the full batch count before the first chunk. That closes the race STUDY-008 § 2
  identified (a group can only gain members while its tray is unanswered), which is what makes chunk
  size a tuning constant rather than a correctness parameter.
- **The group cache merges across chunks** instead of being replaced: a grouping key seen twice
  unions its job ids. This is the cache-level form of the owner's "the 301st file belongs to the
  first 300".

**What the FSM caught.** The first attempt deferred tray *registration* to the end of the batch, not
just presentation. The transition assertion in `vitest.setup.ts` failed immediately: by the time
registration ran, jobs had already drained past the phase from which they can be marked
`awaiting_disambiguation`. Registration must stay per chunk, before that chunk drains; only
presentation waits. The distinction is now stated in the supplement because it is not obvious and
the cost of getting it wrong is silent misrouting.

**Verified.** Six guarantee tests, three of them red without the change (chunking happens, uploading
starts before classification ends, a thrown chunk does not stop the rest). The harness shows the
outcome is unchanged, which is the point: identical lanes (`Issues=1 Uploaded=19 Waiting for user=1`
curated, `Skipped=1 Uploaded=20` generated), identical group count (402), and identical tray answers
by kind (2 `admin_level_conflict`, 2 `containment_check`, 1 `layer_package`).

**Not measured: wall-clock time to first upload.** The ordering is proven by test, but the harness's
`--scale` tier measures classification and the job store only, not a full pipeline drain, so no
figure is claimed for how much sooner the first byte moves in a browser. That measurement needs a
browser and a real tree; it is the honest gap in this phase.

**3.3 was the one that mattered most for an import.** 3.1 and 3.2 both reduced
*cost*; neither touched *when* the cost is paid. `submitUploadManagerWebkitFolder` still awaits the
whole `runClassifyBatchGuarded` before `drainQueue()`, so classification remains
time-to-first-byte — at 4.9 ms/file that is still ~8 minutes of frozen main thread before a
100 000-file import uploads anything. Phase 4 stays blocked on it.

### Phase 4 — The archive import mode (D-04, accepted)

Only after Phase 3 — its performance work is a prerequisite, not a nicety. Spec first: a new flow,
not a flag:
chunked import, uploads first, no trays during import, everything unresolved to Issues, and
folder-level bulk resolution in the Issues lane afterwards. Needs its own ownership matrix and FSM
table, and a decision about what "done" means for an import that leaves 40 000 items in Issues.

**Status, 2026-09-16: the core is built.** Spec first, as the class requires —
[archive import mode](../specs/service/media-upload-service/upload-archive-import-mode.md) with the
ownership matrix, and its
[FSM supplement](../specs/service/media-upload-service/upload-archive-import-mode.fsm.supplement.md)
for the transitions.

**The decision the plan asked for.** An archive import is **done when every file is uploaded or has
terminally failed** — never conditional on resolution. `[D]` An import of 100 000 files leaves tens
of thousands of items unresolved by design; a "done" that waits on them never fires and teaches the
operator to ignore it. So the UI carries **two independent figures** — files imported (finite) and
items awaiting resolution (a backlog) — and never blends them, because during an import the question
the operator actually has is whether the bytes are safe.

**The narrowing, and the trap in it.** The mode is one phase removed from the existing machine:
`awaiting_disambiguation` is unreachable, and anything that would have parked there goes to
`missing_data` with `issueKind: 'address_deferred'` — both of which already exist, so no new phase
and no new terminal.

Phase 3.3 holds tray *presentation* while still *registering* groups per chunk. Archive mode must do
the **opposite**: suppress registration itself. Holding only presentation would still mark jobs
`awaiting_disambiguation` — the very phase this mode forbids — leaving them waiting on a user with
nothing to answer, which is exactly [TRAP-021](../TRAPS.md)'s shape. The gate therefore sits at
`registerDisambiguationGroup`, not at the wave.

**Measured**, harness run D, curated corpus (21 files): **0 parked**, 16 resolved silently and
uploaded, 4 deferred to Issues. `[B]` The interactive run of the same corpus uploads 19 — but asks
**7 questions** to get there. That is the trade stated plainly: three fewer files placed
automatically, in exchange for asking nothing.

**Not yet built:** the panel's mode choice and the two progress figures, and the bulk-resolution
engine the deferred items need ([files-page bulk
resolution](../specs/page/files-page.bulk-resolution.supplement.md)). The pipeline half is done and
proven; the UI half is not.

### Phase 5 — What is left, 2026-09-16

Phases 0–4 are built and measured. This section is the handoff: everything still open, what it is
blocked on, and where its contract already lives. Nothing here is a new decision except where it says
so.

**Wiring — the gap between "proven" and "usable".** The archive import and bulk resolution both work
and are tested, but an operator cannot reach either:

| # | Work | Contract | Note |
| --- | --- | --- | --- |
| 5.1 | Upload panel: the archive/interactive mode choice | [archive import mode](../specs/service/media-upload-service/upload-archive-import-mode.md) § Actions | Mode is fixed at submit (A1). **UI wired 2026-09-16** — Import archive intake button |
| 5.2 | Two progress figures, never blended | same § What "done" means | Files imported (finite) + items awaiting resolution (backlog). **Wired 2026-09-16**; `missing_data` counts toward import progress |
| 5.3 | Bulk-resolution adapters: `geocode` / `applyToItem` | [bulk resolution](../specs/page/files-page.bulk-resolution.supplement.md) | **Built 2026-09-18** — `bulk-resolution.adapter.ts`. Wiring it found a real defect in the engine: see below |
| 5.4 | Selection UI + confirmation summary | same, R1/R7 | **Service built 2026-09-20** — `BulkResolutionService.plan()` / `.run()`, plan/run split so nothing is written before confirmation. The dialog that renders the plan is the remaining piece |
| 5.5 | `/files` tree + its two aggregate RPCs | [files-page](../specs/page/files-page.md) | **Client facade built and tested 2026-09-20. The migration is written but NOT live-verified** — see the blocker below. The tree component is still to build |
| 5.6 | *Add as location* row actions in media detail | [deferred location resolution](../specs/system/deferred-location-resolution.md) § Actions | The row slots already exist and are empty |

**What 5.4 found.** `location_unresolved` is derived in **two places that disagree** —
`media-query.service.ts` counts `'partial'` as unresolved, `media-detail-data.facade.ts` does not.
Bulk eligibility therefore reads `location_status` directly rather than inheriting a disagreement
that has nothing to do with it. Worth a separate look: two mappers producing different answers for
the same row is a bug waiting for whoever next trusts that field.

Also decided there: `unresolvable` **is** eligible for bulk resolution. The pipeline gave up on those
items, and a human answer applied folder-wide is exactly what that case needs — excluding them would
leave the hardest items permanently out of reach of the tool built for them. An unknown or absent
status is eligible too, because a silent skip is invisible while an unwanted offer is not.

**What wiring 5.3 found.** The engine's geocode result was typed `{ addressLabel, lat, lng }`.
`updateFromAddressSuggestion` derives address precision from `city` / `street` / `streetNumber` /
`zip` / `country` (`geocodeResultToPrecisionFields`), so that narrower shape would have written
**every bulk-resolved item with coordinates and no address** — silently, since nothing throws. The
runner is now generic over the suggestion type and passes through whatever `geocode` returned.

A second, smaller one came from the typechecker rather than a test: `ReverseGeocodeResult` carries no
`lat`/`lng`, because it answers *what is at this point* rather than locating one. The adapter carries
the photo's own coordinates forward instead of taking the geocoder's idea of where the address is —
otherwise an EXIF-sourced run would move items to the geocoded address rather than where the camera
stood, which is the distinction [STUDY-007](./007-exif-coordinates-as-address-evidence.md) is
entirely about. Both are now pinned by tests.

Worth recording as a pattern: **an injected-effect engine is only as honest as its first real
adapter.** Both defects were invisible while every effect was a `vi.fn()` returning a convenient
shape.

**5.5 has a blocker this environment cannot clear.** The two RPCs are `SECURITY DEFINER` functions
that read `media_items` and scope by `organization_id` — which AGENTS.md classes **Sensitive**, with
live verification and `/security-review` mandatory. This environment has `psql` but no database
URL, no Supabase CLI and no credentials, so the migration
(`20260920120000_media_folder_tree_rpcs.sql`) has **never been applied or executed**. It follows the
two established idioms exactly, and the file says so in a banner at the top, but *"follows the
idiom"* is not *"verified"*, and the gap is in the one area where a mistake leaks another
organization's rows.

**Before that migration merges it needs:** apply, the matching `validate-*-rls.sql`, a
cross-organization read that must return nothing, and `/security-review`.

Two details in it worth not losing, both learned from existing migrations rather than invented:

- Matching uses `starts_with()`, **not** `LIKE`. A folder name may legitimately contain `%` or `_`,
  and `LIKE` would read those as wildcards — silently folding unrelated folders into one node.
- The grants revoke from **`anon` as well as `PUBLIC`**. Supabase grants EXECUTE on every new
  function to `anon` as its own role grant, and revoking from `PUBLIC` alone does not strip it —
  the gap that made every "authenticated only" RPC anon-callable until
  `20260911120000_revoke_anon_execute_on_authenticated_rpcs.sql`.

The tree's unresolved badge uses the **same predicate** as bulk eligibility (`NOT IN ('resolved',
'gps')`). If those two ever drift apart the badge becomes a number the user cannot act on.

**Decided but unbuilt:**

| # | Work | Contract |
| --- | --- | --- |
| 5.7 | EXIF may supply a house number, confirm-only, once per address | [exif house number supplement](../specs/service/media-upload-service/upload-exif-house-number.supplement.md) |

**Open findings needing an owner decision before any code:**

| Finding | The question |
| --- | --- |
| [F-17](./005-upload-pipeline-trace-findings.md#f-17) | A parked job keeps its content-hash reservation, so a later, better upload of the same file is skipped as a duplicate of something never uploaded. Owner sketched "check whether the new file has more data and revive the parked job, with a confirmation" — the build-both-and-measure experiment has not been run. |
| [F-18](./005-upload-pipeline-trace-findings.md#f-18) | The shipped postcode table is a 21-row stub. Needs a real data source, not a code change. |
| Project label | `resolveProjectName` ignores `fallbackProjectId` once anything is selected, so a multi-project item is labelled by **option order, not its own `project_id`**. Found 2026-09-16 while repairing a test that claimed the opposite and could never have shown it. One line to change; it changes what users see, so it is a product call. |

**Test debt (0.4b remainder):**

- `upload.service.spec.ts` — the one genuinely order-dependent case: passes alone, fails in some full
  runs, mocked `exifr.gps` returning `undefined`. Pairwise and whole-directory runs do not reproduce
  it, because vitest's file→worker assignment changes with the file list. Re-measured 2026-09-16
  (three full runs: fail / pass / fail — always the same five EXIF assertions when it fails).
- ~~`media-detail-view.ui.spec.ts`~~ **fixed 2026-09-16** — reflecting location store so
  `list_locations_for_media` returns written rows after `applyAddressSuggestion`, plus a
  `MediaDeleteUndoService` stub that invokes `onAfterDelete`. Soft debt 8/2 → 5/1.

**Measurement gaps, stated so nobody treats them as settled:**

- Every Phase 3 figure is Node with synthetic paths on one core. **No browser, no real folder tree.**
  If a browser is materially slower the ordering of this plan changes.
- No wall-clock time-to-first-upload exists for Phase 3.3. The *ordering* is proven by test; the
  improvement an operator would feel is not measured.
- [STUDY-007](./007-exif-coordinates-as-address-evidence.md)'s distance reasoning is `[C]`: no device
  photos were available. Fifty photos of known buildings would settle the radius in 5.7 and either
  confirm or destroy its clustering argument.

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
- **Reversing D-01 or D-04.** `[D]` Both are decided (§ 0) — recorded here because a reversal is what
  would reshape the plan: D-01 option D (leave it) deletes Phase 1.2; D-04 option C (cap the batch)
  deletes Phase 4 and most of Phase 3.
- **Registry data for a second country.** `[D]` D-03's step 2 (cross-country ambiguity is asked, not
  guessed) has nothing to be ambiguous about while only Austria has data, so it ships untested until
  DE or CH records exist. Adding them is what turns that branch from designed to verified.
