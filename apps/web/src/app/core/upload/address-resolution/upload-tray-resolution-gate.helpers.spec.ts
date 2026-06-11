import { describe, expect, it } from 'vitest';
import {
  areAllJobsReadyForTrayResolution,
  isJobReadyForTrayResolution,
} from './upload-tray-resolution-gate.helpers';
import type { UploadJob } from '../upload-manager.types';

function job(partial: Partial<UploadJob>): UploadJob {
  return {
    id: 'j1',
    batchId: 'b1',
    file: new File([], 'a.jpg', { type: 'image/jpeg' }),
    phase: 'awaiting_disambiguation',
    progress: 0,
    statusLabel: '',
    submittedAt: new Date(),
    mode: 'new',
    ...partial,
  };
}

describe('upload-tray-resolution-gate.helpers', () => {
  const isHeic = (file: File) => file.name.endsWith('.heic');

  it('isJobReadyForTrayResolution requires awaiting_disambiguation and non-HEIC file', () => {
    expect(
      isJobReadyForTrayResolution(
        job({ phase: 'parsing_exif', file: new File([], 'x.heic') }),
        isHeic,
      ),
    ).toBe(false);
    expect(
      isJobReadyForTrayResolution(
        job({
          phase: 'awaiting_disambiguation',
          file: new File([], 'x.heic', { type: 'image/heic' }),
        }),
        isHeic,
      ),
    ).toBe(false);
    expect(
      isJobReadyForTrayResolution(
        job({ phase: 'awaiting_disambiguation', file: new File([], 'x.jpg') }),
        isHeic,
      ),
    ).toBe(true);
  });

  it('areAllJobsReadyForTrayResolution is false when any job is not ready', () => {
    const jobs = new Map([
      ['a', job({ id: 'a', phase: 'awaiting_disambiguation' })],
      ['b', job({ id: 'b', phase: 'parsing_exif' })],
    ]);
    expect(
      areAllJobsReadyForTrayResolution(['a', 'b'], (id) => jobs.get(id), isHeic),
    ).toBe(false);
  });
});
