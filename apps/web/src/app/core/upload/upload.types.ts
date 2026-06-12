/** Validated GPS coordinates from EXIF parsing. */
export interface ExifCoords {
  lat: number;
  lng: number;
}

/** EXIF fields extracted from an image file. */
export interface ParsedExif {
  /** GPS coordinates, present only when the image carries GPS tags. */
  coords?: ExifCoords;
  /** Original capture timestamp from EXIF DateTimeOriginal. */
  capturedAt?: Date;
  /** Camera compass direction in degrees (0-360), from GPSImgDirection. */
  direction?: number;
  /** Full EXIF payload from exifr.parse(file), persisted for immutable raw-data auditing. */
  exifRaw?: Record<string, unknown>;
}

/** A successfully completed upload. */
export interface UploadSuccess {
  /** UUID primary key of the newly inserted `images` row. */
  id: string;
  /** Supabase Storage path for the original file. */
  storagePath: string;
  /** Persisted coordinates (EXIF or manually supplied). */
  coords?: ExifCoords;
  /** Camera compass direction in degrees (0-360), if available from EXIF. */
  direction?: number;
  error: null;
}

/** A failed upload carrying the reason. */
export interface UploadFailure {
  error: Error | string;
}

/** Return type of uploadFile(). */
export type UploadResult = UploadSuccess | UploadFailure;

/** Result of client-side file validation. */
export interface FileValidation {
  valid: boolean;
  /** Human-readable reason when valid === false. */
  error?: string;
}
