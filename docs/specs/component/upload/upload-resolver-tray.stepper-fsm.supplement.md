# Upload resolver tray — stepper FSM supplement

> **Parent:** [upload-resolver-tray.md](./upload-resolver-tray.md)

## Tray steps

| Step | ID | `disambiguationKind` | When |
| --- | --- | --- | --- |
| 1A | `1a` | `city_step` | Branch C; Branch B 0-hit fallback |
| 1B | `1b` | `house_step` | After 1A confirmed (`step1bGate: active`) |
| 2 | `2` | `project_address_a` / `project_address_b` | Batch once |
| 3 | `3` | `geocode` | Multiple hits Branch A/B |

## 1A → 1B gate

Step 1B is **hidden/disabled** until `confirmedCity` is set on the group.

Branch B skips 1A when project centroid supplies city context for the first bias attempt.

## B → C fallback

Bias geocode returns 0 hits → group reopens at Step 1A (not `missing_data`).
