/**
 * UploadPanelConstants — UI configuration and static data for upload panel.
 * Extracted to reduce component file size and improve testability.
 */

import type { ChipVariant } from '../../../shared/components/chip/chip.component';
import type { UploadLane } from '../upload-phase.helpers';

export type UploadFileTypeChip = {
  /** Canonical extension without dot (e.g. `jpg`). */
  extension: string;
  type: string;
  icon: string;
  variant: ChipVariant;
  order: number;
  /** Hover / screen-reader description (not the short badge label). */
  descriptionKey: string;
  descriptionFallback: string;
};

export const UPLOAD_LANES: ReadonlyArray<UploadLane> = ['uploading', 'uploaded', 'issues'];

export const DEFAULT_FILE_TYPE_EXTENSIONS: ReadonlyArray<string> = [
  'jpg',
  'png',
  'heic',
  'webp',
  'mp4',
  'mov',
  'webm',
  'pdf',
  'docx',
  'odt',
  'odg',
  'txt',
  'xlsx',
  'ods',
  'csv',
  'pptx',
  'odp',
];

