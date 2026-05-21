import { chipVariantForFileType } from '../../core/media/file-type-chip-variant';
import { fileTypeBadge, resolveFileType } from '../../core/media/file-type-registry';
import type { ChipVariant } from '../../shared/components/chip/chip.component';
import {
  FILE_TYPE_GROUP_DESCRIPTIONS,
  fileTypeDescriptionForExtension,
} from './upload-panel-file-type-descriptions';
import {
  DEFAULT_FILE_TYPE_EXTENSIONS,
  type UploadFileTypeChip,
} from './upload-panel.constants';

export type UploadFileTypeGroupId =
  | 'images'
  | 'video'
  | 'pdf'
  | 'documents'
  | 'spreadsheets'
  | 'presentations';

export type UploadFileTypeGroup = {
  id: UploadFileTypeGroupId;
  labelKey: string;
  labelFallback: string;
  descriptionKey: string;
  descriptionFallback: string;
  icon: string;
  variant: ChipVariant;
  order: number;
  members: ReadonlyArray<UploadFileTypeChip>;
};

const EXTENSION_TO_GROUP: Readonly<Record<string, UploadFileTypeGroupId>> = {
  jpg: 'images',
  png: 'images',
  heic: 'images',
  webp: 'images',
  mp4: 'video',
  mov: 'video',
  webm: 'video',
  pdf: 'pdf',
  docx: 'documents',
  odt: 'documents',
  odg: 'documents',
  txt: 'documents',
  xlsx: 'spreadsheets',
  ods: 'spreadsheets',
  csv: 'spreadsheets',
  pptx: 'presentations',
  odp: 'presentations',
};

const GROUP_META: Readonly<
  Record<
    UploadFileTypeGroupId,
    { labelKey: string; labelFallback: string; icon: string; variant: ChipVariant; order: number }
  >
> = {
  images: {
    labelKey: 'upload.fileTypeGroup.images',
    labelFallback: 'Images',
    icon: 'image',
    variant: 'filetype-image',
    order: 1,
  },
  video: {
    labelKey: 'upload.fileTypeGroup.video',
    labelFallback: 'Video',
    icon: 'videocam',
    variant: 'filetype-video',
    order: 2,
  },
  pdf: {
    labelKey: 'upload.fileTypeGroup.pdf',
    labelFallback: 'PDF',
    icon: 'description',
    variant: 'filetype-pdf',
    order: 3,
  },
  documents: {
    labelKey: 'upload.fileTypeGroup.documents',
    labelFallback: 'Documents',
    icon: 'description',
    variant: 'filetype-document',
    order: 4,
  },
  spreadsheets: {
    labelKey: 'upload.fileTypeGroup.spreadsheets',
    labelFallback: 'Spreadsheets',
    icon: 'table_chart',
    variant: 'filetype-spreadsheet',
    order: 5,
  },
  presentations: {
    labelKey: 'upload.fileTypeGroup.presentations',
    labelFallback: 'Presentations',
    icon: 'slideshow',
    variant: 'filetype-presentation',
    order: 6,
  },
};

function memberChipForExtension(ext: string, order: number): UploadFileTypeChip {
  const definition = resolveFileType({ extension: ext });
  const description = fileTypeDescriptionForExtension(ext);
  return {
    type: fileTypeBadge({ extension: ext }) ?? ext.toUpperCase(),
    icon: definition.category === 'unknown' ? 'description' : definition.icon,
    variant: chipVariantForFileType(definition),
    order,
    descriptionKey: description.descriptionKey,
    descriptionFallback: description.descriptionFallback,
  };
}

/** Grouped intake chips for the upload dropzone (hover expands members below). */
export function buildUploadFileTypeGroups(): ReadonlyArray<UploadFileTypeGroup> {
  const membersByGroup = new Map<UploadFileTypeGroupId, UploadFileTypeChip[]>();

  DEFAULT_FILE_TYPE_EXTENSIONS.forEach((ext, index) => {
    const groupId = EXTENSION_TO_GROUP[ext];
    if (!groupId) {
      return;
    }
    const list = membersByGroup.get(groupId) ?? [];
    list.push(memberChipForExtension(ext, index + 1));
    membersByGroup.set(groupId, list);
  });

  const groups: UploadFileTypeGroup[] = [];

  for (const id of Object.keys(GROUP_META) as UploadFileTypeGroupId[]) {
    const meta = GROUP_META[id];
    const members = membersByGroup.get(id) ?? [];
    if (members.length === 0) {
      continue;
    }
    const groupDescription = FILE_TYPE_GROUP_DESCRIPTIONS[id];
    groups.push({
      id,
      labelKey: meta.labelKey,
      labelFallback: meta.labelFallback,
      descriptionKey: groupDescription.descriptionKey,
      descriptionFallback: groupDescription.descriptionFallback,
      icon: meta.icon,
      variant: meta.variant,
      order: meta.order,
      members,
    });
  }

  return groups.sort((a, b) => a.order - b.order);
}

export const DEFAULT_FILE_TYPE_GROUPS: ReadonlyArray<UploadFileTypeGroup> =
  buildUploadFileTypeGroups();
