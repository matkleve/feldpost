# UploadLocationTrayProducerAdapter

> **Parent:** [upload-resolver-tray-orchestrator.md](../upload-resolver-tray-orchestrator.md)
> **Implemented:** `apps/web/src/app/core/upload-resolver-tray-orchestrator/adapters/upload-location-tray-producer.adapter.ts` (349 LOC)

## Purpose

The single bridge between `UploadLocationResolutionService`'s disambiguation groups and the
generic `UploadResolverTrayOrchestratorService`. It is a **producer** in the orchestrator's
producer/consumer model (`producerId: 'upload-location-resolution'`): it turns a
`UploadDisambiguationGroup` into a tray item the orchestrator can present, and turns the
orchestrator's resolution event back into the location-specific action (candidate apply, city
confirm, house selection, containment choice, or defer).

## Facade API

| Method | Returns | Notes |
| --- | --- | --- |
| `syncGroupToOrchestrator(group)` | `string` (item id, or `''` if the group has no options) | Enqueues a new tray item for the group unless one already exists for its `(group.id, trayStep)` key — idempotent per step |
| `enqueueHouseStepItem(group, dependsOnItemId)` | `string` (item id) | Enqueues the 1B house-step item as a dependant of the 1A item that produced it; called internally after a city (1A) answer resolves into a 1B step, not by any external caller today |
| `removeGroupMapping(groupId)` | `void` | Clears the item-id and dialogue-unit-id maps for a group. **Dead export** — grep finds zero callers anywhere in `apps/web/src`; internal cleanup goes through the private `clearGroupMappings` instead. |
| `notifyScanIdle(batchId)` | `void` | Forwards to `UploadResolverTrayOrchestratorService.notifyScanIdle` |

## Event handling (constructor)

Subscribes to `orchestrator.itemResolved$` for events carrying `producerId === PRODUCER_ID` and
routes by the resolved group's shape, in this order:

1. **Skipped** → `resolution.deferGroup(groupId)`.
2. **`containmentKind === 'containment_check'`** → `resolution.applyContainmentCheckChoice(groupId, optionId)`.
3. **Tray step `1b`** → `resolution.applyTrayHouseSelection(groupId, optionId)`.
4. **Tray step `1a` / `disambiguationKind: 'city_step'`** → `resolution.confirmTrayCity(groupId, city)`,
   then enqueues the 1B step via `enqueueHouseStepItem` if the group advanced to `trayStep: '1b'`.
5. **Otherwise** (the default single-step case — `source`, `geocode`, `layer_package`,
   `admin_level_conflict`) → resolves the first `jobId` on the item through
   `UploadManagerService.selectAddressCandidate(jobId, candidate)`, applying the chosen candidate
   to the whole disambiguation group (per the Tray Continue gate contract in
   `upload-manager-pipeline.location-routing.supplement.md` § Tray Continue gate).

Every branch except the default one calls `clearGroupMappings(groupId)` once its group is fully
resolved, so a later re-registration of the same group starts clean.

## Question and option mapping

`groupToEnqueueInput` builds the orchestrator's `EnqueueTrayItemInput`:

- **Question key** (`questionKeyForGroup`) is chosen from `disambiguationKind`/`trayStep`, and for
  the 1A city step also from `discriminatingField` (`municipality`/`district`/`state`/`postcode`/
  default `city`). The i18n key taxonomy itself is normative in
  [upload-resolver-tray.question-copy.md](../../../component/upload/upload-resolver-tray.question-copy.md) —
  this adapter only selects among those keys, it does not define them.
- **Options** (`resolveOptions`/`candidatesToOptions`) branch on `disambiguationKind === 'source'`
  (text/EXIF pin options), the 1A city step (candidates deduped by the discriminating field, capped
  at 5, falling back to `citySuggestions` when there are no ranked candidates), and the default case
  (one option per candidate).
- `dialogueUnitId` is stable per disambiguation group (1A and 1B share one, via
  `dialogueUnitIdForGroup`), so the orchestrator can present them as one continuous conversation.

## Consumers

| Consumer | When |
| --- | --- |
| `UploadLocationDisambiguationRegistrationService` (`core/upload/location/upload-location-disambiguation-registration.service.ts:127`) | Calls `syncGroupToOrchestrator` whenever a disambiguation group is registered/updated |
| `UploadShellComponent` (`features/upload/upload-shell/upload-shell.component.ts`) | Injects the adapter (no direct method calls) purely to force instantiation, so its constructor's `itemResolved$` subscription is live for the lifetime of the upload shell |
| `UploadPreResolveWaveService` (`core/upload/support/upload-pre-resolve-wave.service.ts:42,64`) | Calls `notifyScanIdle` after a batch's pre-resolve wave completes |

## Acceptance criteria

- [x] `syncGroupToOrchestrator` never enqueues a duplicate item for the same `(groupId, trayStep)`.
- [x] Every `itemResolved$` event for this producer's items maps to exactly one resolution service
      call, or a defer.
- [ ] `removeGroupMapping` is either wired to a real caller or deleted — currently dead code (see
      `docs/audits/upload-process-analysis-2026-09-08/06-health.md` § 5.3 dead-exports list, which
      predates this spec and does not yet include it).
