import { describe, expect, it } from 'vitest';
import { isCancelledUploadJob } from './upload-cancelled.util';
import type { UploadJob } from '../upload-manager.types';

function job(overrides: Partial<UploadJob>): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File([], 'a.jpg'),
    phase: 'error',
    progress: 0,
    statusLabel: '',
    submittedAt: new Date(),
    mode: 'new',
    ...overrides,
  };
}

// @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-08
describe('isCancelledUploadJob', () => {
  it('is true for a job explicitly marked cancelled', () => {
    expect(isCancelledUploadJob(job({ wasCancelled: true, error: 'Upload cancelled by user.' }))).toBe(
      true,
    );
  });

  it('is false for a genuine failure whose message happens to mention cancellation-adjacent words', () => {
    // The old implementation matched /cancelled/i against job.error — an i18n string here
    // (e.g. a translated "Upload abgebrochen") would have silently flipped classification
    // the other way; the point of this test is that the message content no longer matters.
    expect(isCancelledUploadJob(job({ error: 'The upload was cancelled by the server.' }))).toBe(
      false,
    );
  });

  it('is false for a job with no error at all', () => {
    expect(isCancelledUploadJob(job({ phase: 'uploading', error: undefined }))).toBe(false);
  });

  it('is false for undefined', () => {
    expect(isCancelledUploadJob(undefined)).toBe(false);
  });
});
