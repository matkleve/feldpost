import type { FileTypeDefinition, FileTypeLookupInput } from './media-renderer.types';

const FILE_TYPE_DEFINITIONS: ReadonlyArray<FileTypeDefinition> = [
  {
    id: 'image',
    label: 'Image',
    category: 'image',
    colorToken: '--filetype-image',
    icon: 'image',
    aspectRatio: { type: 'native' },
    mimeTypes: ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'],
    extensions: ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'],
  },
  {
    id: 'video',
    label: 'Video',
    category: 'video',
    colorToken: '--filetype-video',
    icon: 'videocam',
    aspectRatio: { type: 'fixed', width: 16, height: 9 },
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
    extensions: ['mp4', 'mov', 'webm'],
  },
  {
    id: 'pdf',
    label: 'PDF',
    category: 'document',
    colorToken: '--filetype-document',
    icon: 'description',
    aspectRatio: { type: 'fixed', width: 3, height: 4 },
    mimeTypes: ['application/pdf'],
    extensions: ['pdf'],
  },
  {
    id: 'word',
    label: 'Document',
    category: 'document',
    colorToken: '--filetype-document',
    icon: 'description',
    aspectRatio: { type: 'fixed', width: 3, height: 4 },
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.graphics',
      'text/plain',
    ],
    extensions: ['doc', 'docx', 'odt', 'odg', 'txt'],
  },
  {
    id: 'spreadsheet',
    label: 'Spreadsheet',
    category: 'spreadsheet',
    colorToken: '--filetype-spreadsheet',
    icon: 'table_chart',
    aspectRatio: { type: 'fixed', width: 4, height: 3 },
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.oasis.opendocument.spreadsheet',
      'text/csv',
      'application/csv',
    ],
    extensions: ['xls', 'xlsx', 'ods', 'csv'],
  },
  {
    id: 'presentation',
    label: 'Presentation',
    category: 'presentation',
    colorToken: '--filetype-presentation',
    icon: 'slideshow',
    aspectRatio: { type: 'fixed', width: 4, height: 3 },
    mimeTypes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation',
    ],
    extensions: ['ppt', 'pptx', 'odp'],
  },
  {
    id: 'unknown',
    label: 'File',
    category: 'unknown',
    colorToken: '--filetype-office',
    icon: 'insert_drive_file',
    aspectRatio: { type: 'free' },
    mimeTypes: [],
    extensions: [],
  },
];

const UNKNOWN_FILE_TYPE = FILE_TYPE_DEFINITIONS[FILE_TYPE_DEFINITIONS.length - 1]!;

const MIME_LOOKUP = new Map<string, FileTypeDefinition>();
const EXTENSION_LOOKUP = new Map<string, FileTypeDefinition>();

const IMAGE_BADGE_BY_EXT: Readonly<Record<string, string>> = {
  jpg: 'JPEG',
  jpeg: 'JPEG',
  png: 'PNG',
  heic: 'HEIC',
  heif: 'HEIF',
  webp: 'WebP',
};

const VIDEO_BADGE_BY_EXT: Readonly<Record<string, string>> = {
  mp4: 'MP4',
  mov: 'MOV',
  webm: 'WebM',
};

const WORD_BADGE_BY_EXT: Readonly<Record<string, string>> = {
  doc: 'DOC',
  docx: 'DOCX',
  odt: 'ODT',
  odg: 'ODG',
  txt: 'TXT',
};

const SPREADSHEET_BADGE_BY_EXT: Readonly<Record<string, string>> = {
  xls: 'XLS',
  xlsx: 'XLSX',
  ods: 'ODS',
  csv: 'CSV',
};

const PRESENTATION_BADGE_BY_EXT: Readonly<Record<string, string>> = {
  ppt: 'PPT',
  pptx: 'PPTX',
  odp: 'ODP',
};

const DEFAULT_BADGE_BY_TYPE_ID: Readonly<Record<string, string | null>> = {
  image: 'IMG',
  video: 'VID',
  pdf: 'PDF',
  word: 'DOC',
  spreadsheet: 'XLS',
  presentation: 'PPT',
  unknown: null,
};

for (const def of FILE_TYPE_DEFINITIONS) {
  for (const mimeType of def.mimeTypes) {
    MIME_LOOKUP.set(mimeType.toLowerCase(), def);
  }
  for (const ext of def.extensions) {
    EXTENSION_LOOKUP.set(ext.toLowerCase(), def);
  }
}

export const FILE_TYPE_REGISTRY: ReadonlyArray<FileTypeDefinition> = FILE_TYPE_DEFINITIONS;

export function resolveFileType(input: FileTypeLookupInput): FileTypeDefinition {
  const mimeType = input.mimeType?.trim().toLowerCase();
  if (mimeType) {
    const byMime = MIME_LOOKUP.get(mimeType);
    if (byMime) return byMime;
  }

  const extension = resolveExtension(input);
  if (extension) {
    const byExtension = EXTENSION_LOOKUP.get(extension);
    if (byExtension) return byExtension;
  }

  return UNKNOWN_FILE_TYPE;
}

export function resolveExtension(input: FileTypeLookupInput): string | null {
  if (input.extension && input.extension.trim().length > 0) {
    return normalizeExtension(input.extension);
  }

  const fileName = input.fileName?.trim();
  if (!fileName || !fileName.includes('.')) {
    return null;
  }

  const ext = fileName.split('.').pop();
  return ext ? normalizeExtension(ext) : null;
}

function normalizeExtension(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith('.') ? normalized.slice(1) : normalized;
}

export function fileTypeBadge(input: FileTypeLookupInput): string | null {
  const ext = resolveExtension(input);
  const type = resolveFileType(input);

  const badgeByExt = badgeMapByTypeId(type.id);
  if (ext && badgeByExt[ext]) {
    return badgeByExt[ext];
  }

  return DEFAULT_BADGE_BY_TYPE_ID[type.id] ?? null;
}

function badgeMapByTypeId(typeId: string): Readonly<Record<string, string>> {
  switch (typeId) {
    case 'image':
      return IMAGE_BADGE_BY_EXT;
    case 'video':
      return VIDEO_BADGE_BY_EXT;
    case 'word':
      return WORD_BADGE_BY_EXT;
    case 'spreadsheet':
      return SPREADSHEET_BADGE_BY_EXT;
    case 'presentation':
      return PRESENTATION_BADGE_BY_EXT;
    default:
      return {};
  }
}
