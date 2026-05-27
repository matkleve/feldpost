# Upload resolver tray orchestrator

Presentation bundles for the upload address resolver tray (conversational UX).

**Spec:** [upload-resolver-tray-orchestrator.md](../../../docs/specs/service/media-upload-service/upload-resolver-tray-orchestrator.md)

| File | Role |
| --- | --- |
| `upload-resolver-tray-orchestrator.service.ts` | FSM: collecting → presenting → flush |
| `upload-resolver-tray-orchestrator.types.ts` | Items, bundles, events |
| `upload-resolver-tray-orchestrator.helpers.ts` | Status, carousel label |
| `adapters/upload-location-tray-producer.adapter.ts` | Maps `UploadLocationResolutionService` groups → `enqueueItem` |

**Wiring:** `UploadLocationResolutionService.registerDisambiguationGroup` → `syncGroupToOrchestrator`; `UploadManagerService.classifyBatch` → `notifyScanIdle`.
