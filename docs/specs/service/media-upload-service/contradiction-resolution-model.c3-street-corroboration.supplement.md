# Contradiction Resolution Model — C3 pre-check: street corroboration (supplement)

> **Parent:** [contradiction-resolution-model.md](./contradiction-resolution-model.md) § Class C, gap **G6**
> **Decision:** [STUDY-006 D-11](../../../study/006-upload-pipeline-correction-plan.md#d-11)

## What It Is

Today **C3** opens **every time** two folder levels disagree on `city`, even when the street named in
the path only exists in one of the candidates — `detectAreaConflicts` never looks past the admin field
values themselves, and `applyPreResolveFromOrchestrator` holds unconditionally for any
`needsAreaResolution` group before any geocode call. This adds one corroboration step before the tray
opens.

**"We got a hit" is not corroboration.** A structured geocoder query (Photon `/structured`,
Nominatim's structured `search?street=&city=`) is a ranked search, not a strict relational filter —
querying `street=X&city=Y` can return X's *closest* match even when X does not exist in Y; a
non-empty result proves nothing about whether the street is actually in that city. The only
trustworthy signal is what the hit's **own** address components say about where the geocoder thinks
that street is.

## Mechanism — one query does city corroboration and the final pin; a second tier covers new construction

**Tier 1 — with the house number, if the Search Object has one.** Query
`geocoding.searchStructuredForward({ street: [so.street, so.houseNumber].join(' '), countryCode })` —
e.g. `"18 Maria-Theresien-Straße"`, no `city`, whole country. Unlike the bare-street version this
supplement first proposed, this is not merely a corroboration probe: **a clean single hit here already
carries everything needed** — its `address.city` corroborates which candidate is right, its
`address.house_number` (checked, not assumed — see below) confirms the number, and its `lat`/`lng` *is*
the final placement. When Tier 1 succeeds there is no second geocode call for this group at all.

**Tier 2 — bare street, no house number.** Only tried when Tier 1 comes back with zero hits: a
brand-new building on an already-mapped street is exactly this product's other common case, and would
otherwise be mistaken for "the street doesn't exist anywhere." `geocoding.searchStructuredForward({
street, countryCode })` — the same call Branch C already makes when no locality is known at all, so
this is not a new query shape, only an earlier trigger for it. A Tier 2 hit corroborates the city only;
the precise pin still comes from the normal Branch A/B/C geocode that runs once the tray (or
auto-resolve) settles the city.

Both tiers read each hit's own `address.city` / `address.town` / `address.village` — exactly what
`mapGeocoderHitsToCandidates` already extracts for class A1's `pickDiscriminatingField` — never the
mere presence of a result. Normalize those names the same way `detectAreaConflicts` normalizes admin
values (`normalizeAdminValue`), collect the distinct set (`hitCities`), and act on it:

| `hitCities` | Meaning | Outcome |
| --- | --- | --- |
| Exactly one candidate, and only that one | The street corroborates one of the folder's own guesses | **Auto-resolve** — write it (Tier 1: with coordinates and house number too), no tray |
| Exactly one city, and it is **not** a candidate | The street corroborates a *third* place the folder never named | **Suggest it** — open the tray with that city added as an extra option, ranked and labelled below the folder's own candidates (see Tray copy) |
| Zero cities, more than one city, Tier 2 also empty, or the call fails/times out | No single clean answer | **Ask exactly as today** — plain C3 tray, no addition |

A suggestion must never *replace* the folder's own candidates (a private road, an informal name, or a
gazetteer gap can all make real folder evidence outrank a geocoder that's never heard of it) — it only
*adds* one. A failed or timed-out lookup, or a genuine tie/no-signal result at both tiers, falls through
to the tray exactly as a zero-hit result does today — never to silence, and never to a suggestion built
on weak evidence.

## Worked example

`AT/Wien/Innsbruck/Maria-Theresien-Straße 18/…` — C3 candidates `{Wien, Innsbruck}` for `city`.

| Query | Hits' `address.city` values | Outcome |
| --- | --- | --- |
| Tier 1: `street="18 Maria-Theresien-Straße", countryCode=at` | `{Innsbruck}` only | Auto-resolve → `city = Innsbruck`, coordinates and house number from this same hit, no tray, no second geocode |
| Tier 1 empty → Tier 2: `street="Maria-Theresien-Straße", countryCode=at` | `{Innsbruck}` only | Auto-resolve → `city = Innsbruck` (a new building 18, not yet mapped, on a street that is) — precise pin still comes from the normal geocode after |
| either tier | `{Wien, Innsbruck}` | Tie between the two candidates — open C3 tray as today |
| either tier | `{Salzburg}` (a single city, but neither candidate) | Open C3 tray with a third option added, ranked below the folder candidates: *"Salzburg — the street was found here, not in Wien or Innsbruck. Did you mean Salzburg?"* |
| either tier | `{Salzburg, Graz}` (more than one, none a candidate) | No single clean answer — open C3 tray as today, no addition |
| both tiers | zero hits, or the geocoder call fails/times out | No corroboration — open C3 tray as today |

## Tray copy: a suggestion is not a peer of the folder's own candidates

The added option must read as *evidence found*, not as a third equally-weighted guess — otherwise the
question gets harder to answer, not easier. Two concrete rules:

- **Order**: folder-derived candidates first (`Wien`, `Innsbruck`), the suggested city last, visually
  set apart (e.g. a divider or a distinct label style), never alphabetized or score-sorted into the
  middle of the list.
- **Copy asymmetry**: `Wien`/`Innsbruck` keep their existing plain labels (the folder said this; the
  system takes no position on whether it's right). The suggested entry names the evidence directly —
  *"Salzburg — the street was found here, not in Wien or Innsbruck. Did you mean Salzburg?"* — so the
  user can tell at a glance which option the system found actual corroboration for.

## Adding the suggested candidate needs no new tray mechanism

`registerAreaConflictGroup` already builds this tray's candidates as a plain array of
`{id, addressLabel}` pairs (`buildAdminConflictCandidates` — one per conflicting folder-level value,
plus an existing `"Manual: {field}"` free-text-override entry). A suggested outside city is the same
shape, one more entry — no lat/lng needed here either, same as the existing entries (`lat: 0, lng: 0`
placeholders): picking any candidate in this tray just writes the chosen city string onto the Search
Object and lets the normal Branch A/B/C geocode run afterward, which is exactly why the pre-check
already knows this pick will succeed — it just confirmed the street exists there.

## Out of scope: a street that exists nowhere at all

This supplement only covers *which city* a street that the geocoder does know about is in. A street
the geocoder has never heard of anywhere (new construction on a brand-new street, not merely a new
house number on an existing one) is a different, already-specced case — **V1 / `containment_check`**
in the parent spec — and should stay there rather than be folded into this mechanism. See
[F-20](../../../study/005-upload-pipeline-trace-findings.md#f-20) for a defect found in that path while
speccing this one.

## Provenance

A field the pre-check auto-resolves is written with `origin: 'derived'`, `rule: 'street→city
(corroboration)'`, `derivedFrom: '<street>'` — the same `FieldLevelEntry` shape every other
derivation rule already uses (`postcode→city`, `city→state`, `place→country`). A suggested candidate
the user then picks in the tray is recorded the same way the tray already records any of its other
choices (`Level N` or `Manual`) — this supplement adds the extra option, not a new provenance path
for tray answers.

**Nothing renders this in the UI today, for any rule** — verified by grep: zero consumers of
`origin`/`rule`/`derivedFrom` anywhere in the frontend. This is the first case that needs it, phrased
as *"{street} only in {city} → city set."* Where exactly that line renders — tray copy at question
time, or a persistent note against the already-resolved item — is a UI decision this supplement does
not make.

## Cost

`needsAreaResolution` is a synchronous, local, offline decision today — this is the first network
call on that path. One geocoder round-trip per C3 group (not per candidate), cached the same way
`searchStructuredForward` already caches everything else.

## Scope

`city`-vs-`city` conflicts only, for now. The symmetric case (two folder levels naming different
Bundesländer) is plausible but not built or measured — left open.
