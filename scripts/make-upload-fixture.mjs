/**
 * Generate a folder of test photos that exercises the upload pipeline's address evidence (#236).
 *
 * The project database has no row carrying location evidence — `relative_path` and `exif_latitude`
 * are NULL on all 20 rows — so the bulk-resolution write path has never geocoded or written. Seeding
 * rows with SQL would test the reader against data the writer never produced; this produces input
 * for the real pipeline instead.
 *
 * ```bash
 * node scripts/make-upload-fixture.mjs      # writes ./fixture-upload/
 * ```
 *
 * Then upload `fixture-upload/Archiv/` through the Upload tab (folder picker or drag-drop) and
 * re-run the counts. What each path is for:
 *
 * | Path | Exercises |
 * | --- | --- |
 * | `Wien/1010/Thalistraße 4/` ×3 | one address, three files — group merge and R5's one geocode |
 * | `Wien/1070/Kirchengasse 11/` ×2 | a second address in the same batch |
 * | `Graz/Annenstraße 12/` | a different city, so `admin_level_conflict` has something to decide |
 * | `2019/Ordner ohne Adresse/IMG_4471.jpg` | no address anywhere — the "has no location" bucket |
 * | `2019/Ordner ohne Adresse/IMG_4472.jpg` | no address in the path, GPS at Stephansplatz — the EXIF source |
 *
 * The images are a 1×1 baseline JPEG, which is a real JPEG but not a real photograph: this is about
 * the paths and the EXIF, not pixels. The GPS block is hand-built and verified with `exifr`, the
 * same reader the pipeline uses.
 *
 * @see https://github.com/matkleve/feldpost/issues/236
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Smallest valid baseline JPEG (1x1, grey). Enough for a real upload; not a real photograph. */
const BASE_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
  'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
  'base64',
);

function u16(v) { const b = Buffer.alloc(2); b.writeUInt16BE(v); return b; }
function u32(v) { const b = Buffer.alloc(4); b.writeUInt32BE(v); return b; }

/** One IFD entry: tag, type, count, value/offset (all big-endian, 'MM' byte order). */
function entry(tag, type, count, valueBuf) {
  return Buffer.concat([u16(tag), u16(type), u32(count), valueBuf]);
}

/** Degrees as three RATIONALs (deg/1, min/1, sec*10000/10000). */
function dmsRationals(deg) {
  const d = Math.floor(deg);
  const mFloat = (deg - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60 * 10000);
  return Buffer.concat([u32(d), u32(1), u32(m), u32(1), u32(s), u32(10000)]);
}

/**
 * Build an APP1/EXIF segment carrying only a GPS IFD.
 * Layout after "Exif\0\0": TIFF header, IFD0 (1 entry → GPS IFD pointer), then the GPS IFD,
 * then the out-of-line rational data the GPS entries point at.
 */
function exifApp1(lat, lng) {
  const tiffHeader = Buffer.concat([Buffer.from('MM'), u16(42), u32(8)]);

  const ifd0Size = 2 + 12 + 4;                 // count + one entry + next-IFD offset
  const gpsIfdOffset = 8 + ifd0Size;
  const gpsEntryCount = 4;
  const gpsIfdSize = 2 + gpsEntryCount * 12 + 4;
  let dataOffset = gpsIfdOffset + gpsIfdSize;  // where the 24-byte rational blocks live

  const latData = dmsRationals(Math.abs(lat));
  const lngData = dmsRationals(Math.abs(lng));
  const latOffset = dataOffset;
  const lngOffset = dataOffset + latData.length;

  const ifd0 = Buffer.concat([
    u16(1),
    entry(0x8825, 4, 1, u32(gpsIfdOffset)),    // GPSInfoIFDPointer
    u32(0),
  ]);

  const latRef = Buffer.from(lat >= 0 ? 'N\0\0\0' : 'S\0\0\0', 'latin1');
  const lngRef = Buffer.from(lng >= 0 ? 'E\0\0\0' : 'W\0\0\0', 'latin1');

  const gpsIfd = Buffer.concat([
    u16(gpsEntryCount),
    entry(1, 2, 2, latRef),                    // GPSLatitudeRef
    entry(2, 5, 3, u32(latOffset)),            // GPSLatitude
    entry(3, 2, 2, lngRef),                    // GPSLongitudeRef
    entry(4, 5, 3, u32(lngOffset)),            // GPSLongitude
    u32(0),
  ]);

  const tiff = Buffer.concat([tiffHeader, ifd0, gpsIfd, latData, lngData]);
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  return Buffer.concat([Buffer.from([0xff, 0xe1]), u16(payload.length + 2), payload]);
}

function jpegWithGps(lat, lng) {
  // Splice APP1 straight after SOI, before the existing APP0/JFIF.
  return Buffer.concat([BASE_JPEG.subarray(0, 2), exifApp1(lat, lng), BASE_JPEG.subarray(2)]);
}

const ROOT = 'fixture-upload';
const files = [
  ['Archiv/Wien/1010/Thalistraße 4/IMG_0001.jpg', null],
  ['Archiv/Wien/1010/Thalistraße 4/IMG_0002.jpg', null],
  ['Archiv/Wien/1010/Thalistraße 4/IMG_0003.jpg', null],
  ['Archiv/Wien/1070/Kirchengasse 11/IMG_0004.jpg', null],
  ['Archiv/Wien/1070/Kirchengasse 11/IMG_0005.jpg', null],
  ['Archiv/Graz/Annenstraße 12/IMG_0006.jpg', null],
  // No address in the path at all — this is the "has no location" bucket.
  ['Archiv/2019/Ordner ohne Adresse/IMG_4471.jpg', null],
  // Path gives no address, but GPS does — Stephansplatz, Wien.
  ['Archiv/2019/Ordner ohne Adresse/IMG_4472.jpg', [48.2082, 16.3738]],
];

for (const [rel, gps] of files) {
  const full = join(ROOT, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, gps ? jpegWithGps(gps[0], gps[1]) : BASE_JPEG);
}
console.log(`wrote ${files.length} files under ${ROOT}/`);
