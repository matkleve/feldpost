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

## Step 1B — street centroid

"No number needed" on the house step resolves the group to the street centroid via `applyTrayHouseSelection(groupId, null, streetCentroid: true)`. It is **not** a Skip/defer action.

## Tray visual state FSM (component scope)

| State | When | DOM |
| --- | --- | --- |
| `idle` | No active item | Tray hidden or passive |
| `blocked` | `dependsOnItemId` unresolved | Blocked hint visible; choices hidden |
| `text_answer` | `answerKind: text` | City text input |
| `choice_list` | Numbered options (not house step) | Option list |
| `house_step` | `trayStepLabel: 1b` and ready | Option list + "No number needed" |

Root `[attr.data-state]` binds to this enum. Transition map: `upload-resolver-tray-state.ts`.

## Tray Continue gate — text answer exception

The text-answer city step (`answerKind: text`) bypasses the file-prepare readiness gate intentionally: city names do not depend on HEIC conversion completing. All other answer surfaces require every live `jobId` to pass `areAllJobsReadyForTrayResolution`.
