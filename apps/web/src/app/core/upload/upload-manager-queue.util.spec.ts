import { describe, expect, it } from 'vitest';
import type { UploadJob } from './upload-manager.types';
import { selectQueuedJobsForStart } from './upload-manager-queue.util';

function job(overrides: Partial<UploadJob>): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File([], 'a.jpg'),
    phase: 'queued',
    mode: 'new',
    progress: 0,
    ...overrides,
  } as UploadJob;
}

describe('selectQueuedJobsForStart', () => {
  it('skips queued jobs that already have mediaId', () => {
    const selected = selectQueuedJobsForStart(
      [job({ id: 'done', mediaId: 'media-1' }), job({ id: 'pending' })],
      3,
    );
    expect(selected.map((entry) => entry.id)).toEqual(['pending']);
  });
});
