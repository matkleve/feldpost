# Contradiction Resolution Model — C3 pre-check: street corroboration (supplement)

> **Parent:** [contradiction-resolution-model.md](./contradiction-resolution-model.md) § Class C, gap **G6**
> **Decision:** [STUDY-006 D-11](../../study/006-upload-pipeline-correction-plan.md#d-11)

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
   (`normalizeAdminValue`), and compare the resulting set against the C3 candidate set
   (e.g. `{Wien, Innsbruck}`).
4. **Auto-resolve only when exactly one candidate is present and the rest are absent.** Two cases
   still fall through to the C3 tray, unchanged from today:
   - *Neither* candidate appears among the hit cities (the street exists somewhere else entirely, or
     the geocoder has no coverage for it) — corroborating against the wrong place is worse than
     asking.
   - *More than one* candidate appears (a street name genuine in both) — a real tie, not a resolvable
     one.
5. A failed or timed-out lookup falls through to the tray exactly as a zero-hit result does — never to
   silence.

## Worked example

`AT/Wien/Innsbruck/Maria-Theresien-Straße 18/…` — C3 candidates `{Wien, Innsbruck}` for `city`.

| Query | Hits' `address.city` values | Outcome |
| --- | --- | --- |
| `street=Maria-Theresien-Straße, countryCode=at` | `{Innsbruck}` only | Auto-resolve → `city = Innsbruck` |
| same | `{Wien, Innsbruck}` | Tie — open C3 tray as today |
| same | `{Salzburg}` (neither candidate) | No corroboration — open C3 tray as today |
| same | zero hits, or the geocoder call fails/times out | No corroboration — open C3 tray as today |

## Provenance

A field the pre-check resolves is written with `origin: 'derived'`, `rule: 'street→city
(corroboration)'`, `derivedFrom: '<street>'` — the same `FieldLevelEntry` shape every other
derivation rule already uses (`postcode→city`, `city→state`, `place→country`).

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
