# EXIF as a house number — confirm-only (supplement)

> **Parent:** [address-resolution-model.md](./address-resolution-model.md)
> **Decision:** [STUDY-006 D-09](../../../study/006-upload-pipeline-correction-plan.md) · **Reasoning:** [STUDY-007](../../../study/007-exif-coordinates-as-address-evidence.md)
> **Status:** decided, **not implemented**

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

## Acceptance Criteria

- [ ] A path with street but no house number, plus GPS reverse-geocoding to the same street within
      the radius, proposes the number and opens **one** confirmation.
- [ ] Accepting writes the number with `origin: 'derived'` and `rule: 'exif→houseNumber'`.
- [ ] Declining leaves the address exactly as the path established it.
- [ ] A reverse-geocoded **different** street changes nothing and asks nothing.
- [ ] A point outside the radius changes nothing.
- [ ] Twenty files under one folder resolving to the same proposal ask **once**, not twenty times.
- [ ] The radius constant is distinct from `exifAssistRadiusMeters`.
- [ ] No file without GPS is affected in any way.
