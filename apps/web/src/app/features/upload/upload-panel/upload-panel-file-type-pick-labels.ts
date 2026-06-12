import type { UploadFileTypeGroup } from './upload-panel-file-type-groups';
import { fileTypeDescriptionForExtension } from './upload-panel-file-type-descriptions';
import type { UploadFileTypeChip } from './upload-panel.constants';

const GROUP_PICK_LABELS: Readonly<
  Record<
    UploadFileTypeGroup['id'],
    { pickKey: string; pickFallback: string }
  >
> = {
  images: {
    pickKey: 'upload.fileTypeChip.pickGroup.images',
    pickFallback: 'Images — select image files',
  },
  video: {
    pickKey: 'upload.fileTypeChip.pickGroup.video',
    pickFallback: 'Video — select video files',
  },
  pdf: {
    pickKey: 'upload.fileTypeChip.pickGroup.pdf',
    pickFallback: 'PDF — select PDF files',
  },
  documents: {
    pickKey: 'upload.fileTypeChip.pickGroup.documents',
    pickFallback: 'Documents — select document files',
  },
  spreadsheets: {
    pickKey: 'upload.fileTypeChip.pickGroup.spreadsheets',
    pickFallback: 'Spreadsheets — select spreadsheet files',
  },
  presentations: {
    pickKey: 'upload.fileTypeChip.pickGroup.presentations',
    pickFallback: 'Presentations — select presentation files',
  },
};

const EXTENSION_PICK_LABELS: Readonly<Record<string, { pickKey: string; pickFallback: string }>> = {
  jpg: {
    pickKey: 'upload.fileTypeChip.pickExtension.jpg',
    pickFallback: 'JPEG photos — select JPEG files',
  },
  png: {
    pickKey: 'upload.fileTypeChip.pickExtension.png',
    pickFallback: 'Raster image files — select PNG files',
  },
  heic: {
    pickKey: 'upload.fileTypeChip.pickExtension.heic',
    pickFallback: 'HEIC photos — select HEIC files',
  },
  webp: {
    pickKey: 'upload.fileTypeChip.pickExtension.webp',
    pickFallback: 'WebP images — select WebP files',
  },
  mp4: {
    pickKey: 'upload.fileTypeChip.pickExtension.mp4',
    pickFallback: 'MP4 video files — select MP4 files',
  },
  mov: {
    pickKey: 'upload.fileTypeChip.pickExtension.mov',
    pickFallback: 'QuickTime video files — select MOV files',
  },
  webm: {
    pickKey: 'upload.fileTypeChip.pickExtension.webm',
    pickFallback: 'WebM video files — select WebM files',
  },
  pdf: {
    pickKey: 'upload.fileTypeChip.pickExtension.pdf',
    pickFallback: 'PDF documents — select PDF files',
  },
  docx: {
    pickKey: 'upload.fileTypeChip.pickExtension.docx',
    pickFallback: 'Microsoft Word documents — select DOCX files',
  },
  odt: {
    pickKey: 'upload.fileTypeChip.pickExtension.odt',
    pickFallback: 'OpenDocument text files — select ODT files',
  },
  odg: {
    pickKey: 'upload.fileTypeChip.pickExtension.odg',
    pickFallback: 'OpenDocument drawing files — select ODG files',
  },
  txt: {
    pickKey: 'upload.fileTypeChip.pickExtension.txt',
    pickFallback: 'Plain text files — select TXT files',
  },
  xlsx: {
    pickKey: 'upload.fileTypeChip.pickExtension.xlsx',
    pickFallback: 'Excel spreadsheet files — select XLSX files',
  },
  ods: {
    pickKey: 'upload.fileTypeChip.pickExtension.ods',
    pickFallback: 'OpenDocument spreadsheet files — select ODS files',
  },
  csv: {
    pickKey: 'upload.fileTypeChip.pickExtension.csv',
    pickFallback: 'Comma-separated data files — select CSV files',
  },
  pptx: {
    pickKey: 'upload.fileTypeChip.pickExtension.pptx',
    pickFallback: 'PowerPoint presentation files — select PPTX files',
  },
  odp: {
    pickKey: 'upload.fileTypeChip.pickExtension.odp',
    pickFallback: 'OpenDocument presentation files — select ODP files',
  },
};

export function fileTypeGroupPickAriaLabel(
  group: UploadFileTypeGroup,
  t: (key: string, fallback: string) => string,
): string {
  const pick = GROUP_PICK_LABELS[group.id];
  if (pick) {
    return t(pick.pickKey, pick.pickFallback);
  }
  return t(group.descriptionKey, group.descriptionFallback);
}

export function fileTypeMemberPickAriaLabel(
  member: UploadFileTypeChip,
  t: (key: string, fallback: string) => string,
): string {
  const pick = EXTENSION_PICK_LABELS[member.extension];
  if (pick) {
    return t(pick.pickKey, pick.pickFallback);
  }
  const description = fileTypeDescriptionForExtension(member.extension);
  return t(description.descriptionKey, description.descriptionFallback);
}
