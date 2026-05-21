/** i18n keys + English fallbacks for upload file-type chip hover labels. */
export type FileTypeDescription = {
  descriptionKey: string;
  descriptionFallback: string;
};

const EXTENSION_DESCRIPTIONS: Readonly<Record<string, FileTypeDescription>> = {
  jpg: {
    descriptionKey: 'upload.fileType.desc.jpg',
    descriptionFallback: 'JPEG photos',
  },
  png: {
    descriptionKey: 'upload.fileType.desc.png',
    descriptionFallback: 'Raster image files',
  },
  heic: {
    descriptionKey: 'upload.fileType.desc.heic',
    descriptionFallback: 'HEIC photos from phones and cameras',
  },
  webp: {
    descriptionKey: 'upload.fileType.desc.webp',
    descriptionFallback: 'WebP images for web and mobile',
  },
  mp4: {
    descriptionKey: 'upload.fileType.desc.mp4',
    descriptionFallback: 'MP4 video files',
  },
  mov: {
    descriptionKey: 'upload.fileType.desc.mov',
    descriptionFallback: 'QuickTime video files',
  },
  webm: {
    descriptionKey: 'upload.fileType.desc.webm',
    descriptionFallback: 'WebM video files',
  },
  pdf: {
    descriptionKey: 'upload.fileType.desc.pdf',
    descriptionFallback: 'PDF documents',
  },
  docx: {
    descriptionKey: 'upload.fileType.desc.docx',
    descriptionFallback: 'Microsoft Word documents',
  },
  odt: {
    descriptionKey: 'upload.fileType.desc.odt',
    descriptionFallback: 'OpenDocument text files',
  },
  odg: {
    descriptionKey: 'upload.fileType.desc.odg',
    descriptionFallback: 'OpenDocument drawing files',
  },
  txt: {
    descriptionKey: 'upload.fileType.desc.txt',
    descriptionFallback: 'Plain text files',
  },
  xlsx: {
    descriptionKey: 'upload.fileType.desc.xlsx',
    descriptionFallback: 'Excel spreadsheet files',
  },
  ods: {
    descriptionKey: 'upload.fileType.desc.ods',
    descriptionFallback: 'OpenDocument spreadsheet files',
  },
  csv: {
    descriptionKey: 'upload.fileType.desc.csv',
    descriptionFallback: 'Comma-separated data files',
  },
  pptx: {
    descriptionKey: 'upload.fileType.desc.pptx',
    descriptionFallback: 'PowerPoint presentation files',
  },
  odp: {
    descriptionKey: 'upload.fileType.desc.odp',
    descriptionFallback: 'OpenDocument presentation files',
  },
};

export function fileTypeDescriptionForExtension(ext: string): FileTypeDescription {
  return (
    EXTENSION_DESCRIPTIONS[ext] ?? {
      descriptionKey: 'upload.fileType.desc.generic',
      descriptionFallback: 'Supported file format',
    }
  );
}

export const FILE_TYPE_GROUP_DESCRIPTIONS: Readonly<
  Record<
    string,
    FileTypeDescription
  >
> = {
  images: {
    descriptionKey: 'upload.fileTypeGroup.desc.images',
    descriptionFallback: 'Photo files: JPEG, PNG, HEIC, and WebP',
  },
  video: {
    descriptionKey: 'upload.fileTypeGroup.desc.video',
    descriptionFallback: 'Video files: MP4, MOV, and WebM',
  },
  pdf: {
    descriptionKey: 'upload.fileTypeGroup.desc.pdf',
    descriptionFallback: 'PDF document files',
  },
  documents: {
    descriptionKey: 'upload.fileTypeGroup.desc.documents',
    descriptionFallback: 'Text documents: DOCX, ODT, ODG, and TXT',
  },
  spreadsheets: {
    descriptionKey: 'upload.fileTypeGroup.desc.spreadsheets',
    descriptionFallback: 'Spreadsheets: XLSX, ODS, and CSV',
  },
  presentations: {
    descriptionKey: 'upload.fileTypeGroup.desc.presentations',
    descriptionFallback: 'Presentations: PPTX and ODP',
  },
};
