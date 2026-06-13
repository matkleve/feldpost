# wide-event service spec index

Code module: `apps/web/src/app/core/wide-event/`
Primary facade: `apps/web/src/app/core/wide-event/wide-event.service.ts`
Types contract: `apps/web/src/app/core/wide-event/wide-event.types.ts`
Helpers: `apps/web/src/app/core/wide-event/wide-event.helpers.ts`
Adapters: `apps/web/src/app/core/wide-event/adapters/`

## Spec files

| File | Covers |
| --- | --- |
| [`wide-event-service.md`](wide-event-service.md) | Storage (`app_events` table), event shape, service API (`start`/`set`/`end`), sampling, PII, toast integration, Phase 2 targets, example queries |

## Related specs

| Spec | Relationship |
| --- | --- |
| [`toast-authoring.supplement.md §10`](../toast/toast-authoring.supplement.md#10-wide-event-integration) | Caller-owns integration contract between wide events and error toasts |
