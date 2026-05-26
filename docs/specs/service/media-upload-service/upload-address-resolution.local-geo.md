# Upload address resolution — local geo assets

> **Parent:** [upload-address-resolution-pipeline.md](./upload-address-resolution-pipeline.md)

## Paths

| File | Purpose |
| --- | --- |
| `apps/web/src/assets/geo/at-bundeslaender.json` | 9 AT states + aliases |
| `apps/web/src/assets/geo/at-plz.json` | PLZ → `string[]` city names |
| `apps/web/src/assets/geo/at-gemeinden-bev.json` | Slim AT municipality list: `{ "n", "b", "a"? }` name, state, aliases |

## Budget

Total inline assets **&lt; 500 KB**. If BEV export exceeds budget, ship slim subset + document build script.

## Build (full municipality list)

English: **municipalities** (AT: *Gemeinden*) — not districts (*Bezirke*) or states (*Bundesländer*).

Regenerate from Statistik Austria open data (CC BY 4.0):

```bash
npm run geo:build-gemeinden
```

Faster mirror (~same names, 2021 vintage): `npm run geo:build-gemeinden:fast`

Source metadata: `scripts/build-at-gemeinden-bev.mjs`

## Loader

`LocalGeoDataAdapter` — lazy `fetch('/assets/geo/...')` once per session, cached in memory.
