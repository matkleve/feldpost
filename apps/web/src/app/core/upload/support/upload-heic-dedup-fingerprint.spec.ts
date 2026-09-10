/**
 * NF-38 — HEIC dedup fingerprint must describe source bytes, not encoder output.
 * @see docs/audits/upload-flow-review-2026-09-10/02-new-issues.md § NF-38
 */
import { describe, expect, it, vi } from 'vitest';
import { runUploadDedupCheck } from './upload-dedup-check.util';
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

function createHeicJob(file: File, sourceFile: File): UploadJob {
  return {
    id: 'job-heic',
    batchId: 'batch-1',
    file,
    sourceFile,
    phase: 'hashing',
    progress: 0,
    statusLabel: '',
    submittedAt: new Date(),
    mode: 'new',
  };
}

async function hashViaDedupGate(job: UploadJob, parsedExif: ParsedExif): Promise<string> {
  const jobState = {
    setPhase: vi.fn(),
    updateJob: vi.fn((jobId: string, patch: Partial<UploadJob>) => {
      Object.assign(job, patch);
    }),
  };
  const outcome = await runUploadDedupCheck(
    {
      jobState,
      queue: { markDone: vi.fn() },
      uploadService: { resolveMediaType: vi.fn().mockReturnValue('photo') },
    },
    job.id,
    job,
    parsedExif,
    {
      getCurrentUserId: () => 'user-1',
      checkDedupHash: vi.fn().mockResolvedValue(null),
      emitDuplicateDetected: vi.fn(),
      emitBatchProgress: vi.fn(),
      drainQueue: vi.fn(),
    },
  );
  expect(outcome).toBe('no_match');
  expect(job.contentHash).toBeTruthy();
  return job.contentHash!;
}

describe('NF-38 HEIC dedup fingerprint stability', () => {
  const parsedExif: ParsedExif = {
    coords: { lat: 48.1351, lng: 11.582 },
    capturedAt: new Date('2026-03-15T10:30:00Z'),
    direction: 180,
  };

  it('same HEIC source yields identical fingerprint after two independent conversions', async () => {
    const sourceHeic = makeHeicSource();
    const jpeg1 = makeConvertedJpeg(1);
    const jpeg2 = makeConvertedJpeg(2);

    const jobAfterFirstConversion = createHeicJob(jpeg1, sourceHeic);
    const jobAfterSecondConversion = createHeicJob(jpeg2, sourceHeic);

    const fingerprint1 = await hashViaDedupGate(jobAfterFirstConversion, parsedExif);
    const fingerprint2 = await hashViaDedupGate(jobAfterSecondConversion, parsedExif);

    expect(fingerprint1).toBe(fingerprint2);
  });
});
