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

## Mechanism — reuses class A1's own tools, run one step earlier

1. Query the street **alone**, no `city` param: `geocoding.searchStructuredForward({ street,
   countryCode })`. (Same call Branch C already makes when no locality is known at all — this is not
   a new query shape, just an earlier trigger for it.)
2. Read each hit's own `address.city` / `address.town` / `address.village` — exactly what
   `mapGeocoderHitsToCandidates` already extracts for class A1's `pickDiscriminatingField`.
3. Normalize those city names the same way `detectAreaConflicts` normalizes admin values
   (`normalizeAdminValue`), and collect the distinct set. Call it `hitCities`.
4. Three outcomes, by how `hitCities` relates to the C3 candidate set (e.g. `{Wien, Innsbruck}`):

   | `hitCities` | Meaning | Outcome |
   | --- | --- | --- |
   | Exactly one candidate, and only that one | The street corroborates one of the folder's own guesses | **Auto-resolve** — write it, no tray |
   | Exactly one city, and it is **not** a candidate | The street corroborates a *third* place the folder never named | **Suggest it** — open the tray with that city added as an extra option, distinct from the folder-derived ones, plus the reason |
   | Zero cities, more than one city, or the call fails/times out | No single clean answer | **Ask exactly as today** — plain C3 tray, no addition |

   The "suggest" row is the same underlying signal as auto-resolve — one confident answer — just
   pointed outside the set the path proposed. It must never *replace* the folder's own candidates
   (a private road, an informal name, or a gazetteer gap can all make real folder evidence outrank a
   geocoder that's never heard of it) — it only *adds* one, so the user still sees `Wien` and
   `Innsbruck` alongside it.
5. A failed or timed-out lookup, or a genuine tie/no-signal result, falls through to the tray exactly
   as a zero-hit result does today — never to silence, and never to a suggestion built on weak
   evidence.

## Worked example

`AT/Wien/Innsbruck/Maria-Theresien-Straße 18/…` — C3 candidates `{Wien, Innsbruck}` for `city`.

| Query | Hits' `address.city` values | Outcome |
| --- | --- | --- |
| `street=Maria-Theresien-Straße, countryCode=at` | `{Innsbruck}` only | Auto-resolve → `city = Innsbruck`, no tray |
| same | `{Wien, Innsbruck}` | Tie between the two candidates — open C3 tray as today |
| same | `{Salzburg}` (a single city, but neither candidate) | Open C3 tray with a third option added: *"Salzburg — the street was found here, not in Wien or Innsbruck. Did you mean Salzburg?"*, alongside the original `Wien`/`Innsbruck` choices |
| same | `{Salzburg, Graz}` (more than one, none a candidate) | No single clean answer — open C3 tray as today, no addition |
| same | zero hits, or the geocoder call fails/times out | No corroboration — open C3 tray as today |

## Adding the suggested candidate needs no new tray mechanism

`registerAreaConflictGroup` already builds this tray's candidates as a plain array of
`{id, addressLabel}` pairs (`buildAdminConflictCandidates` — one per conflicting folder-level value,
plus an existing `"Manual: {field}"` free-text-override entry). A suggested outside city is the same
shape, one more entry — no lat/lng needed here either, same as the existing entries (`lat: 0, lng: 0`
placeholders): picking any candidate in this tray just writes the chosen city string onto the Search
Object and lets the normal Branch A/B/C geocode run afterward, which is exactly why the pre-check
already knows this pick will succeed — it just confirmed the street exists there.

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
