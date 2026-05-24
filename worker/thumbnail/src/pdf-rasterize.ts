import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

const DOCUMENT_LONG_EDGE_PX = 512;
const WEBP_QUALITY = 80;
const RASTER_TIMEOUT_MS = 60_000;

async function rasterizeWithSharpPdfInput(pdfBytes: Buffer): Promise<Buffer> {
  return sharp(pdfBytes, { page: 0 })
    .resize(DOCUMENT_LONG_EDGE_PX, DOCUMENT_LONG_EDGE_PX, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

/** Poppler fallback when libvips/sharp was built without PDF support. */
async function rasterizeWithPdftoppm(pdfBytes: Buffer): Promise<Buffer> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'feldpost-pdf-'));
  const pdfPath = path.join(tmpDir, 'input.pdf');
  const outPrefix = path.join(tmpDir, 'page');

  try {
    await fs.writeFile(pdfPath, pdfBytes);
    await execFileAsync(
      'pdftoppm',
      ['-png', '-f', '1', '-l', '1', '-singlefile', pdfPath, outPrefix],
      { timeout: RASTER_TIMEOUT_MS },
    );

    const pngPath = `${outPrefix}.png`;
    const pngBytes = await fs.readFile(pngPath);

    return sharp(pngBytes)
      .resize(DOCUMENT_LONG_EDGE_PX, DOCUMENT_LONG_EDGE_PX, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

export async function rasterizePdfFirstPageToWebp(pdfBytes: Buffer): Promise<Buffer> {
  try {
    return await rasterizeWithSharpPdfInput(pdfBytes);
  } catch (sharpErr) {
    const message = sharpErr instanceof Error ? sharpErr.message : String(sharpErr);
    if (!message.toLowerCase().includes('unsupported') && !message.toLowerCase().includes('pdf')) {
      throw sharpErr;
    }
  }

  return rasterizeWithPdftoppm(pdfBytes);
}
