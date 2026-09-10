/**
 * Production stand-in for upload-resolver-tray.mock-orchestrator.ts, swapped in via
 * angular.json's production fileReplacements. `mockResolverTray` can never be true
 * in a production build (see upload-dev-flags.ts), so nothing reads these exports —
 * this file exists purely so the fixture data itself, not just the seeding call, is
 * absent from the production bundle rather than merely unreachable inside it.
 * @see docs/audits/upload-process-analysis-2026-09-08/06-health.md § 4
 */
import type { EnqueueTrayItemInput } from '../../../core/upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.types';

export const MOCK_ORCHESTRATOR_BATCH_ID = 'dev-mock-batch';

export const UPLOAD_RESOLVER_TRAY_MOCK_ORCHESTRATOR_ITEMS: EnqueueTrayItemInput[] = [];

export const UPLOAD_RESOLVER_TRAY_MOCK_MEDIA_NAMES: Readonly<Record<string, string>> = {};
