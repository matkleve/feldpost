# 04 — Status of the 2026-09-08 findings, re-measured

**Measured:** 2026-09-10 against HEAD. Every row in [`../upload-process-analysis-2026-09-08/10-findings.md`](../upload-process-analysis-2026-09-08/10-findings.md) that was still annotated open was re-checked, and every row annotated fixed was re-checked to confirm the fix actually landed rather than being recorded as landed.

Verdict vocabulary: **fixed since** = the defect is gone at HEAD. **still open** = unchanged in substance. **partially fixed** = part of the row addressed, remainder specific and named.

---

## 1. The headline: the test bundle compiles again

The previous audit's UP-03 recorded that the unit suite **did not compile** — ~101 TypeScript errors, 0 of 326 tests executing. That is no longer true. Measured directly on this branch with `npx ng test --watch=false`:

```
Test Files  15 failed | 177 passed (192)
     Tests  39 failed | 1229 passed | 5 expected fail (1273)
    Errors  34 errors
  Duration  6.85s
```

- **192 test files, 1273 tests execute.** Zero TypeScript compile errors.
- Upload scope specifically: **38/38 files compile, 254/254 pass.**
- The **39 failures sit in 15 files, none of them in the upload subsystem**, and they are runtime mock drift rather than compile errors — the largest cluster is `workspace-view.grouping.spec.ts` calling `.order()` on a Supabase mock chain that does not provide it (`TypeError: client.from(...).select(...).in(...).order is not a function`), which also produces most of the 34 unhandled rejections.

This matters beyond the finding itself, because root [`AGENTS.md`](../../../AGENTS.md) § `npm run verify` still describes the `test` check as "**the test bundle does not compile** — ~101 TS errors, 4 unresolved imports in `*.spec.ts`", measured 2026-09-08. That description is stale in the good direction: compile debt is cleared, execution debt (39 failures) replaced it. Since that table is the repository's declared ratchet, it should be re-measured and rewritten — a soft check that says "does not compile" invites the next agent to assume tests are unrunnable and skip them, which is exactly what the previous audit had to do.

**This document does not edit `AGENTS.md`.** The ratchet is governance; re-baselining it is the owner's call, and the number should be taken from a run on `main` rather than from this branch.

---

## 2. Fixed since the audit

| ID | What landed | Evidence |
| --- | --- | --- |
| **UP-01** | `find_photoless_conflicts` no longer takes a client-supplied org id; scoped server-side via `public.user_org_id()`. Client passes `p_lat`/`p_lng`/`p_address` only. **Hosted apply still unverified.** | `supabase/migrations/20260909180814_fix_find_photoless_conflicts_org_scope.sql:26-29,66`; `core/upload/support/upload-conflict.service.ts:50-54` |
| **UP-02** | DB-insert failure now awaits the storage remove before returning | `core/upload/support/upload-file-persist.util.ts:198-203` |
| **UP-03** | See § 1 | — |
| **UP-04** | Shared `removeUploadCancelResidue` removes storage **and** the `media_items` row; cancel and sign-out paths await it. (But see [NF-03](02-new-issues.md) — on the sign-out path it cannot authenticate.) | `core/upload/support/upload-cancel-residue.util.ts:25-32`; `core/upload/manager/upload-manager-actions.util.ts:107-108` |
| **UP-06** | Timeout aborts the job *and* `cleanupLateUploadSuccess` removes late-arriving storage and row | `core/upload/pipelines/new/upload-new-run-upload-phase.util.ts:191-219` |
| **UP-08** | `wasCancelled` flag replaces the `/cancelled/i` regex at both cancel write sites | `core/upload/support/upload-cancelled.util.ts:10-11`; `core/upload/upload-manager.types.ts:182` |
| **UP-13** | `runClassifyBatchGuarded` try/catch guarantees `drainQueue()` runs after `addJobs` | `core/upload/manager/upload-manager-submit.util.ts:208-219` |
| **UP-15** | `verifyStoragePathWrite` returns `{ persisted }`; attach fails the job and removes storage on `persisted: false` | `core/upload/support/upload-db-postwrite.util.ts:66-84` |
| **UP-35** | Dedup insert uses `.then(undefined, onError)` — rejection logged, not swallowed. (Reached new and replace; **not attach** — see [NF-06](02-new-issues.md).) | `core/upload/support/upload-db-postwrite.util.ts:40-49` |

---

## 3. Still open

| ID | One-line status | Evidence |
| --- | --- | --- |
| **UP-05** | `beforeunload` handler is still `(): void => {}`; AC correctly left unticked | `core/upload/upload-manager.service.ts:238` |
| **UP-07** | `getIssueKind` still substring-matches the localized `statusLabel` (EN + DE) when `issueKind` is absent | `features/upload/upload-phase.helpers.ts:66-75` |
| **UP-09** | Six user actions still write `phase:` directly via `updateJob` — no event, no terminal guard | `core/upload/manager/upload-manager-actions.util.ts:63,97,134,151,277,304` |
| **UP-10** | `failJob` has no terminal guard, unlike `setPhase` — a late rejection can flip `complete → error` | `core/upload/support/upload-job-state.service.ts:173-187` vs `:159` |
| **UP-11** | **No transition map or guard exists anywhere in the upload subsystem.** The only `Record<UploadPhase, …>` is a presentation map | `features/upload/upload-phase.helpers.ts:20` |
| **UP-12** | All six auto-`setLane('uploading')` sites remain; red tests document the intent without blocking CI | `features/upload/upload-panel/upload-panel-menu-action-router.service.ts:62,69,82` |
| **UP-14** | `revokeLocalUrl` is defined and **never called** — object URLs leak for the panel's lifetime | `core/media-download/media-download.service.ts:382-383` |
| **UP-23** | Required-location path calls `finishPreResolveDedup` twice — two dedup RPC passes per job | `core/upload/pipelines/new/upload-new-pre-resolve.util.ts:336` then `:364,378,389` |
| **UP-24** | Document detection uses `resolveMediaType(file)` in one place and a raw MIME prefix test in another | `…/upload-new-prepare-route.util.ts:196-204` vs `…/upload-new-post-save.util.ts:256-261` |
| **UP-25** | Two incompatible `ImageUploadedEvent` types, disambiguated by an alias in the lifecycle service | `core/upload/upload-manager.types.ts:226-232`; `core/workspace-pane/workspace-pane-shell-events.types.ts:7-13` |
| **UP-26** | **Worse than recorded: `madge` reports 20 circular imports, not 11**, all threading `UploadLocationResolutionService` ↔ `UploadManagerService` ↔ pipelines; `injector.get` workarounds unchanged | `madge --circular src/app/core/upload`; `core/upload/location/upload-location-disambiguation-registration.service.ts:27,126,128` |
| **UP-27** | 17 production files under `core/upload/**` still call `.from()`/`.rpc()` directly, plus one in the UI layer; 4 unconsolidated `*.types.ts` | `features/upload/upload-panel/upload-panel-job-file-actions.service.ts:269-274` |
| **UP-29** | English still escapes via `job.error` and raw `statusLabel` | `features/upload/upload-panel/upload-panel-item-helpers.ts:76-78`; `core/upload/support/upload.service.util.ts:73,81` |
| **UP-32** | Mojibake unchanged — 8 of 20 sample photos carry `├ƒ` where `ß` belongs, so the umlaut path stays untestable | `apps/web/public/vienna_sample_photos/Arsenalstra├ƒe, 03. Bezirk, Wien_0007.jpg` |
| **UP-33** | `onDrop` reads only `dataTransfer.files`; `webkitGetAsEntry` has **zero** occurrences in `apps/web/src`, so folder drag-drop submits nothing | `features/upload/upload-panel/upload-panel-input-handlers.ts:46-56` |
| **UP-34** | "Requeue at front" is documented in a comment; the implementation is plain array order | `core/upload/upload-manager.service.ts:414` vs `core/upload/manager/upload-manager-queue.util.ts:14-20` |
| **UP-36** | `enrichWithReverseGeocode` is still an empty no-op; the `resolving_address` phase is cosmetic | `core/upload/support/upload-enrichment.service.ts:43-47` |
| **UP-37** | Content hash still reads the first 64 KiB only | `core/upload/support/content-hash.util.ts:17` |
| **UP-43** | Storage key extension still taken unsanitized from `file.name.split('.').pop()` | `core/upload/support/upload-file-persist.util.ts:83-84` |
| **UP-44** | `Number('180000')` literal wrapper unchanged | `core/upload/pipelines/new/upload-new-pipeline.service.ts:63` |
| **UP-45** | Storage gets `resolveMimeType(file)`, the DB row gets raw `file.type` | `core/upload/support/upload-file-persist.util.ts:122` vs `:179` |
| **UP-46** | `image/tiff` is bucket-only with no extension mapping; `application/csv` is in the allow-set but `.csv` maps to `text/csv` | `core/upload/support/upload-file-types.ts:27`; `core/upload/support/upload.service.util.ts:61-62` |
| **UP-47** | **Worse than recorded: six private haversine copies, not four** — the upload layer added two exported ones | `core/upload/location/upload-location-precedence.helpers.ts:41`; `core/upload/location/upload-location-resolution.helpers.ts:353` |

---

## 4. Partially fixed

| ID | Done | Remaining |
| --- | --- | --- |
| **UP-31** | `upload-batch-project-tray.helpers.spec.ts` deleted with the dead code; `upload-location-tray-producer.adapter.spec.ts` added with real tests | The tray **component** spec still drives a hand-written mock orchestrator fixture (`UPLOAD_RESOLVER_TRAY_MOCK_ORCHESTRATOR_ITEMS`), so it asserts against the mock's shape rather than the orchestrator's |
| **UP-38** | `upload-panel.md` (157), `upload-manager-pipeline.md` (176) and `upload-manager.md` (161) are all under the 180-line error cap | `media-item-upload-overlay.md` is **253 lines — 73 over the cap** |

---

## 5. Two structural notes

**The `it.fails` convention now encodes known violations.** `upload-panel-menu-action-router.service.spec.ts:131-167` uses `it.fails` to document that resolution actions in the Issues lane must not switch the lane, while production still does (UP-12). This is a good pattern — the intent is executable and pinned — but it means the suite passing does **not** mean the spec is satisfied. Anyone reading a green run needs to know the expected-fail count (currently 2 in upload scope) and what each one pins.

**Search geometry is leaking into upload.** Beyond the six haversine copies, `core/upload/location/upload-location-tray-producer.adapter.ts:15` imports `haversineMeters` directly from `features/…/search/search-bar-helpers.ts` — a UI-layer helper imported by a core adapter, crossing the layering the adapter pattern exists to protect.
