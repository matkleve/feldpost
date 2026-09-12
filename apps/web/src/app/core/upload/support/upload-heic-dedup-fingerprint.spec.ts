/**
 * NF-38 — HEIC dedup fingerprint must describe source bytes, not encoder output.
 * @see docs/audits/upload-flow-review-2026-09-10/02-new-issues.md § NF-38
 */
import { describe, expect, it, vi } from 'vitest';
import { UploadJobStateService } from './upload-job-state.service';
import { computeUploadContentHash } from './content-hash.util';
import { runUploadDedupCheck } from './upload-dedup-check.util';
import {
  awaitHeicConversionForUpload,
  clearHeicConversionRegistryForTests,
} from './upload-heic-prepare.util';
import type { UploadJob } from '../upload-manager.types';
import type { ParsedExif } from '../upload.types';

function makeHeicSource(): File {
  const bytes = new Uint8Array(512);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = i % 251;
  }
  return new File([bytes], 'IMG_0001.HEIC', { type: 'image/heic' });
}

function makeConvertedJpeg(variant: number): File {
  const jpegBytes = new Uint8Array(900 + variant);
  jpegBytes.fill(variant);
  return new File([jpegBytes], 'IMG_0001.jpg', { type: 'image/jpeg' });
}

function createHeicJob(sourceFile: File): UploadJob {
  return {
    id: 'job-heic',
    batchId: 'batch-1',
    file: sourceFile,
    phase: 'parsing_exif',
    progress: 0,
    statusLabel: '',
    submittedAt: new Date(),
    mode: 'new',
    filePrepareComplete: true,
  };
}

describe('NF-38 HEIC dedup fingerprint stability', () => {
  const parsedExif: ParsedExif = {
    coords: { lat: 48.1351, lng: 11.582 },
    capturedAt: new Date('2026-03-15T10:30:00Z'),
    direction: 180,
  };

  it('hashes HEIC source bytes before conversion and keeps fingerprint after JPEG swap', async () => {
    clearHeicConversionRegistryForTests();
    const sourceHeic = makeHeicSource();
    const expectedFingerprint = (
      await computeUploadContentHash(sourceHeic, parsedExif, 'photo')
    ).contentHash;

    const jobState = new UploadJobStateService();
    let job = createHeicJob(sourceHeic);
    jobState.addJobs([job]);

    const uploadService = {
      resolveMediaType: vi.fn().mockReturnValue('photo'),
      isHeic: (file: File) => file.name.toLowerCase().endsWith('.heic'),
      convertToJpeg: vi.fn().mockImplementation(async () => makeConvertedJpeg(1)),
    };

    const outcome = await runUploadDedupCheck(
      {
        jobState,
        queue: { markDone: vi.fn() },
        uploadService,
      },
      job.id,
      job,
      parsedExif,
      {
        getCurrentUserId: () => 'user-1',
        checkDedupHash: vi.fn().mockResolvedValue(null),
        emitUploadSkipped: vi.fn(),
        emitDuplicateDetected: vi.fn(),
        emitBatchProgress: vi.fn(),
        drainQueue: vi.fn(),
      },
    );

    expect(outcome).toBe('no_match');
    job = jobState.findJob(job.id)!;
    expect(job.contentHash).toBe(expectedFingerprint);
    expect(job.phase).toBe('dedup_check');
    expect(uploadService.convertToJpeg).not.toHaveBeenCalled();

    // Simulate post-dedup JPEG swap while sourceFile still points at HEIC bytes.
    jobState.updateJob(job.id, {
      file: makeConvertedJpeg(1),
      sourceFile: sourceHeic,
    });

    await awaitHeicConversionForUpload({ jobState, uploadService }, job.id);

    const afterConversion = jobState.findJob(job.id)!;
    expect(afterConversion.contentHash).toBe(expectedFingerprint);
    expect(afterConversion.file.type).toBe('image/jpeg');
    expect(afterConversion.sourceFile).toBe(sourceHeic);
    expect(uploadService.convertToJpeg).toHaveBeenCalledWith(sourceHeic);
  });
});
