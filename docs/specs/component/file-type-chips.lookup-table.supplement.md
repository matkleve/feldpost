# file type chips.lookup table.supplement

> Parent: [`file-type-chips.md`](./file-type-chips.md)

## File-Type Lookup Table (Implementation Reference)

```typescript
const FILE_TYPE_MAP: Record<
  string,
  { type: string; icon: string; category: string; color: string }
> = {
  // Images
  jpg: {
    type: "JPEG",
    icon: "image",
    category: "image",
    color: "--filetype-image",
  },
  jpeg: {
    type: "JPEG",
    icon: "image",
    category: "image",
    color: "--filetype-image",
  },
  png: {
    type: "PNG",
    icon: "image",
    category: "image",
    color: "--filetype-image",
  },
  heic: {
    type: "HEIC",
    icon: "image",
    category: "image",
    color: "--filetype-image",
  },
  heif: {
    type: "HEIF",
    icon: "image",
    category: "image",
    color: "--filetype-image",
  },
  webp: {
    type: "WebP",
    icon: "image",
    category: "image",
    color: "--filetype-image",
  },
  tiff: {
    type: "TIFF",
    icon: "image",
    category: "image",
    color: "--filetype-image",
  },

  // Video
  mp4: {
    type: "MP4",
    icon: "videocam",
    category: "video",
    color: "--filetype-video",
  },
  mov: {
    type: "MOV",
    icon: "videocam",
    category: "video",
    color: "--filetype-video",
  },
  webm: {
    type: "WebM",
    icon: "videocam",
    category: "video",
    color: "--filetype-video",
  },
  avi: {
    type: "AVI",
    icon: "videocam",
    category: "video",
    color: "--filetype-video",
  },
  mkv: {
    type: "MKV",
    icon: "videocam",
    category: "video",
    color: "--filetype-video",
  },

  // Documents
  pdf: {
    type: "PDF",
    icon: "description",
    category: "document",
    color: "--filetype-document",
  },
  doc: {
    type: "DOC",
    icon: "description",
    category: "document",
    color: "--filetype-document",
  },
  docx: {
    type: "DOCX",
    icon: "description",
    category: "document",
    color: "--filetype-document",
  },
  odt: {
    type: "ODT",
    icon: "description",
    category: "document",
    color: "--filetype-document",
  },
  odg: {
    type: "ODG",
    icon: "description",
    category: "document",
    color: "--filetype-document",
  },
  txt: {
    type: "TXT",
    icon: "description",
    category: "document",
    color: "--filetype-document",
  },

  // Spreadsheets
  xls: {
    type: "XLS",
    icon: "table_chart",
    category: "spreadsheet",
    color: "--filetype-spreadsheet",
  },
  xlsx: {
    type: "XLSX",
    icon: "table_chart",
    category: "spreadsheet",
    color: "--filetype-spreadsheet",
  },
  ods: {
    type: "ODS",
    icon: "table_chart",
    category: "spreadsheet",
    color: "--filetype-spreadsheet",
  },
  csv: {
    type: "CSV",
    icon: "table_chart",
    category: "spreadsheet",
    color: "--filetype-spreadsheet",
  },

  // Presentations
  ppt: {
    type: "PPT",
    icon: "bar_chart",
    category: "presentation",
    color: "--filetype-presentation",
  },
  pptx: {
    type: "PPTX",
    icon: "bar_chart",
    category: "presentation",
    color: "--filetype-presentation",
  },
  odp: {
    type: "ODP",
    icon: "bar_chart",
    category: "presentation",
    color: "--filetype-presentation",
  },

  // Office Generic (fallback)
  office: {
    type: "Office",
    icon: "article",
    category: "office",
    color: "--filetype-office",
  },
};
```

