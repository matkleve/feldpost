# Upload Manager — Phase FSM (supplement)

> **Parent:** [upload-manager.md](./upload-manager.md)  
> **Implementation:** `apps/web/src/app/core/upload/support/upload-phase-transitions.ts`

## Terminal phases

Jobs in these phases leave the active upload queue until user or system action resurrects them:

| Phase | Meaning |
| --- | --- |
| `complete` | Persisted media row exists; uploaded lane |
| `error` | Hard failure or user cancel (`wasCancelled` distinguishes cancel) |
| `missing_data` | Issues lane — GPS, duplicate review, deferred address, etc. |
| `skipped` | Same-user dedup auto-skip |

## Idempotency rules

| Action | Terminal source | Behavior |
| --- | --- | --- |
| `setPhase` / pipeline `transitionTo` | any terminal | No-op; job unchanged |
| `failJob` | any terminal | No-op; no `uploadFailed$` |
| `transitionTo` same phase | any | No-op |
| User retry | `error` (not `wasCancelled`) | `error → queued` via user channel |
| User cancel | non-terminal | `→ error` via user channel; **no** `uploadFailed$` |
| Sign-out cancel | non-terminal | `→ error` via system channel; **no** `uploadFailed$` |

## Transition channels

| Channel | Writers | `jobPhaseChanged$` |
| --- | --- | --- |
| `pipeline` | Pipeline `setPhase`, dedup, location services | **Yes** |
| `user` | Panel actions (retry, cancel, map pick, assign, conflict resolve, force duplicate) | **No** (preserves pre-UP-11 event gap) |
| `system` | Sign-out mass cancel, persisted missing-data RPC resolution | **No** |

`failJob` remains separate: sets `phase=error`, records `failedAt`, emits `uploadFailed$`.

## Pipeline divergence (mode-specific optional phases)

| Phase | `new` | `attach` / `replace` |
| --- | --- | --- |
| `saving_record` | Yes | No |
| `replacing_record` | No | Yes |
| `extracting_title` | Yes when auto-location enabled | No |
| `resolving_location` … `awaiting_conflict_resolution` | Yes | No |
| `converting_format` | When source is HEIC | When source is HEIC |

Illegal jumps for a given file are avoided by pipeline branching, not by blocking optional phases globally.

## Guard policy

Illegal transitions are **rejected** (state unchanged). Violations are reported via `reportTransitionViolation` (test hook + `ngDevMode` console warning). Production never throws — a bad edge must not break an in-flight user upload.
