import type { UploadJob, UploadPhase } from '../../core/upload/upload-manager.service';

export type UploadLane = 'uploading' | 'uploaded' | 'issues';

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
  const statusText = (job.statusLabel ?? '').toLowerCase();
  const looksLikeLocationIssue =
    statusText.includes('missing location') ||
    statusText.includes('standort fehlt') ||
    statusText.includes('gps fehlt');

  if (job.phase === 'complete') return 'uploaded';
  if (
    job.phase === 'skipped' ||
    job.phase === 'error' ||
    job.phase === 'missing_data' ||
    job.phase === 'awaiting_conflict_resolution' ||
    looksLikeLocationIssue
  ) {
    return 'issues';
  }
  return 'uploading';
}
