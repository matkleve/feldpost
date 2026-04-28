import type { UploadJob, UploadPhase } from '../../core/upload/upload-manager.service';

/**
 * Lane / issue-kind helpers for upload panel presentation.
 *
 * @see docs/specs/ui/upload/upload-panel-system.md — UI lane FSM vs `UploadPhase` in media-upload-service specs.
 * @see docs/specs/service/media-upload-service/upload-manager.md — normative job phases and events.
 */
export type UploadLane = 'uploading' | 'uploaded' | 'issues';
export type UploadIssueKind =
  | 'duplicate_photo'
  | 'missing_gps'
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

export function getIssueKind(job: UploadJob): UploadIssueKind {
  if (job.issueKind) {
    return job.issueKind;
  }

  const statusText = (job.statusLabel ?? '').toLowerCase();
  const looksLikeDocumentUnresolved =
    statusText.includes('choose location or project') ||
    statusText.includes('standort oder projekt') ||
    statusText.includes('waehle standort oder projekt');
  const looksLikeLocationIssue =
    statusText.includes('choose location') ||
    statusText.includes('missing location') ||
    statusText.includes('standort fehlt') ||
    statusText.includes('gps fehlt');

  if (looksLikeDocumentUnresolved) {
    return 'document_unresolved';
  }

  if (job.phase === 'missing_data' && (job.addressCandidates?.length ?? 0) > 0) {
    return 'address_ambiguous';
  }

  if (job.phase === 'missing_data' || looksLikeLocationIssue) {
    return 'missing_gps';
  }

  if (job.phase === 'awaiting_conflict_resolution') {
    return 'conflict_review';
  }

  if (job.phase === 'error') {
    return 'upload_error';
  }

  if (job.phase === 'skipped' && !!job.existingImageId) {
    return 'duplicate_photo';
  }

  return null;
}
