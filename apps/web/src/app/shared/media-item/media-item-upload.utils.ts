import type { UploadOverlayState } from '../../core/media/media-renderer.types';
import type { UploadJob, UploadPhase } from '../../core/upload/upload-manager.service';
import type { MediaRecord } from '../../core/media-query/media-query.types';
import { resolveUploadPhaseText } from '../../core/upload/support/upload-status-text.util';
import type { TranslateFn } from '../../core/upload/support/upload-status-text.util';

export function isMediaItemUploadOverlayPhase(phase: UploadPhase): boolean {
  return (
    phase === 'queued' ||
    phase === 'validating' ||
    phase === 'parsing_exif' ||
    phase === 'converting_format' ||
    phase === 'hashing' ||
    phase === 'dedup_check' ||
    phase === 'extracting_title' ||
    phase === 'conflict_check' ||
    phase === 'uploading' ||
    phase === 'saving_record' ||
    phase === 'replacing_record' ||
    phase === 'resolving_address' ||
    phase === 'resolving_coordinates'
  );
}

export function resolveMediaItemUploadOverlay(
  jobs: ReadonlyArray<UploadJob>,
  item: MediaRecord | null,
  t: TranslateFn,
): UploadOverlayState | null {
  if (!item) {
    return null;
  }

  const activeJob = jobs.find((job) => matchesMediaItemJob(job, item));
  if (!activeJob || !isMediaItemUploadOverlayPhase(activeJob.phase)) {
    return null;
  }

  return {
    progress: activeJob.progress,
    // Not activeJob.statusLabel: that is the pipeline's internal English text
    // and was reaching the overlay untranslated (UP-29).
    label: resolveUploadPhaseText(activeJob.phase, t),
    phase: activeJob.phase,
  };
}

function matchesMediaItemJob(job: UploadJob, item: MediaRecord): boolean {
  if (job.targetMediaId === item.id || job.mediaId === item.id || job.existingMediaId === item.id) {
    return true;
  }

  const itemLat = item.latitude ?? item.exif_latitude;
  const itemLng = item.longitude ?? item.exif_longitude;
  const jobLat = job.coords?.lat;
  const jobLng = job.coords?.lng;

  if (
    !Number.isFinite(itemLat) ||
    !Number.isFinite(itemLng) ||
    !Number.isFinite(jobLat) ||
    !Number.isFinite(jobLng)
  ) {
    return false;
  }

  return (
    Math.abs((itemLat as number) - (jobLat as number)) <= 0.000001 &&
    Math.abs((itemLng as number) - (jobLng as number)) <= 0.000001
  );
}
