/**
 * UploadPanelUtils — file type mapping and utility functions.
 */

import { type UploadJob, type UploadPhase } from '../../core/upload/upload-manager.service';
import { phaseToStatusClass as mapPhaseToStatusClass } from './upload-phase.helpers';

export function documentFallbackLabel(job: UploadJob): string | null {
  const type = job.file.type;
  if (!type) {
    const ext = fileExtension(job.file.name);
    return extensionToBadge(ext);
  }
  if (type === 'application/pdf') return 'PDF';
  if (type === 'application/msword') return 'DOC';
  if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    return 'DOCX';
  if (type === 'application/vnd.oasis.opendocument.text') return 'ODT';
  if (type === 'application/vnd.oasis.opendocument.graphics') return 'ODG';
  if (type === 'application/vnd.ms-excel') return 'XLS';
  if (type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'XLSX';
  if (type === 'application/vnd.oasis.opendocument.spreadsheet') return 'ODS';
  if (type === 'application/vnd.ms-powerpoint') return 'PPT';
  if (type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
    return 'PPTX';
  if (type === 'application/vnd.oasis.opendocument.presentation') return 'ODP';
  return null;
}

export function phaseToStatusClass(phase: UploadPhase): string {
  return mapPhaseToStatusClass(phase);
}

export function trackByJobId(_idx: number, job: UploadJob): string {
  return job.id;
}

function fileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
}

function extensionToBadge(extension: string): string | null {
  switch (extension) {
    case 'pdf':
      return 'PDF';
    case 'doc':
      return 'DOC';
    case 'docx':
      return 'DOCX';
    case 'odt':
      return 'ODT';
    case 'odg':
      return 'ODG';
    case 'xls':
      return 'XLS';
    case 'xlsx':
      return 'XLSX';
    case 'ods':
      return 'ODS';
    case 'ppt':
      return 'PPT';
    case 'pptx':
      return 'PPTX';
    case 'odp':
      return 'ODP';
    default:
      return null;
  }
}
