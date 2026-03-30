/**
 * UploadPanelConstants — UI configuration and static data for upload panel.
 * Extracted to reduce component file size and improve testability.
 */

import type { ChipVariant } from '../../shared/components/chip/chip.component';
import { fileTypeBadge, resolveFileType } from '../../core/media/file-type-registry';
import type { UploadLane } from './upload-phase.helpers';

export type UploadFileTypeChip = {
  type: string;
  icon: string;
  variant: ChipVariant;
  order: number;
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

export const DEFAULT_FILE_TYPE_CHIPS: ReadonlyArray<UploadFileTypeChip> =
  DEFAULT_FILE_TYPE_EXTENSIONS.map((ext, index) => {
    const definition = resolveFileType({ extension: ext });
    return {
      type: fileTypeBadge({ extension: ext }) ?? ext.toUpperCase(),
      icon: definition.category === 'unknown' ? 'description' : definition.icon,
      variant: toChipVariant(definition.category),
      order: index + 1,
    };
  });

function toChipVariant(category: string): ChipVariant {
  switch (category) {
    case 'image':
      return 'filetype-image';
    case 'video':
      return 'filetype-video';
    case 'spreadsheet':
      return 'filetype-spreadsheet';
    case 'presentation':
      return 'filetype-presentation';
    case 'document':
      return 'filetype-document';
    default:
      return 'default';
  }
}
