/**
 * Shared HEIC→JPEG conversion for new, attach, and replace pipelines.
 *
 * @see docs/audits/upload-flow-review-2026-09-10/02-new-issues.md NF-08, NF-09, NF-10
 */

import { MAX_FILE_SIZE } from './upload-file-types';
import { validateUploadFile } from './upload.service.util';
import { resolveUploadSourceFile } from './content-hash.util';
import type { UploadJobStateService } from './upload-job-state.service';
import type { UploadService } from '../upload.service';

type HeicPrepareDeps = {
  jobState: UploadJobStateService;
  uploadService: UploadService;
};

const heicConversionByJobId = new Map<string, Promise<void>>();

export function applyConvertedFileToJob(
  deps: Pick<HeicPrepareDeps, 'jobState'>,
  jobId: string,
  convertedFile: File,
): void {
  const current = deps.jobState.findJob(jobId);
  if (!current) {
    return;
  }
  let newThumbnailUrl = current.thumbnailUrl;
  if (newThumbnailUrl) {
    URL.revokeObjectURL(newThumbnailUrl);
  }
  newThumbnailUrl = URL.createObjectURL(convertedFile);
  deps.jobState.updateJob(jobId, {
    file: convertedFile,
    thumbnailUrl: newThumbnailUrl,
    sourceFile: current.sourceFile ?? current.file,
  });
}

function validateConvertedFileSize(file: File, originalFileName: string): string | null {
  const validation = validateUploadFile(file);
  if (validation.valid) {
    return null;
  }
  if (file.size > MAX_FILE_SIZE) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `Converted JPEG from "${originalFileName}" is ${mb} MB — maximum allowed is 25 MB. Try exporting a smaller JPEG and upload again.`;
  }
  return validation.error ?? 'Converted file failed validation.';
}

export function formatHeicConversionError(fileName: string, err: unknown): string {
  if (err instanceof Error && err.message === 'HEIC_CONVERSION_FAILED') {
    return `Could not convert "${fileName}" to JPEG. Try exporting as JPEG and upload again.`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'HEIC conversion failed.';
}

/** Singleflight HEIC→JPEG for one job. Registers before awaiting to close the double-decode window. */
export function ensureHeicConversionScheduled(
  deps: HeicPrepareDeps,
  jobId: string,
  sourceFile: File,
  options?: { setPhase?: boolean },
): Promise<void> {
  const existing = heicConversionByJobId.get(jobId);
  if (existing) {
    return existing;
  }

  const conversion = (async (): Promise<void> => {
    if (options?.setPhase !== false) {
      deps.jobState.setPhase(jobId, 'converting_format');
    }
    const convertedFile = await deps.uploadService.convertToJpeg(sourceFile);
    const sizeError = validateConvertedFileSize(convertedFile, sourceFile.name);
    if (sizeError) {
      throw new Error(sizeError);
    }
    applyConvertedFileToJob(deps, jobId, convertedFile);
  })();

  const tracked = conversion.finally(() => {
    heicConversionByJobId.delete(jobId);
  });
  heicConversionByJobId.set(jobId, tracked);
  return tracked;
}

/**
 * Upload gate: JPEG bytes required. Waits for background conversion from prepare, or
 * converts now when tray resolved before this job's prepare ran.
 */
export async function awaitHeicConversionForUpload(
  deps: HeicPrepareDeps,
  jobId: string,
): Promise<void> {
  const job = deps.jobState.findJob(jobId);
  if (!job) {
    return;
  }
  const sourceFile = resolveUploadSourceFile(job);
  if (!deps.uploadService.isHeic(sourceFile)) {
    return;
  }
  await ensureHeicConversionScheduled(deps, jobId, sourceFile);
  const after = deps.jobState.findJob(jobId);
  if (after && deps.uploadService.isHeic(after.file)) {
    throw new Error('HEIC conversion did not produce a JPEG file');
  }
}

/** Test-only reset — avoids cross-spec pollution from the module-level map. */
export function clearHeicConversionRegistryForTests(): void {
  heicConversionByJobId.clear();
}
