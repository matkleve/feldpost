---
id: STUDY-007
type: investigation
status: proposed
supersedes: none
corrected-by: none
---

**Measured 2026-09-15** on `claude/uploader-pipeline-test-badges-kktrpg` @ `fe58d49`, by reading
source and the shipped upload config. No device photos were available in this environment, so every
claim about real-world GPS behaviour is graded `[C]` or lower and the study says what would settle
it.

# EXIF coordinates as address evidence

Two owner questions, one root cause between them:

1. **D-09** — if a path gives a street but no house number, and the photo has GPS, may the GPS
   supply the number? Owner: *"if there is only exif we take that"*, and resolve it **with a
   confirmation question**.
2. **Clustering** — *"if there is a group of close exif data then maybe we can combine them? but
   maybe not because it is still different locations?"*

The instinct behind the second question is correct, and this study's main job is to say **why** it
is correct, because the reason also constrains the answer to the first.

## 1 · What EXIF actually records

**A GPS tag is where the *camera* stood. It is not where the *subject* is.** `[A]` — this is what
the EXIF specification stores, and nothing in the pipeline claims otherwise.

That single fact does most of the work here. A photo of a building taken from the pavement opposite
carries coordinates that are **closer to the building behind the photographer** than to the building
in the frame. On a 15 m street the camera position can sit nearer the wrong address than the right
one, and no amount of precision in the GPS fixes that — a perfect fix of the wrong point is still
the wrong point.

Add the ordinary error of a phone fix: consumer GPS is commonly cited at 3–5 m open-sky and
materially worse in an urban canyon or beside a facade, which is exactly where construction photos
are taken. `[C]` — widely reported, not measured here.

So EXIF gives a **noisy observation of a related but different quantity**. Treating it as an address
is a category error; treating it as *evidence bearing on* an address is sound.

## 2 · What the pipeline does with it today

| Where | Behaviour | Grade |
| --- | --- | --- |
| `upload-location-config.ts:76` | `exifAssistRadiusMeters: 80` | `[A]` |
| `upload-location-resolution.helpers.ts:508` | When several geocoder candidates exist, EXIF **picks between them** if one is within 80 m | `[A]` |
| `upload-file-persist.util.ts:208` | `exif_latitude` / `exif_longitude` are stored on the row | `[A]` |
| — | EXIF **never invents** an address field | `[A]` |

This is a coherent position and worth naming, because both owner questions ask to extend it: today
EXIF is a **tie-breaker among candidates the text already produced**, never a source. The
[address precision principle](../specs/service/media-upload-service/address-resolution-model.md#address-precision-principle)
is the rule behind it — never fabricate precision.

The 80 m radius is itself a `[D]` nobody has re-derived; it is roughly "same block", and § 5 argues
it is too wide for the new use.

## 3 · D-09 — EXIF as a house number

The owner has now decided: when EXIF is the only source, use it **and ask**. `[D]`

That resolves the tension with the precision principle, because *asking* is precisely what the
principle protects. The principle forbids silently presenting a fabricated number as fact; a
confirmation tray presents it as a **proposal with its provenance shown**, which is the opposite
failure mode.

### Recommended shape

| Condition | Behaviour |
| --- | --- |
| Reverse-geocoded street **equals** the established street, point within radius | Adopt the house number, `origin: 'derived'`, `rule: 'exif→houseNumber'`, and **ask for confirmation** |
| Reverse-geocoded street **differs** | Change nothing. Do not ask — the answer is not a house number question |
| No street established from text | Out of scope for D-09; that is the area-only / Issues path |
| Point outside the radius | Change nothing |

The street-equality guard is load-bearing and must not be dropped for being "too strict": without it
the pipeline puts a house number on a photo taken across the road, which is the exact failure the
principle exists to prevent. `[C]`

### The tray-volume constraint the owner named

*"we want to keep the tray calls low but decisive."* A per-file confirmation would be the worst of
both: it is the highest-volume question in the system (every photo has EXIF) and the least
informative (the user cannot verify a house number from a thumbnail). `[C]`

**Therefore: ask once per address, not once per file.** Every file resolving to the same street and
the same proposed number is one question. This is the existing group-merge mechanism, which already
merged 549 files into one question `[B]`, so the machinery exists.

## 4 · Clustering — the part to be careful about

The owner's hesitation is right, and sharper than it may look. Consider what a cluster of nearby
EXIF points can mean:

| Situation | Same address? | Camera points |
| --- | --- | --- |
| Walking around one building, photographing each side | **Yes** | Spread by the building's own footprint, 20–40 m apart, possibly on opposite sides |
| Photographing a row of terraced houses from the street | **No** — each house is its own address | 5–10 m apart, a *tighter* cluster than the first case |
| Standing in one spot photographing several buildings | **No** | Nearly identical points |

**The distances invert the conclusion.** `[C]` The case where combining is *correct* (one building,
walked around) produces points **further apart** than the case where combining is *wrong* (a terrace
row, or one vantage point). Any rule of the form "points within N metres are the same address" gets
the common construction-photography case backwards.

This is the answer to the owner's question, and it is the pessimistic one: **proximity of camera
positions does not imply identity of subject, and in the cases that matter it actively
anti-correlates.** Clustering on distance alone should not be built.

### What clustering *could* legitimately do

Two narrower uses survive the objection:

1. **As corroboration, not as merging.** If twelve files already resolved to one address from their
   folder text, and their EXIF points form a tight cluster near that address, that is evidence the
   *text* was right. It changes confidence, not the address. Cheap, safe, and it never invents.
2. **As an outlier alarm.** One file in a folder of fifty whose EXIF sits 2 km from the other
   forty-nine is very likely misfiled. Surfacing it as a question is high-value and low-volume —
   the opposite trade from per-file confirmation.

Both use EXIF to *check* an address established elsewhere. Neither uses it to *create* one, and that
is the line this study proposes holding. `[D]`

### If clustering is built anyway

Then the grouping key must include something that actually tracks subject identity, not just
position. In descending order of usefulness:

- **Folder path** — already the strongest subject signal in the system, and already the grouping key.
- **Capture time** — consecutive photos minutes apart are one visit; the same spot revisited in
  March and in August are different sessions. Time is available in EXIF and is currently used only
  for `captured_at`. `[A]`
- **Reverse-geocoded street** — cheap, and it separates a terrace row from a walk-around.

Distance alone, without at least one of these, is the version that should not ship. `[D]`

## 5 · The radius question

`exifAssistRadiusMeters: 80` is fit for its current job — *"which of these candidates does the GPS
favour"* — because 80 m usually contains one candidate and not two. It is **not** fit for D-09's
job, *"is this the house"*, where 80 m contains an entire terrace row. `[C]`

**Recommendation:** D-09 gets its own, tighter radius rather than borrowing this one. `[D]` Naming a
value without device data would be invention; § 7 says how to obtain it. A separate constant also
keeps the two meanings from being tuned into each other later — the file already warns that
distance rules must not be conflated. `[A]`

## 6 · Recommendations

| # | Recommendation | Grade |
| --- | --- | --- |
| **R1** | Build D-09 as confirm-only: same street + within a **dedicated** radius, `rule: 'exif→houseNumber'`, provenance shown in the tray | `[D]` |
| **R2** | Ask **once per proposed address**, never once per file | `[D]` |
| **R3** | Do **not** build distance-based clustering that merges addresses | `[D]` |
| **R4** | Do build EXIF-as-corroboration (raises confidence, never writes an address) | `[D]` |
| **R5** | Do build the outlier alarm — highest value per question asked | `[D]` |
| **R6** | Give D-09 its own radius constant; do not reuse `exifAssistRadiusMeters` | `[D]` |
| **R7** | Store the reverse-geocode result as evidence with its own origin, so a wrong adoption is traceable afterwards | `[D]` |
| **R8** | Show the photo's bearing on the map; do **not** project a subject position from it (§ 6b) | `[D]` |
| **R9** | Treat every EXIF field as independently optional; no rule may require one (§ 6c) | `[D]` |

## 6b · Direction — the owner's case, and what it changes

**Owner, 2026-09-15:** *"I stand on a building and photograph around. The photo might have the GPS
and the directionality. My solution is to just show the direction the photo was taken in."*

This is the right instinct, and it follows directly from § 1. If the problem is that a GPS tag
records the camera rather than the subject, then a **bearing is the missing half of the
observation**: position plus direction describes a ray from the camera toward the subject, which is
much closer to what we actually want to know.

**The field exists and is readable here.** Probing the 20 shipped sample photos with the app's own
`exifr` build: **15 of 20 carry `GPSLatitude`/`GPSLongitude`, and the same 15 carry
`GPSImgDirection`.** `[B]` (Sample fixtures, not device exports — this proves the field is readable
by the shipped library, not that cameras reliably write it.)

### Why "just show the direction" is the right first move

Showing a bearing is a **display** decision, not an inference. It adds no claim the data does not
support: the photo says it was taken facing 47°, and the UI says so. Compare that with the tempting
next step — projecting along the bearing to guess *which building* was photographed — which
multiplies three uncertainties (position error, bearing error, unknown distance to subject) into a
guess that would then be written as an address. The first is honest disclosure; the second is
exactly the fabricated precision the principle forbids. `[D]`

**Recommendation R8:** render the bearing on the map as a direction indicator on the photo's marker,
and stop there. Do not project a subject position from it. `[D]`

It also makes the owner's own scenario legible: standing on one building photographing around
produces a fan of identical positions with *different* bearings — which is visible at a glance as a
fan, and is precisely the case § 4 says must never be merged into one address.

## 6c · How much can EXIF be trusted?

**Owner's question: "how sure can we be about the exif data of a media?"** Honestly: less than the
number of decimal places suggests, and the doubt should be structural rather than a fudge factor.

| Source of doubt | Effect | Grade |
| --- | --- | --- |
| **Absent entirely** | 5 of 20 sample files had no GPS at all; stripped by messaging apps, exports and privacy settings | `[B]` |
| **Consumer GPS error** | 3–5 m open sky, materially worse beside a facade or in an urban canyon — where construction photos are taken | `[C]` |
| **Camera ≠ subject** | The dominant error, unbounded by GPS quality (§ 1) | `[A]` |
| **Bearing reference unknown** | The samples carry `GPSImgDirection` but **no `GPSImgDirectionRef`**, so true vs magnetic north is unstated. Vienna's declination is ~5°, i.e. ~4 m sideways at 50 m | `[B]` |
| **Capture time absent** | **0 of 20** samples carry `DateTimeOriginal` — so the time signal § 4 recommends for clustering is not guaranteed either | `[B]` |
| **Clock and datum** | Wrong device clock; `GPSMapDatum` present in the samples but unvalidated | `[C]` |

The last two are new findings from this probe and both cut against earlier optimism: § 4 proposed
capture time as a better clustering key than distance, and in this corpus **capture time is not
there at all**. That does not sink the idea — real device photos normally carry it — but it does
mean any design must treat every EXIF field as **optional evidence, never a required input**. `[C]`

**Recommendation R9:** treat EXIF fields as independently optional. Every rule that consumes one
must state what it does when the field is missing, and the answer must never be "guess". `[D]`
This is the same shape as the evidence model already in use: EXIF is one more origin with one more
confidence, not a privileged channel.

## 7 · What would change this study

- **A real device export.** `[D]` Every distance claim here is reasoned, not measured. Fifty photos
  of known buildings, with their true addresses, would settle the radius in R6 and either confirm or
  destroy § 4's inversion claim. This is the single highest-value missing input.
- **Evidence that operators photograph from inside.** If the typical shot is taken within the
  property rather than from the street, the across-the-road failure is rarer than assumed and the
  radius can widen.
- **A measurement of how often EXIF is present at all.** Partially answered on 2026-09-15 by probing
  the shipped samples: 15/20 had GPS, 15/20 had a bearing, **0/20 had capture time** `[B]`. These are
  fixtures, not device exports, so the figures bound nothing about production — but they were enough
  to show that capture time cannot be assumed (§ 6c). A real device sample would settle it.
- **A device export carrying `GPSImgDirectionRef`.** `[D]` Without it, bearings cannot be stated as
  true north, which caps how precisely § 6b's indicator may be drawn.
