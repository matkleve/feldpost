/**
 * Mime/extension allowlist mirrored from apps/web file-type-registry (word, spreadsheet, presentation, pdf).
 * Keep in sync with apps/web/src/app/core/media/file-type-registry.ts
 * @see docs/architecture/media-preview-converter.md
 */

const OFFICE_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.graphics',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.spreadsheet',
  'text/csv',
  'application/csv',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.presentation',
]);

const OFFICE_EXTENSIONS = new Set([
  'doc',
  'docx',
  'odt',
  'odg',
  'txt',
  'xls',
  'xlsx',
  'ods',
  'csv',
  'ppt',
  'pptx',
  'odp',
]);

const PDF_MIME_TYPES = new Set(['application/pdf']);
const PDF_EXTENSIONS = new Set(['pdf']);

function extensionFromPath(storagePath: string): string {
  const base = storagePath.split('/').pop() ?? storagePath;
  const dot = base.lastIndexOf('.');
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : '';
}

function normalizeMime(mimeType: string | null | undefined): string {
  return (mimeType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
}

export function isOfficeMime(mimeType: string | null | undefined, storagePath: string): boolean {
  const mime = normalizeMime(mimeType);
  if (mime && OFFICE_MIME_TYPES.has(mime)) {
    return true;
  }
  return OFFICE_EXTENSIONS.has(extensionFromPath(storagePath));
}

export function isPdfMime(mimeType: string | null | undefined, storagePath: string): boolean {
  const mime = normalizeMime(mimeType);
  if (mime && PDF_MIME_TYPES.has(mime)) {
    return true;
  }
  return PDF_EXTENSIONS.has(extensionFromPath(storagePath));
}

export function isWorkerEligibleMime(mimeType: string | null | undefined, storagePath: string): boolean {
  return isOfficeMime(mimeType, storagePath) || isPdfMime(mimeType, storagePath);
}
