/**
 * upload-panel-item-helpers — extracted text/icon logic from component.
 * Pure functions for status labels, action labels, and action icons.
 * Reduces component file size and improves testability.
 */

import type { UploadJob } from '../../core/upload/upload-manager.service';
import type { UploadItemMenuAction } from './upload-panel-item.component';
import { getIssueKind } from './upload-phase.helpers';

export function statusLabelText(
  job: UploadJob,
  t: (key: string, fallback: string) => string,
): string {
  if (job.error) {
    return job.error;
  }

  const issueKind = getIssueKind(job);
  if (job.phase === 'missing_data') {
    if (issueKind === 'document_unresolved') {
      return t('upload.status.missingData.document', 'Choose location or project');
    }
    return t('upload.status.missingData.gps', 'Choose location');
  }

  if (job.phase === 'error') {
    return t('upload.status.error', 'Upload failed');
  }

  if (job.phase === 'complete') {
    return t('upload.status.complete', 'Uploaded');
  }

  if (job.phase === 'skipped') {
    if (issueKind === 'duplicate_photo') {
      return t('upload.status.skipped.duplicate', 'Already uploaded');
    }
    return t('upload.status.skipped', 'Skipped');
  }

  if (job.phase === 'queued') {
    return t('upload.status.queued', 'Queued');
  }

  if (job.phase === 'validating') {
    return t('upload.status.validating', 'Validating...');
  }

  if (job.phase === 'parsing_exif') {
    return t('upload.status.parsingExif', 'Reading metadata...');
  }

  if (job.phase === 'converting_format') {
    return t('upload.status.convertingFormat', 'Converting format...');
  }

  if (job.phase === 'extracting_title') {
    return t('upload.status.extractingTitle', 'Checking filename...');
  }

  if (job.phase === 'hashing') {
    return t('upload.status.hashing', 'Computing hash...');
  }

  if (job.phase === 'dedup_check') {
    return t('upload.status.dedupCheck', 'Checking duplicates...');
  }

  if (job.phase === 'conflict_check') {
    return t('upload.status.conflictCheck', 'Checking conflicts...');
  }

  if (job.phase === 'awaiting_conflict_resolution') {
    return t('upload.status.awaitingConflictResolution', 'Waiting for decision...');
  }

  if (job.phase === 'uploading') {
    return t('upload.status.uploading', 'Uploading...');
  }

  if (job.phase === 'saving_record') {
    return t('upload.status.savingRecord', 'Saving...');
  }

  if (job.phase === 'replacing_record') {
    return t('upload.status.replacingRecord', 'Updating record...');
  }

  if (job.phase === 'resolving_address') {
    return t('upload.status.resolvingAddress', 'Resolving address...');
  }

  if (job.phase === 'resolving_coordinates') {
    return t('upload.status.resolvingCoordinates', 'Resolving location...');
  }

  return job.statusLabel;
}

export function actionLabel(
  action: UploadItemMenuAction,
  job: UploadJob,
  prioritized: boolean,
  t: (key: string, fallback: string) => string,
): string {
  switch (action) {
    case 'view_progress':
      return t('upload.item.menu.uploading.viewProgress', 'View progress');
    case 'view_file_details':
      return t('upload.item.menu.uploading.viewFileDetails', 'View file details');
    case 'open_in_media':
      return t('upload.item.menu.openInMedia', 'Open in /media');
    case 'open_existing_media':
      return t('upload.item.menu.issue.openExisting', 'Open existing media');
    case 'upload_anyway':
      return t('upload.item.menu.issue.uploadAnyway', 'Upload anyway');
    case 'open_project':
      return t('upload.item.menu.project.open', 'Open project');
    case 'toggle_priority':
      return prioritized
        ? t('upload.item.menu.priority.remove', 'Remove priority')
        : t('upload.item.menu.priority.add', 'Prioritize');
    case 'add_to_project':
      return t('auto.0013.add_to_project', 'Add to project');
    case 'change_location_map':
      return job.coords
        ? t('upload.item.menu.location.changeGps', 'Change GPS location')
        : t('upload.item.menu.location.addGps', 'Add GPS location');
    case 'change_location_address':
      return job.titleAddress
        ? t('upload.item.menu.location.changeAddress', 'Change address')
        : t('upload.item.menu.location.addAddress', 'Add address');
    case 'place_on_map':
      return job.coords
        ? t('upload.item.menu.location.changeLocation', 'Change location')
        : t('upload.item.menu.location.addLocation', 'Choose location');
    case 'retry':
      return t('projects.page.error.retry', 'Retry');
    case 'cancel_upload':
      return t('upload.item.menu.destructive.cancelUpload', 'Cancel upload');
    case 'remove_from_project':
      return t('upload.item.menu.destructive.removeFromProject', 'Remove from project');
    case 'dismiss':
      return t('upload.item.menu.destructive.dismiss', 'Dismiss');
    case 'download':
    default:
      return t('auto.0099.download', 'Download');
  }
}

export function actionIcon(action: UploadItemMenuAction): string {
  switch (action) {
    case 'open_in_media':
    case 'open_existing_media':
    case 'view_file_details':
      return 'open_in_new';
    case 'upload_anyway':
      return 'publish';
    case 'open_project':
    case 'add_to_project':
      return 'folder_open';
    case 'toggle_priority':
      return 'priority_high';
    case 'change_location_map':
    case 'place_on_map':
      return 'pin_drop';
    case 'change_location_address':
      return 'search';
    case 'retry':
      return 'refresh';
    case 'view_progress':
      return 'query_stats';
    case 'cancel_upload':
    case 'remove_from_project':
    case 'dismiss':
      return 'delete';
    case 'download':
    default:
      return 'download';
  }
}
