# EXIF as a house number — confirm-only (supplement)

> **Parent:** [address-resolution-model.md](./address-resolution-model.md)
> **Decision:** [STUDY-006 D-09](../../../study/006-upload-pipeline-correction-plan.md) · **Reasoning:** [STUDY-007](../../../study/007-exif-coordinates-as-address-evidence.md)
> **Status:** decided; **decision module implemented 2026-09-20, inert until the radius is chosen** — see § Status

## What It Is

When a path establishes a street but no house number, and the photo carries GPS, the pipeline may
propose the house number that GPS reverse-geocodes to — and must **ask** before adopting it.

## Why asking is what makes it legal

The [address precision principle](./address-resolution-model.md#address-precision-principle) forbids
fabricating precision. A confirmation tray does not fabricate: it presents a **proposal with its
provenance shown**, and the user decides. Writing the number silently would be the violation; asking
is the opposite of it.

## The guard, and why it cannot be relaxed

| Condition | Behaviour |
| --- | --- |
| Reverse-geocoded street **equals** the established street, point within the radius | Propose the house number and **ask** |
| Reverse-geocoded street **differs** | Change nothing, and **do not ask** — it is not a house-number question |
| No street established from text | Out of scope; that is the area-only / Issues path |
| Point outside the radius | Change nothing |
| No GPS on the photo | Change nothing |

**Street equality is load-bearing.** A GPS tag records where the *camera* stood, not where the
subject is ([STUDY-007 § 1](../../../study/007-exif-coordinates-as-address-evidence.md)); a photo
taken from the pavement opposite can sit nearer the building behind the photographer. Without the
street check the pipeline numbers a photo taken across the road, which is precisely the failure the
precision principle exists to prevent.

## Ask once per address, never once per file

`[D]` A per-file confirmation would be the worst possible shape: the **highest-volume** question in
the system, since every photo has EXIF, and the **least answerable**, since nobody can verify a house
number from a thumbnail. Every file resolving to the same street and the same proposed number is one
question, through the existing group merge — the mechanism that already collapsed 549 files into a
single question.

## Its own radius

This must **not** reuse `exifAssistRadiusMeters` (80 m). That value answers a different question —
*"which of these candidates does the GPS favour"* — where 80 m usefully contains one candidate. For
*"is this the house"*, 80 m contains an entire terrace row. A separate constant also stops the two
meanings being tuned into each other later; `upload-location-resolution.helpers.ts` already warns
that these distance rules must not be conflated.

**The value is not named here.** Naming one without device photos would be invention — see
[STUDY-007 § 7](../../../study/007-exif-coordinates-as-address-evidence.md).

## Evidence and provenance

The adopted number is written as ordinary evidence: `origin: 'derived'`, `rule: 'exif→houseNumber'`,
so a wrong adoption is traceable afterwards and the tray can show where the number came from. No new
write path, no special-casing — if a field cannot go through the evidence model, it is out of scope
for this rule rather than exempt from it.

## Status

**Decision module implemented 2026-09-20** — `apps/web/src/app/core/upload/location/exif-house-number.ts`
(`exifHouseNumberProposal`, `exifHouseNumberProposalKey`), 17 tests. It is pure: no I/O, no tray, no
write. Callers hand it the evidence they already hold and act on the verdict, which keeps the guard —
the load-bearing, easy-to-get-wrong part — testable without a geocoder.

Two implementation choices worth stating, because both could reasonably have gone the other way:

- **Street comparison folds.** `streetsMatch` runs both sides through
  `normalizeStreetForGroupingKey`, the same fold the grouping key and the layer-package compare use
  (street-fold S5). Raw `!==` would read `Wasagasse`/`Wasagase` and `Argentinierstr.`/`Argentinierstraße`
  as different streets and drop legitimate proposals — silently, since that skip is indistinguishable
  from a genuine mismatch.
- **An unmeasurable distance is not a short one.** A missing `streetPosition` returns
  `outside_radius`, not a pass.

**The rule is inert and will stay inert until somebody chooses the radius.**
`UploadLocationConfig.exifHouseNumberRadiusMeters` defaults to `null`, and `null` short-circuits the
decision with `radius_not_configured`. This is the honest reading of the section above: this document
declines to name a value because naming one without real device photos would be invention, and a
guessed default in code would be that same invention with less visibility. Setting the number turns
the rule on; it is a decision, tracked in [#221](https://github.com/matkleve/feldpost/issues/221).

**Still to build:** the tray presentation and the write. The decision and the merge key exist; what
consumes them does not. That is the remaining half of #221 and is blocked behind the same radius
decision — building a tray for a rule that cannot fire would be untestable end to end.

## Acceptance Criteria

- [x] A path with street but no house number, plus GPS reverse-geocoding to the same street within
      the radius, **proposes** the number — *the decision half. Opening the confirmation is unbuilt.*
- [x] The proposal carries `origin: 'derived'` and `rule: 'exif→houseNumber'` — *writing it is unbuilt.*
- [ ] Declining leaves the address exactly as the path established it — *unbuilt (no tray yet).*
- [x] A reverse-geocoded **different** street changes nothing and asks nothing.
- [x] A point outside the radius changes nothing.
- [x] Twenty files resolving to the same proposal share one `exifHouseNumberProposalKey` — *the
      merge itself is the existing group merge and is unexercised until the tray exists.*
- [x] The radius constant is distinct from `exifAssistRadiusMeters` — and unset, so the rule is inert.
- [x] No file without GPS is affected in any way.
