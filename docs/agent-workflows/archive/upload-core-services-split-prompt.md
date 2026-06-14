# Agent prompt: split upload core services (copy-paste safe)

Use this document as the **full task brief** for a dedicated split pass. Paste the **“Copy-paste block”** section at the bottom into a new agent chat.

## Context

Two upload services grew far past maintainable size. ESLint now **errors** (not warns) on any `src/app/core/upload/**/*.service.ts` file above **300 lines** (code only: `skipBlankLines` + `skipComments`). Global TS default remains **200 warn**.

| File | ~Lines (total) | ESLint budget (code) |
|------|----------------|----------------------|
| `upload-location-resolution.service.ts` | 1,625 | ≤ 300 |
| `upload-manager.service.ts` | 709 | ≤ 300 |

Recent bugs (tray scope, duplicate drain, source-conflict replay) were hard to reason about partly because logic is concentrated in one class. **This task is extraction only — no behavior or product-rule changes.**

## Mandatory skills & rules

1. Read and follow [safe-file-split skill](/.cursor/skills/safe-file-split/SKILL.md) — **mechanical 1:1 move**, one extraction per commit/step.
2. Read [service-symmetry skill](/.cursor/skills/service-symmetry/SKILL.md) for module layout.
3. Do **not** combine split with bug fixes, spec edits, or i18n.
4. **Copy-paste discipline:** prefer `cp` + edit imports over rewriting blocks from memory. After each move, `diff` the old commented block vs new file.
5. Spec stub only: add a one-line link in `docs/specs/service/media-upload-service/upload-location-resolution.md` to new child modules when created (no duplicate normative text).

## Lint gate (must be green at end)

```bash
cd apps/web
npx eslint "src/app/core/upload/**/*.service.ts"
npx vitest run src/app/core/upload/upload-location-resolution.service.spec.ts \
  src/app/core/upload/upload-manager.service.spec.ts \
  src/app/core/upload/upload-manager-queue.util.spec.ts \
  src/app/core/upload/upload-location-precedence.helpers.spec.ts
npx ng build
```

Repo root (optional): `npm run lint` in `apps/web` uses `--max-warnings 0`.

## Target architecture

Keep **one public facade** per domain; callers must not break:

- `UploadLocationResolutionService` — still `providedIn: 'root'`, same public method names/signals/observables.
- `UploadManagerService` — still the upload entry point for UI and tray adapter.

Extract **private** logic into injectable collaborators under `apps/web/src/app/core/upload/` (mirror existing `*.util.ts` / `adapters/` pattern). Suggested modules (adjust names if needed, keep ≤300 lines each):

### A. `UploadLocationResolutionService` (split first — largest)

| New module | Responsibility (move from resolution service) | Approx. source lines |
|------------|--------------------------------------------------|----------------------|
| `upload-location-disambiguation-store.service.ts` | `_groups` signal, `patchGroup`, `createGroup`, `syncBatchDisambiguationAggregates`, `pickNextActiveGroup`, `setSelectedGroupId`, `clearBatch`, computed `groupsById` / `activeGroup` / `pendingGroupCount` | 132–160, 1539–1624 |
| `upload-location-source-conflict.service.ts` | `resolvedSourceChoices`, `markSourceConflictResolved`, `getSourceConflictChoice`, `isSourceConflictResolved`, `registerSourceConflictGroup*`, `applySourceConflictChoiceToJobId`, `applyCandidateToGroup` (source branch only), `unblockSiblingsAfterSourceConflictSave`, `groupingKeyFromSourceQueryKey` | 124–213, 604–738, 1341–1475 |
| `upload-location-placement.service.ts` | `finalizePlacementForJob*`, `resolveJobTitleAddress`, `tryApplyExifPlacementForWeakBranchC`, placement logging | 433–507, 514–590, 739–764 |
| `upload-location-geocode-group.service.ts` | `ensureGeocodedGroup`, `runGeocodeForGroup`, `geocodeInFlight`, `applyGeocodeCandidateToJob`, geocode hit classification | 986–1222, 1578–1595 |
| `upload-location-tray-flow.service.ts` | `confirmTrayCity`, `loadHouseNumbersForGroup`, `registerTrayStepGroup`, `registerBatchProjectTrayIfNeeded`, layer package branch | 236–288, 765–985, 1223–1330 |
| `upload-location-resolution.facade.ts` (rename current file or slim in place) | Public API delegation, `applyPreResolveFromOrchestrator`, `applyCandidateToGroup` (non-source), `isolateJobFromGroup`, `deferGroup`, `registerDisambiguationGroup`, `isJobBlockedByGate`, subjects | remainder |

**Circular dependency warning:** `UploadLocationResolutionService` ↔ `UploadManagerService` already exists (`Injector` lazy get for `kickQueueAfterLocationGate`). New modules must use `inject(Injector)` + lazy `get(UploadManagerService)` where needed — do not introduce new cycles.

### B. `UploadManagerService` (split second)

| New module | Responsibility | Approx. source lines |
|------------|----------------|----------------------|
| `upload-manager-missing-data.util.ts` (or `.service.ts`) | `resolvePersistedMissingDataLocation`, `resolvePersistedMissingDataProject` | 449–540 |
| `upload-manager-pipeline-host.service.ts` | `drainQueue`, `runPipeline`, `failJob`, `cancelAllActive`, abort controller helpers, `kickQueueAfterLocationGate` | 568–692 |
| Slim `upload-manager.service.ts` | `submit*` delegation, public actions, `actionDeps` / `submitDeps` / `pipelineCtx` wiring, event subjects | keep ≤300 |

Many actions already live in `upload-manager-actions.util.ts` / `upload-manager-submit.util.ts` — **extend those** before adding new abstractions.

## Extraction order (lowest risk first)

1. Pure helpers already extracted — do not touch unless imports break.
2. `upload-location-disambiguation-store.service.ts` (state container, few external deps).
3. `upload-location-source-conflict.service.ts` (well-covered by `upload-location-resolution.service.spec.ts`).
4. `upload-location-placement.service.ts`.
5. `upload-location-geocode-group.service.ts`.
6. `upload-location-tray-flow.service.ts`.
7. Slim facade + fix imports across `upload-location-tray-producer.adapter.ts`, `upload-new-pre-resolve.util.ts`, `upload-panel-signals.service.ts`, etc.
8. Upload manager: missing-data util → pipeline host → slim facade.
9. Final eslint + vitest + `ng build`.

## Per-step workflow (repeat)

1. Comment out the block in the source file (do not delete yet).
2. Copy the **exact** block into the new file (terminal `sed -n 'START,ENDp' file.ts >> newfile.ts` or editor copy).
3. Fix imports/types; inject dependencies via constructor/`inject()`.
4. Replace commented block with delegation to the new service.
5. Run eslint on touched files + targeted vitest.
6. Delete commented block only when green.

## Import hygiene checklist

After each step, grep for broken paths:

```bash
rg "upload-location-resolution.service" apps/web/src --glob '*.ts'
rg "UploadLocationResolutionService" apps/web/src --glob '*.ts'
```

Only the facade (and tests) should import submodules directly; feature code keeps importing `UploadLocationResolutionService`.

## Acceptance criteria

- [ ] Every `src/app/core/upload/**/*.service.ts` ≤ 300 lines (eslint code count).
- [ ] No `max-lines: off` exceptions for upload services.
- [ ] Public APIs unchanged (same method names on facades).
- [ ] All listed vitest suites pass; `ng build` succeeds.
- [ ] No behavior change in tray/source-conflict tests (especially `applyCandidateToGroup source-exif applies only to tray jobIds`).

## Out of scope

- Changing tray UX, concurrency caps, or source-conflict product rules.
- Splitting `upload-location-precedence.helpers.ts` (already reasonable).
- Splitting specs beyond moving helpers if a test file exceeds limits.

---

## Copy-paste block (give this to the agent)

```text
Task: Split oversized upload services in feldpost using mechanical copy-paste extraction only (no behavior changes).

Read first:
- /.cursor/skills/safe-file-split/SKILL.md
- /docs/agent-workflows/upload-core-services-split-prompt.md (full plan + line hints)
- /docs/specs/service/media-upload-service/upload-location-resolution.md

ESLint (already configured): src/app/core/upload/**/*.service.ts must be ≤300 lines (code only; skipBlankLines + skipComments). max-lines-per-function ≤80. npm run lint in apps/web uses --max-warnings 0.

Files to split:
1) apps/web/src/app/core/upload/upload-location-resolution.service.ts (~1625 lines) → facade + sub-services listed in the prompt doc (disambiguation store, source-conflict, placement, geocode-group, tray-flow).
2) apps/web/src/app/core/upload/upload-manager.service.ts (~709 lines) → slim facade + upload-manager-missing-data util + upload-manager-pipeline-host (or equivalent).

Rules:
- One extraction per step; comment old block → copy exact code to new file → delegate → verify → delete comment.
- Do NOT rewrite logic from memory; use copy-paste or sed line ranges and diff.
- Do NOT fix bugs or change product rules in the same PR.
- Keep UploadLocationResolutionService and UploadManagerService as the only public injectables external features import.
- Preserve lazy Injector pattern for UploadManagerService ↔ location resolution to avoid new circular DI.
- Update imports in: upload-location-tray-producer.adapter.ts, upload-new-pre-resolve.util.ts, upload-manager.service.ts, upload-new-pipeline.service.ts, upload-panel-signals.service.ts, upload-resolver-tray.component.ts (grep to find all).

Verify each step and at end:
cd apps/web && npx eslint "src/app/core/upload/**/*.service.ts" && npx vitest run src/app/core/upload/upload-location-resolution.service.spec.ts src/app/core/upload/upload-manager.service.spec.ts src/app/core/upload/upload-manager-queue.util.spec.ts src/app/core/upload/upload-location-precedence.helpers.spec.ts && npx ng build

Deliver: series of small commits or one PR with clear commit per extraction; note final line counts per service file.
```
