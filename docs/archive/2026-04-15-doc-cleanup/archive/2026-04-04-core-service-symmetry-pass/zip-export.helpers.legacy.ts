import type {
  WorkspaceMediaCustomMetadata,
  WorkspaceMediaFileMetadata,
} from './workspace-view.types';

export const ZIP_INDEX_PAD_LENGTH = 3;
export const ZIP_TITLE_MAX_LENGTH = 100;
const TEN_MINUTES_IN_SECONDS = 600;
export const SIGNED_URL_TTL_SECONDS = TEN_MINUTES_IN_SECONDS;

const MAX_EXTENSION_FROM_PATH_LENGTH = 12;

const MIME_EXTENSION_FALLBACKS: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-powerpoint': 'ppt',
  'text/plain': 'txt',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

const UUID_FILE_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-zA-Z0-9]+)?$/i;

export function sanitizeExportTitle(value: string): string {
  const trimmed = value.trim() || 'workspace-export';
  return trimmed
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, ZIP_TITLE_MAX_LENGTH);
}

export function getFileExtension(storagePath: string, mimeType: string): string {
  const fromPath = storagePath.split('.').pop()?.toLowerCase();
  if (fromPath && fromPath.length <= MAX_EXTENSION_FROM_PATH_LENGTH) {
    return fromPath;
  }

  return MIME_EXTENSION_FALLBACKS[mimeType] ?? 'jpg';
}

export function readMetadataFilename(
  metadata?: WorkspaceMediaFileMetadata | null,
  legacyMetadata?: WorkspaceMediaCustomMetadata,
): string | null {
  const typed = firstNonEmpty([
    metadata?.originalFilename,
    metadata?.title,
    metadata?.filename,
    metadata?.name,
  ]);
  if (typed) return typed;

  return firstNonEmpty([
    legacyMetadata?.['originalFilename'],
    legacyMetadata?.['title'],
    legacyMetadata?.['filename'],
    legacyMetadata?.['name'],
  ]);
}

export function extractFilenameFromStoragePath(storagePath: string | null): string | null {
  if (!storagePath) return null;

  const pathParts = storagePath.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  if (!lastPart || UUID_FILE_SEGMENT.test(lastPart)) return null;

  const stem = lastPart.split('.')[0]?.trim();
  return stem || null;
}

export function composeStreetWithNumber(
  street: string | null,
  streetNumber: string | null | undefined,
): string | null {
  if (!street && !streetNumber) return null;
  if (!street) return streetNumber ?? null;
  if (!streetNumber) return street;

  const escaped = streetNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`\\b${escaped}\\b`).test(street)) {
    return street;
  }

  return `${street} ${streetNumber}`;
}

function firstNonEmpty(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}
