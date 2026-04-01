/**
 * upload-panel-item-helpers — extracted text/icon logic from component.
 * Pure functions for status labels, action labels, and action icons.
 * Reduces component file size and improves testability.
 */

import type { UploadJob } from '../../core/upload/upload-manager.service';
import type { UploadItemMenuAction } from './upload-panel-item.component';
import { getBoundProjectIds } from './upload-panel-project-bindings.util';
import { getIssueKind } from './upload-phase.helpers';

const STATUS_TEXT_MAP: Record<string, [string, string]> = {
  queued: ['upload.status.queued', 'Queued'],
  validating: ['upload.status.validating', 'Validating...'],
  parsing_exif: ['upload.status.parsingExif', 'Reading metadata...'],
  converting_format: ['upload.status.convertingFormat', 'Converting format...'],
  extracting_title: ['upload.status.extractingTitle', 'Checking filename...'],
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

const STATIC_ACTION_LABELS: Partial<Record<UploadItemMenuAction, [string, string]>> = {
  view_file_details: ['upload.item.menu.uploading.viewFileDetails', 'View file details'],
  open_in_media: ['upload.item.menu.openInMedia', 'Open in /media'],
  open_existing_media: ['upload.item.menu.issue.openExisting', 'Open existing media'],
  upload_anyway: ['upload.item.menu.issue.uploadAnyway', 'Upload anyway'],
  open_project: ['upload.item.menu.project.open', 'Open project'],
  assign_to_project: ['auto.0013.add_to_project', 'Add to project'],
  retry: ['projects.page.error.retry', 'Retry'],
  cancel_upload: ['upload.item.menu.destructive.cancelUpload', 'Cancel upload'],
  delete_media: ['workspace.imageDetail.action.delete', 'Delete media'],
  candidate_select: ['upload.address.prompt.action.selectCandidate', 'Select suggested address'],
  manual_location_entry: ['upload.item.menu.location.enterAddress', 'Enter address manually'],
  cancel_location_prompt: ['upload.address.prompt.action.cancel', 'Cancel location prompt'],
  dismiss: ['upload.item.menu.destructive.dismiss', 'Dismiss'],
  download: ['auto.0099.download', 'Download'],
};

const ACTION_ICON_MAP: Record<UploadItemMenuAction, string> = {
  view_file_details: 'open_in_new',
  assign_to_project: 'folder_open',
  download: 'download',
  open_in_media: 'open_in_new',
  open_project: 'folder_open',
  toggle_priority: 'priority_high',
  open_existing_media: 'open_in_new',
  upload_anyway: 'publish',
  retry: 'refresh',
  change_location_map: 'pin_drop',
  change_location_address: 'search',
  candidate_select: 'check_circle',
  manual_location_entry: 'edit_location_alt',
  cancel_location_prompt: 'close',
  cancel_upload: 'delete',
  remove_from_project: 'delete',
  delete_media: 'delete',
  dismiss: 'close',
};

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

  if (job.phase === 'error') return t('upload.status.error', 'Upload failed');
  if (job.phase === 'complete') return t('upload.status.complete', 'Uploaded');

  if (job.phase === 'skipped') {
    if (issueKind === 'duplicate_photo') {
      return t('upload.status.skipped.duplicate', 'Already uploaded');
    }
    return t('upload.status.skipped', 'Skipped');
  }

  const mappedStatus = STATUS_TEXT_MAP[job.phase];
  if (mappedStatus) {
    return t(mappedStatus[0], mappedStatus[1]);
  }

  return job.statusLabel;
}

export function actionLabel(
  action: UploadItemMenuAction,
  job: UploadJob,
  prioritized: boolean,
  t: (key: string, fallback: string) => string,
): string {
  const boundProjectCount = getBoundProjectIds(job).length;
  const staticLabel = STATIC_ACTION_LABELS[action];
  if (staticLabel) {
    return t(staticLabel[0], staticLabel[1]);
  }

  switch (action) {
    case 'toggle_priority':
      return prioritized
        ? t('upload.item.menu.priority.remove', 'Remove priority')
        : t('upload.item.menu.priority.add', 'Prioritize');
    case 'change_location_map':
      return job.coords
        ? t('upload.item.menu.location.changeGps', 'Change GPS location')
        : t('upload.item.menu.location.addGps', 'Add GPS location');
    case 'change_location_address':
      return job.titleAddress
        ? t('upload.item.menu.location.changeAddress', 'Change address')
        : t('upload.item.menu.location.addAddress', 'Add address');
    case 'remove_from_project':
      return boundProjectCount > 1
        ? t('upload.item.menu.destructive.removeFromProjects', 'Remove from projects')
        : t('upload.item.menu.destructive.removeFromProject', 'Remove from project');
    default:
      return t('auto.0099.download', 'Download');
  }
}

export function actionIcon(action: UploadItemMenuAction): string {
  return ACTION_ICON_MAP[action];
}
