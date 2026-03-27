/**
 * UploadPanelUtils — file type mapping and utility functions.
 */

import { type UploadJob, type UploadPhase } from '../../core/upload/upload-manager.service';
import { phaseToStatusClass as mapPhaseToStatusClass } from './upload-phase.helpers';
import { fileTypeBadge } from '../../core/media/file-type-registry';

export function documentFallbackLabel(job: UploadJob): string | null {
  return fileTypeBadge({
    mimeType: job.file.type,
    fileName: job.file.name,
  });
}

export function phaseToStatusClass(phase: UploadPhase): string {
  return mapPhaseToStatusClass(phase);
}

export function trackByJobId(_idx: number, job: UploadJob): string {
  return job.id;
}
