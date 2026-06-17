# Upload resolver tray — stepper FSM supplement

> **Parent:** [upload-resolver-tray.md](./upload-resolver-tray.md)

## Tray steps

| Step | ID | `disambiguationKind` | When |
| --- | --- | --- | --- |
| 1A | `1a` | `city_step` | Branch C; Branch B 0-hit fallback |
| 1B | `1b` | `house_step` | After 1A confirmed (`step1bGate: active`) |
| 3 | `3` | `geocode` | Multiple hits Branch A/B |

## 1A → 1B gate

Step 1B is **hidden/disabled** until `confirmedCity` is set on the group.

**Orchestrator:** Step 1A and 1B are separate `enqueueItem` rows in the same presentation bundle; 1B has `dependsOnItemId` → UI `blocked` until 1A resolves. Producer enqueues 1B after `confirmTrayCity`.

Branch B skips 1A when project centroid supplies city context for the first bias attempt.

## B → C fallback

Bias geocode returns 0 hits → group reopens at Step 1A (not `missing_data`).
