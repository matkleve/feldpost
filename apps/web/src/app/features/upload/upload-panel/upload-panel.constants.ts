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

export const UPLOAD_LANES: ReadonlyArray<UploadLane> = ['uploading', 'clarifications', 'uploaded'];

/**
 * Panel width at which the grid-shell upload surface becomes two columns.
 * Left: intake. Right: lane switch stacked top-to-bottom, beside the selected lane.
 * Matches 42rem in upload-panel.component.scss (`:host.upload-panel-host--grid`).
 */
export const UPLOAD_PANEL_WIDE_MIN_PX = 672;

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

