/**
 * Curated mock corpus for the upload pipeline trace harness — 15 synthetic files in
 * differently-named subfolders, one per pipeline behaviour worth watching.
 *
 * Everything here is synthetic. Nothing in this file is imported by production code.
 * Scale-up corpus: `upload-trace-generator.ts`. Stub Photon: `upload-trace-geocoder.stub.ts`.
 *
 * @see docs/playbooks/upload-pipeline-trace.md
 * @see docs/specs/service/media-upload-service/upload-search-object.md
 */

import type { ScannedFileEntry } from '../../folder-scan/folder-scan.service';

/** One synthetic file as `submitWebkitFolder` would receive it from a folder drop. */
export interface UploadTraceScenario {
  /** Stable trace row label (`S01` curated, `G042` generated). */
  id: string;
  /** Why this path is in the corpus. A note, not an assertion — the trace prints reality. */
  intent: string;
  /** Path exactly as scanned: folder segments joined with the leaf file name. */
  relativePath: string;
  mimeType: string;
  /**
   * Injected EXIF GPS. Harness files are filled with a single repeated byte, so they carry
   * no real EXIF; scenarios needing GPS get it stubbed at `UploadService.parseExif`.
   */
  exifCoords?: { lat: number; lng: number };
  /**
   * Fill byte for the file body. Two scenarios sharing byte AND size hash identically,
   * which is how content dedup gets exercised.
   */
  contentByte: number;
  sizeBytes: number;
}

export const TRACE_PHOTO_MIME = 'image/jpeg';
export const TRACE_DOCUMENT_MIME = 'application/pdf';
export const TRACE_PHOTO_SIZE_BYTES = 512;
export const TRACE_DOCUMENT_SIZE_BYTES = 2048;

const JPEG = TRACE_PHOTO_MIME;
const SIZE = TRACE_PHOTO_SIZE_BYTES;

export const TRACE_SCENARIOS: readonly UploadTraceScenario[] = [
  {
    id: 'S01',
    intent: 'Full admin chain + street + house number',
    relativePath: 'AT/Wien/1090/Währinger Straße 12/IMG_1274.jpg',
    mimeType: JPEG,
    contentByte: 1,
    sizeBytes: SIZE,
  },
  {
    id: 'S02',
    intent: 'Same folder as S01 — must share one groupingKey (one geocode for two files)',
    relativePath: 'AT/Wien/1090/Währinger Straße 12/IMG_1275.jpg',
    mimeType: JPEG,
    contentByte: 2,
    sizeBytes: SIZE,
  },
  {
    id: 'S03',
    intent: 'City + street, no country, no postcode',
    relativePath: 'Graz/Annenstraße 10/DSC_0001.jpg',
    mimeType: JPEG,
    contentByte: 3,
    sizeBytes: SIZE,
  },
  {
    id: 'S04',
    intent: 'Postcode without city — PLZ expand from at-plz.json',
    relativePath: 'AT/4020/Landstraße 7/foto.jpg',
    mimeType: JPEG,
    contentByte: 4,
    sizeBytes: SIZE,
  },
  {
    id: 'S05',
    intent: 'Street only, no locality, no project centroid',
    relativePath: 'Hauptstraße 5/IMG_3001.jpg',
    mimeType: JPEG,
    contentByte: 5,
    sizeBytes: SIZE,
  },
  {
    id: 'S06',
    intent: 'Two city tokens at different folder levels',
    relativePath: 'AT/Wien/Innsbruck/Maria-Theresien-Straße 18/IMG_4001.jpg',
    mimeType: JPEG,
    contentByte: 6,
    sizeBytes: SIZE,
  },
  {
    id: 'S07',
    intent: 'Filename street contradicts folder street',
    relativePath: 'Graz/Annenstraße 10/Annenstraße 12 Detail.jpg',
    mimeType: JPEG,
    contentByte: 7,
    sizeBytes: SIZE,
  },
  {
    id: 'S08',
    intent: 'Stiege + Tür — units on the SO, excluded from groupingKey',
    relativePath: 'AT/Graz/8010/Annenstraße 10/Stiege 2/Tür 5/IMG_5001.jpg',
    mimeType: JPEG,
    contentByte: 8,
    sizeBytes: SIZE,
  },
  {
    id: 'S09',
    intent: 'AT "Top" unit shorthand',
    relativePath: 'AT/Wien/1010/Kärntner Straße 4/Top 3/IMG_6001.jpg',
    mimeType: JPEG,
    contentByte: 9,
    sizeBytes: SIZE,
  },
  {
    id: 'S10',
    intent: 'Salzburg — state name equals city name',
    relativePath: 'AT/Salzburg/Getreidegasse 9/IMG_7001.jpg',
    mimeType: JPEG,
    contentByte: 10,
    sizeBytes: SIZE,
  },
  {
    id: 'S11',
    intent: 'No address signal at all',
    relativePath: 'Baustelle Süd/Woche 12/IMG_8001.jpg',
    mimeType: JPEG,
    contentByte: 11,
    sizeBytes: SIZE,
  },
  {
    id: 'S12',
    intent: 'EXIF GPS only, no parseable text',
    relativePath: 'Rohdaten/Kamera A/IMG_9001.jpg',
    mimeType: JPEG,
    exifCoords: { lat: 47.0707, lng: 15.4395 },
    contentByte: 12,
    sizeBytes: SIZE,
  },
  {
    id: 'S13',
    intent: 'Text address AND far-away EXIF GPS (Wien folder, Graz camera)',
    relativePath: 'AT/Wien/1010/Kärntner Straße 4/IMG_9100.jpg',
    mimeType: JPEG,
    exifCoords: { lat: 47.0707, lng: 15.4395 },
    contentByte: 13,
    sizeBytes: SIZE,
  },
  {
    id: 'S14',
    intent: 'Byte-identical to S01 — duplicate content inside one batch',
    relativePath: 'AT/Wien/1090/Währinger Straße 12/Kopie von IMG_1274.jpg',
    mimeType: JPEG,
    contentByte: 1,
    sizeBytes: SIZE,
  },
  {
    id: 'S15',
    intent: 'PDF document under a parseable folder address',
    relativePath: 'AT/Wien/1090/Währinger Straße 12/Abnahmeprotokoll.pdf',
    mimeType: TRACE_DOCUMENT_MIME,
    contentByte: 15,
    sizeBytes: TRACE_DOCUMENT_SIZE_BYTES,
  },
];

/** Synthetic `File` — a single repeated byte, so there are no real image or EXIF bytes. */
export function scenarioToFile(scenario: UploadTraceScenario): File {
  const body = new Uint8Array(scenario.sizeBytes).fill(scenario.contentByte);
  const leaf = scenario.relativePath.split('/').pop() ?? 'file.bin';
  return new File([body], leaf, { type: scenario.mimeType });
}

export function scenarioToScannedEntry(scenario: UploadTraceScenario): ScannedFileEntry {
  const segments = scenario.relativePath.split('/');
  return {
    file: scenarioToFile(scenario),
    relativePath: scenario.relativePath,
    directorySegments: segments.slice(0, -1),
  };
}
