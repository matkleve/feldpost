# Upload search object — derivation rules

> **Parent:** [upload-search-object.evidence-model.md](./upload-search-object.evidence-model.md)

Every value the pipeline writes without reading it from the path comes from a **named rule** listed
here. A rule that cannot be named is a guess, and guesses are not written
([evidence model](./upload-search-object.evidence-model.md)).

## Positive rules — may write a value

| `rule` | From → to | Data | Confidence |
| --- | --- | --- | --- |
| `place→country` | an exact city or state match → `country` | `CITY_REGISTRY` (carries its own country); AT gazetteers imply `AT` | `1` |
| `postcode→city` | `postcode` → `city` | `at-plz.json` | `0.97` |
| `city→state` | `city` → `state` | `at-gemeinden-bev.json` (`b` per municipality, incl. short-form aliases) | `0.97` |

A positive rule **MUST NOT** overwrite path evidence for the same field, and its value lands in the
`0.90–0.97` band, so it is written **and** listed in `uncertainFields` — visible, not asserted.

## Rejected: `postcode→state`

The first digit of an Austrian postcode *mostly* indicates the federal state, and it is tempting to
derive one. It is **not** written, because the exceptions are real addresses, not edge cases:
`5280 Braunau am Inn` is Oberösterreich (5 = Salzburg), `9900 Lienz` is Tirol (9 = Kärnten),
`1300` is the airport in Niederösterreich (1 = Wien). A rule with counter-examples that common
produces a wrong state that then looks like a finding.

The same digit is useful in the **negative** direction, where the exceptions do not hurt.

## Negative rule — may only raise a question

| `check` | Effect |
| --- | --- |
| `postcode⊥state` | When the path states a state **and** the postcode's first digit belongs to a disjoint set of plausible states, populate `areaConflicts` for `postcode`. Never writes or removes a value. |

Plausible states per first digit, deliberately generous so border postcodes do not raise a false
question:

| Digit | Plausible states |
| --- | --- |
| 1 | Wien, Niederösterreich |
| 2 | Niederösterreich, Wien |
| 3 | Niederösterreich |
| 4 | Oberösterreich, Niederösterreich |
| 5 | Salzburg, Oberösterreich |
| 6 | Tirol, Vorarlberg |
| 7 | Burgenland, Niederösterreich |
| 8 | Steiermark, Burgenland |
| 9 | Kärnten, Tirol |

`Tirol/1090/…` therefore asks one question; `Oberösterreich/5280/…` (Braunau) asks none.

## Is that number a postcode?

A numeric token matching the country's postcode pattern is a **candidate**, not a fact — AT and CH
share `^\d{4}$`, DE, IT, FR and US share `^\d{5}$`, and a folder is full of other numbers. It becomes
the flat `postcode` only with at least one corroboration:

| # | Corroboration |
| --- | --- |
| 1 | `at-plz.json` contains it |
| 2 | A `city` stands in the same segment (`1160 Wien`) |
| 2a | A real street stands in the same segment **and the number opens it** (`1090 Mühlenstraße 12`). Position matters: `Mühlenstraße 12 IMG_2137` ends with a camera counter, not a postcode |
| 3 | A `city` elsewhere in the path is what this postcode expands to |
| 4 | The token **is the whole folder segment** (`AT/4780/…`), and the country is known |

Without any of them the token stays **evidence only**: recorded in `sources` and `areaEvidence`,
absent from the flat fields and from the `groupingKey`. So `AT/Baustelle 1090/…` contributes no
postcode, while `AT/1090/…` does.

A filename postcode additionally needs the [filename gate](./upload-search-object.md#area-evidence).

## Implementation map

| Symbol | File |
| --- | --- |
| `POSTCODE_STATE_PLAUSIBILITY`, `isPostcodePlausibleForState` | `apps/web/src/app/core/location-path-parser/postcode-patterns.ts` |
| `corroborateAreaEvidence`, `deriveStateFromCity` | `apps/web/src/app/core/location-path-parser/upload-area-evidence.helpers.ts` |
| Short-form aliases in the gazetteer | `scripts/build-at-gemeinden-bev.mjs` |
