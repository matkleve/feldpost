import { resolveFileType } from '../media/file-type-registry';
import type { FileTypeCategory } from '../media/media-renderer.types';
import type { ProjectFileTypeCount } from './projects.types';
import type { ChipVariant } from '../../shared/components/chip/chip.component';

const PROJECT_FILE_TYPE_ORDER: readonly FileTypeCategory[] = [
  'image',
  'video',
  'document',
  'spreadsheet',
  'presentation',
  'unknown',
];

export function bumpProjectFileTypeCount(
  buckets: Map<string, Map<FileTypeCategory, number>>,
  projectId: string,
  mimeType: string | null,
): void {
  const category = resolveFileType({ mimeType }).category;
  const perProject = buckets.get(projectId) ?? new Map<FileTypeCategory, number>();
  perProject.set(category, (perProject.get(category) ?? 0) + 1);
  buckets.set(projectId, perProject);
}

export function fileTypeCountsForProject(
  buckets: Map<string, Map<FileTypeCategory, number>>,
  projectId: string,
): ProjectFileTypeCount[] {
  const perProject = buckets.get(projectId);
  if (!perProject) {
    return [];
  }

  return PROJECT_FILE_TYPE_ORDER.flatMap((category) => {
    const count = perProject.get(category) ?? 0;
    return count > 0 ? [{ category, count }] : [];
  });
}

export function fileTypeChipVariant(category: FileTypeCategory): ChipVariant {
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

export function fileTypeChipIcon(category: FileTypeCategory): string {
  return resolveFileType({ mimeType: categoryMimeHint(category) }).icon;
}

export function fileTypeCategoryLabel(category: FileTypeCategory): string {
  return resolveFileType({ mimeType: categoryMimeHint(category) }).label;
}

function categoryMimeHint(category: FileTypeCategory): string | null {
  switch (category) {
    case 'image':
      return 'image/jpeg';
    case 'video':
      return 'video/mp4';
    case 'spreadsheet':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'presentation':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'document':
      return 'application/pdf';
    default:
      return null;
  }
}
