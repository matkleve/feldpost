import type { ChipVariant } from '../../shared/components/chip/chip.component';
import type { FileTypeDefinition } from './media-renderer.types';

/**
 * Maps a resolved file-type definition to the shared `app-chip` variant.
 * PDF uses `filetype-pdf` (red); other documents use `filetype-document` (blue).
 * @see docs/specs/component/media/file-type-chips.md
 */
export function chipVariantForFileType(
  definition: Pick<FileTypeDefinition, 'id' | 'category'>,
): ChipVariant {
  if (definition.id === 'pdf') {
    return 'filetype-pdf';
  }

  switch (definition.category) {
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
