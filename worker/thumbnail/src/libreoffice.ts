import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const CONVERT_TIMEOUT_MS = 120_000;

/**
 * Convert an Office document to PDF bytes via LibreOffice headless.
 */
export async function convertOfficeToPdf(inputBytes: Buffer, fileName: string): Promise<Buffer> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'feldpost-thumb-'));
  const safeName = fileName.includes('.') ? fileName : `${fileName}.bin`;
  const inputPath = path.join(tmpDir, path.basename(safeName));

  try {
    await fs.writeFile(inputPath, inputBytes);

    await execFileAsync(
      'soffice',
      ['--headless', '--convert-to', 'pdf', '--outdir', tmpDir, inputPath],
      { timeout: CONVERT_TIMEOUT_MS },
    );

    const stem = path.basename(inputPath, path.extname(inputPath));
    const pdfPath = path.join(tmpDir, `${stem}.pdf`);
    return await fs.readFile(pdfPath);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}
