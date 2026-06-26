/**
 * Content hash utility for upload deduplication.
 *
 * Two algorithms (see dedup-scope supplement):
 * - `photo_v1`: file head + size + EXIF GPS/date/direction
 * - `binary_v1`: file head + size only (documents, video, byte-static files)
 *
 * Uses the Web Crypto API -- no external dependencies.
 *
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.dedup-scope.supplement.md
 */

import type { MediaType } from './upload-file-types';
import type { ParsedExif } from '../upload.types';

/** Size of the file head read for hashing (64 KB). */
const FILE_HEAD_SIZE = 64 * 1024;

export type ContentHashAlgo = 'photo_v1' | 'binary_v1';

export interface UploadContentHashResult {
  contentHash: string;
  hashAlgo: ContentHashAlgo;
}

export interface ContentHashInput {
  /** First 64 KB of raw file bytes (fast, avoids reading entire file). */
  fileHeadBytes: ArrayBuffer;
  /** File size in bytes (cheap discriminator). */
  fileSize: number;
  /** EXIF GPS coordinates if available. */
  gpsCoords?: { lat: number; lng: number };
  /** EXIF capture timestamp if available. */
  capturedAt?: string;
  /** Camera bearing / direction from EXIF (degrees). */
  direction?: number;
}

/**
 * Read the first 64 KB of a File as an ArrayBuffer.
 * Uses FileReader for broad environment compatibility (jsdom, browsers).
 */
export async function readFileHead(file: File): Promise<ArrayBuffer> {
  const slice = file.slice(0, FILE_HEAD_SIZE);
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(slice);
  });
}

/**
 * Concatenate multiple Uint8Arrays into a single Uint8Array.
 * Returns Uint8Array (a valid BufferSource for crypto.subtle.digest).
 */
function concatBuffers(parts: Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const part of parts) {
    totalLength += part.byteLength;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

/**
 * Compute a SHA-256 content hash from file head + metadata.
 *
 * The hash combines:
 * - First 64 KB of file bytes (captures JPEG header + EXIF + image start)
 * - File size (cheap discriminator)
 * - GPS coords, capture date, direction (EXIF metadata)
 *
 * Two genuinely different photos will almost certainly produce different hashes.
 * Uses the Web Crypto API (crypto.subtle.digest) -- no dependencies.
 */
async function digestSha256Hex(parts: Uint8Array[]): Promise<string> {
  const combined = concatBuffers(parts);
  const hashBuffer = await crypto.subtle.digest('SHA-256', combined as BufferSource);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Photo fingerprint -- head + size + EXIF metadata when present. */
export async function computeContentHash(input: ContentHashInput): Promise<string> {
  const encoder = new TextEncoder();
  return digestSha256Hex([
    new Uint8Array(input.fileHeadBytes),
    encoder.encode(`|size=${input.fileSize}`),
    encoder.encode(`|gps=${input.gpsCoords?.lat ?? ''},${input.gpsCoords?.lng ?? ''}`),
    encoder.encode(`|date=${input.capturedAt ?? ''}`),
    encoder.encode(`|dir=${input.direction ?? ''}`),
  ]);
}

/** Byte-static fingerprint -- head + size only. */
export async function computeBinaryContentHash(input: {
  fileHeadBytes: ArrayBuffer;
  fileSize: number;
}): Promise<string> {
  const encoder = new TextEncoder();
  return digestSha256Hex([
    new Uint8Array(input.fileHeadBytes),
    encoder.encode(`|size=${input.fileSize}`),
    encoder.encode('|algo=binary_v1'),
  ]);
}

/** Dispatch hash algorithm by upload media type. */
export async function computeUploadContentHash(
  file: File,
  parsedExif: ParsedExif | undefined,
  mediaType: MediaType,
): Promise<UploadContentHashResult> {
  const fileHead = await readFileHead(file);
  if (mediaType === 'photo') {
    const exif = parsedExif ?? {};
    return {
      contentHash: await computeContentHash({
        fileHeadBytes: fileHead,
        fileSize: file.size,
        gpsCoords: exif.coords
          ? { lat: exif.coords.lat, lng: exif.coords.lng }
          : undefined,
        capturedAt: exif.capturedAt?.toISOString(),
        direction: exif.direction,
      }),
      hashAlgo: 'photo_v1',
    };
  }

  return {
    contentHash: await computeBinaryContentHash({
      fileHeadBytes: fileHead,
      fileSize: file.size,
    }),
    hashAlgo: 'binary_v1',
  };
}
