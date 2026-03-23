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
    awaiting_conflict_resolution: 'awaiting_placement',
    uploading: 'uploading',
    saving_record: 'uploading',
    replacing_record: 'uploading',
    resolving_address: 'uploading',
    resolving_coordinates: 'uploading',
    complete: 'complete',
    skipped: 'complete',
    error: 'error',
    missing_data: 'awaiting_placement',
  };

export function phaseToStatusClass(phase: UploadPhase): string {
  return PHASE_TO_STATUS_CLASS[phase];
}

export function getLaneForJob(job: UploadJob): UploadLane {
  if (job.phase === 'complete' || job.phase === 'skipped') return 'uploaded';
  if (job.phase === 'error' || job.phase === 'missing_data') return 'issues';
  return 'uploading';
}
