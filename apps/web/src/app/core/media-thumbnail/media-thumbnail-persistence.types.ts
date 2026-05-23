export type PersistMasterPreviewInput = {
  mediaId: string;
  organizationId: string;
  userId: string;
  sourceStoragePath: string;
  previewBlob: Blob;
  /** When true, normalize to 128×128 JPEG (photos). Otherwise 512px long-edge WebP. */
  photoThumb?: boolean;
};

export type PersistMasterPreviewResult =
  | { ok: true; thumbnailPath: string }
  | { ok: false; message: string };
