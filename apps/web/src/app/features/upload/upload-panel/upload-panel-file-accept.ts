import { DEFAULT_FILE_TYPE_EXTENSIONS } from './upload-panel.constants';
import type { UploadFileTypeGroup } from './upload-panel-file-type-groups';

/** Per-extension accept tokens for the upload panel intake list (not full registry). */
const EXTENSION_ACCEPT_PARTS: Readonly<Record<string, readonly string[]>> = {
  jpg: ['.jpg', '.jpeg', 'image/jpeg'],
  png: ['.png', 'image/png'],
  heic: ['.heic', 'image/heic'],
  webp: ['.webp', 'image/webp'],
  mp4: ['.mp4', 'video/mp4'],
  mov: ['.mov', 'video/quicktime'],
  webm: ['.webm', 'video/webm'],
  pdf: ['.pdf', 'application/pdf'],
  docx: ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  odt: ['.odt', 'application/vnd.oasis.opendocument.text'],
  odg: ['.odg', 'application/vnd.oasis.opendocument.graphics'],
  txt: ['.txt', 'text/plain'],
  xlsx: ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ods: ['.ods', 'application/vnd.oasis.opendocument.spreadsheet'],
  csv: ['.csv', 'text/csv', 'application/csv'],
  pptx: ['.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  odp: ['.odp', 'application/vnd.oasis.opendocument.presentation'],
};

/** Default accept for the upload panel file input (all supported intake extensions). */
export const DEFAULT_UPLOAD_FILE_INPUT_ACCEPT = buildUploadFileInputAccept(
  DEFAULT_FILE_TYPE_EXTENSIONS,
);

/** Builds a comma-separated `accept` attribute value for the given extensions. */
export function buildUploadFileInputAccept(extensions: readonly string[]): string {
  const parts = new Set<string>();

  for (const raw of extensions) {
    const ext = raw.trim().toLowerCase().replace(/^\./, '');
    const tokens = EXTENSION_ACCEPT_PARTS[ext];
    if (tokens) {
      for (const token of tokens) {
        parts.add(token);
      }
    } else if (ext.length > 0) {
      parts.add(`.${ext}`);
    }
  }

  return [...parts].join(',');
}

/** Accept string for all members of a file-type group chip. */
export function acceptForUploadFileTypeGroup(group: UploadFileTypeGroup): string {
  return buildUploadFileInputAccept(group.members.map((member) => member.extension));
}
