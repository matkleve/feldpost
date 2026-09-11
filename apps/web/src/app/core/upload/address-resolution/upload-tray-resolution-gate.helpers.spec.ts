import { describe, expect, it } from 'vitest';
import {
  areAllJobsReadyForTrayResolution,
  isJobReadyForTrayResolution,
  requiresFilePrepareForTrayQuestion,
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
  it('requiresFilePrepareForTrayQuestion is false for path-only question kinds', () => {
    expect(requiresFilePrepareForTrayQuestion('upload.resolver.question.layerPackage')).toBe(
      false,
    );
    expect(requiresFilePrepareForTrayQuestion('upload.resolver.question.adminLevelConflict')).toBe(
      false,
    );
    expect(requiresFilePrepareForTrayQuestion('upload.resolver.question.cityStep')).toBe(true);
  });

  it('isJobReadyForTrayResolution requires awaiting_disambiguation and filePrepareComplete', () => {
    expect(
      isJobReadyForTrayResolution(
        job({ phase: 'parsing_exif', filePrepareComplete: false }),
      ),
    ).toBe(false);
    expect(
      isJobReadyForTrayResolution(
        job({
          phase: 'awaiting_disambiguation',
          file: new File([], 'x.heic', { type: 'image/heic' }),
          filePrepareComplete: false,
        }),
      ),
    ).toBe(false);
    expect(
      isJobReadyForTrayResolution(
        job({
          phase: 'awaiting_disambiguation',
          file: new File([], 'x.heic', { type: 'image/heic' }),
          filePrepareComplete: true,
        }),
      ),
    ).toBe(true);
  });

  it('HEIC file is ready when filePrepareComplete even before conversion', () => {
    expect(
      isJobReadyForTrayResolution(
        job({
          phase: 'awaiting_disambiguation',
          file: new File([], 'iphone.heic', { type: 'image/heic' }),
          filePrepareComplete: true,
        }),
        { questionKey: 'upload.resolver.question.cityStep' },
      ),
    ).toBe(true);
  });

  it('path-only questions do not require filePrepareComplete', () => {
    expect(
      isJobReadyForTrayResolution(
        job({
          phase: 'awaiting_disambiguation',
          file: new File([], 'x.heic', { type: 'image/heic' }),
          filePrepareComplete: false,
        }),
        { questionKey: 'upload.resolver.question.layerPackage' },
      ),
    ).toBe(true);
  });

  it('text answers do not require filePrepareComplete', () => {
    expect(
      isJobReadyForTrayResolution(
        job({
          phase: 'awaiting_disambiguation',
          filePrepareComplete: false,
        }),
        { answerKind: 'text' },
      ),
    ).toBe(true);
  });

  it('areAllJobsReadyForTrayResolution is false when any live job is not ready', () => {
    const jobs = new Map([
      ['a', job({ id: 'a', phase: 'awaiting_disambiguation', filePrepareComplete: true })],
      [
        'b',
        job({
          id: 'b',
          phase: 'awaiting_disambiguation',
          file: new File([], 'x.heic', { type: 'image/heic' }),
          filePrepareComplete: false,
        }),
      ],
    ]);
    expect(
      areAllJobsReadyForTrayResolution(['a', 'b'], (id) => jobs.get(id), {
        questionKey: 'upload.resolver.question.cityStep',
      }),
    ).toBe(false);
  });

  it('NF-11: prunes dead jobs so one cancelled job does not block the tray gate', () => {
    const jobs = new Map([
      ['a', job({ id: 'a', phase: 'awaiting_disambiguation', filePrepareComplete: true })],
      ['b', job({ id: 'b', phase: 'missing_data' })],
    ]);
    expect(
      areAllJobsReadyForTrayResolution(['a', 'b'], (id) => jobs.get(id), {
        questionKey: 'upload.resolver.question.cityStep',
      }),
    ).toBe(true);
  });
});
