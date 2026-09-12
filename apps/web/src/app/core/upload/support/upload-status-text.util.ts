/**
 * upload-status-text — the single source of user-facing upload status text.
 *
 * Every status string a user reads comes from here, resolved through i18n
 * keys. Before UP-29 the text lived in three places: a phase map in the
 * upload panel, `job.statusLabel` (raw English written by the pipeline), and
 * `job.error` (raw English, or whatever text Supabase/the network produced).
 * The latter two were rendered verbatim, so a German or Italian user saw
 * English — and, on failure, often a raw technical message.
 *
 * `job.statusLabel` stays as an internal diagnostic: it is what the pipeline
 * last wrote, useful in devtools and event payloads, and it is never
 * displayed. Anything user-visible goes through `resolveUploadStatusText`.
 *
 * @see docs/audits/upload-flow-review-2026-09-10/06-improvement-plan.md item 10 (UP-29)
 */

import type { UploadJob, UploadPhase } from '../upload-manager.types';
import type { UploadJobIssueKind } from '../upload-manager.types';

/** Translation lookup, matching the shape components already pass around. */
export type TranslateFn = (key: string, fallback: string) => string;

/**
 * Identifies a failure whose cause is known at the point it is raised, so it
 * can be translated. Failures carrying runtime text (a Supabase message, a
 * thrown Error) have no key — they fall back to the generic translated
 * "Upload failed", and the raw text stays in `job.error` for diagnostics
 * rather than being shown as the status.
 */
export type UploadErrorKey =
  | 'target_row_unresolved'
  | 'existing_row_missing'
  | 'replace_requires_photo'
  | 'storage_upload_failed';

const ERROR_TEXT: Record<UploadErrorKey, readonly [string, string]> = {
  target_row_unresolved: ['upload.error.targetRowUnresolved', 'Could not find the target file'],
  existing_row_missing: ['upload.error.existingRowMissing', 'Could not find the existing file'],
  replace_requires_photo: ['upload.error.replaceRequiresPhoto', 'Only photos can replace a photo'],
  storage_upload_failed: ['upload.error.storageUploadFailed', 'File could not be stored'],
};

const PHASE_TEXT: Partial<Record<UploadPhase, readonly [string, string]>> = {
  queued: ['upload.status.queued', 'Queued'],
  validating: ['upload.status.validating', 'Validating...'],
  parsing_exif: ['upload.status.parsingExif', 'Reading metadata...'],
  converting_format: ['upload.status.convertingFormat', 'Converting format...'],
  extracting_title: ['upload.status.extractingTitle', 'Checking filename...'],
  resolving_location: ['upload.status.resolvingLocation', 'Resolving location...'],
  awaiting_disambiguation: ['upload.status.chooseAddress', 'Choose address'],
  hashing: ['upload.status.hashing', 'Computing hash...'],
  dedup_check: ['upload.status.dedupCheck', 'Checking duplicates...'],
  conflict_check: ['upload.status.conflictCheck', 'Checking conflicts...'],
  awaiting_conflict_resolution: [
    'upload.status.awaitingConflictResolution',
    'Waiting for decision...',
  ],
  uploading: ['upload.status.uploading', 'Uploading...'],
  saving_record: ['upload.status.savingRecord', 'Saving...'],
  replacing_record: ['upload.status.replacingRecord', 'Updating record...'],
  resolving_address: ['upload.status.resolvingAddress', 'Resolving address...'],
  resolving_coordinates: ['upload.status.resolvingCoordinates', 'Resolving location...'],
};

/** Translated text for a known failure, or null when the job has no keyed error. */
export function resolveUploadErrorText(job: UploadJob, t: TranslateFn): string | null {
  const entry = job.errorKey ? ERROR_TEXT[job.errorKey] : undefined;
  return entry ? t(entry[0], entry[1]) : null;
}

/**
 * User-facing status text for a job, always translated.
 *
 * `issueKind` is passed in rather than derived so this stays free of the
 * phase-inference the pipeline owns (P6b/UP-07 made `job.issueKind`
 * authoritative; this must not grow a second inference path).
 */
export function resolveUploadStatusText(
  job: UploadJob,
  t: TranslateFn,
  issueKind: UploadJobIssueKind | null,
): string {
  if (job.phase === 'missing_data') {
    if (issueKind === 'duplicate_file') {
      return t('upload.status.missingData.duplicate', 'File already in workspace');
    }
    if (issueKind === 'document_unresolved') {
      return t('upload.status.missingData.document', 'Choose location or project');
    }
    return t('upload.status.missingData.gps', 'Choose location');
  }

  if (job.phase === 'error') {
    return resolveUploadErrorText(job, t) ?? t('upload.status.error', 'Upload failed');
  }

  if (job.phase === 'complete') return t('upload.status.complete', 'Uploaded');

  if (job.phase === 'skipped') {
    if (issueKind === 'duplicate_file') {
      return t('upload.status.skipped.duplicate', 'Already uploaded');
    }
    return t('upload.status.skipped', 'Skipped');
  }

  const mapped = PHASE_TEXT[job.phase];
  // Every UploadPhase is covered above or in PHASE_TEXT; this guards a phase
  // added later without a matching entry, so it degrades to a translated
  // generic rather than leaking the pipeline's raw English statusLabel.
  return mapped ? t(mapped[0], mapped[1]) : t('upload.status.working', 'Working...');
}

/** Translated label for the phase alone, for surfaces without a full job. */
export function resolveUploadPhaseText(phase: UploadPhase, t: TranslateFn): string {
  const mapped = PHASE_TEXT[phase];
  return mapped ? t(mapped[0], mapped[1]) : t('upload.status.working', 'Working...');
}
