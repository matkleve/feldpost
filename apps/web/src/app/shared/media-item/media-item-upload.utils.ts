import type { UploadOverlayState } from '../../core/media/media-renderer.types';
import type { UploadJob, UploadPhase } from '../../core/upload/upload-manager.service';
import type { ImageRecord } from '../map/workspace-pane/media-detail-view.types';

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
  item: ImageRecord | null,
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
    label: activeJob.statusLabel,
    phase: activeJob.phase,
  };
}

function matchesMediaItemJob(job: UploadJob, item: ImageRecord): boolean {
  if (job.targetImageId === item.id || job.imageId === item.id || job.existingImageId === item.id) {
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
