import type { UploadJob, UploadPhase } from '../../core/upload/upload-manager.service';

/**
 * Lane / issue-kind helpers for upload panel presentation.
 *
 * @see docs/specs/ui/upload/upload-panel-system.md — UI lane FSM vs `UploadPhase` in media-upload-service specs.
 * @see docs/specs/service/media-upload-service/upload-manager.md — normative job phases and events.
 */
export type UploadLane = 'uploading' | 'uploaded' | 'issues';
export type UploadIssueKind =
  | 'duplicate_file'
  | 'missing_gps'
  | 'address_deferred'
  | 'address_ambiguous'
  | 'document_unresolved'
  | 'conflict_review'
  | 'upload_error'
  | null;

export const PHASE_TO_STATUS_CLASS: Record<UploadPhase, string> = {
  queued: 'pending',
  validating: 'parsing',
  parsing_exif: 'parsing',
  converting_format: 'parsing',
  hashing: 'parsing',
  dedup_check: 'parsing',
  extracting_title: 'parsing',
  resolving_location: 'parsing',
  awaiting_disambiguation: 'awaiting_placement',
  conflict_check: 'parsing',
  awaiting_conflict_resolution: 'issue',
  uploading: 'uploading',
  saving_record: 'uploading',
  replacing_record: 'uploading',
  resolving_address: 'uploading',
  resolving_coordinates: 'uploading',
  complete: 'complete',
  skipped: 'issue',
  error: 'error',
  missing_data: 'awaiting_placement',
};

export function phaseToStatusClass(phase: UploadPhase): string {
  return PHASE_TO_STATUS_CLASS[phase];
}

export function getLaneForJob(job: UploadJob): UploadLane {
  const issueKind = getIssueKind(job);

  if (job.phase === 'complete') return 'uploaded';
  if (issueKind !== null || job.phase === 'skipped') {
    return 'issues';
  }
  return 'uploading';
}

/**
 * `job.issueKind` is authoritative — every producer that creates an issue
 * state sets it explicitly at the point the issue is created (see the
 * writers listed in `docs/audits/upload-process-analysis-2026-09-08/
 * 04-state-machine.md` § 2–3). This function does not infer anything from
 * `job.phase` or `job.statusLabel`.
 * @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-07
 */
export function getIssueKind(job: UploadJob): UploadIssueKind {
  return job.issueKind ?? null;
}

export function isDuplicateIssueKind(issueKind: UploadIssueKind): boolean {
  return issueKind === 'duplicate_file';
}
