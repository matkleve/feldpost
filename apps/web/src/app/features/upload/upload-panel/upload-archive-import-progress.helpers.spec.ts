import { describe, expect, it } from 'vitest';
import type { UploadBatch, UploadJob } from '../../../core/upload/upload-manager.types';
import {
  computeArchiveImportProgress,
  shouldShowArchiveImportProgress,
} from './upload-archive-import-progress.helpers';

function batch(overrides: Partial<UploadBatch> = {}): UploadBatch {
  return {
    id: 'batch-1',
    label: 'Archive',
    totalFiles: 3,
    completedFiles: 0,
    skippedFiles: 0,
    failedFiles: 0,
    overallProgress: 0,
    status: 'uploading',
    startedAt: new Date(),
    importMode: 'archive',
    ...overrides,
  };
}

function job(overrides: Partial<UploadJob> & Pick<UploadJob, 'id' | 'phase'>): UploadJob {
  return {
    batchId: 'batch-1',
    file: new File([], 'a.jpg'),
    fileName: 'a.jpg',
    progress: 0,
    ...overrides,
  } as UploadJob;
}

describe('computeArchiveImportProgress', () => {
  it('counts missing_data as imported and address_deferred as awaiting', () => {
    // Spec: import is done when uploaded or terminally failed — missing_data is that.
    // @see upload-archive-import-mode.md § What "done" means
    const figures = computeArchiveImportProgress(batch(), [
      job({ id: '1', phase: 'complete' }),
      job({ id: '2', phase: 'missing_data', issueKind: 'address_deferred' }),
      job({ id: '3', phase: 'uploading' }),
    ]);

    expect(figures).toEqual({
      filesImported: 2,
      filesFailed: 0,
      filesTotal: 3,
      itemsAwaitingResolution: 1,
    });
  });

  // A failed upload has no bytes in storage. Counting it as imported is the one thing the
  // figure must never do. @see docs/CONSTITUTION.md § no silent failure
  it('counts a failed upload as failed, never as imported', () => {
    const figures = computeArchiveImportProgress(batch(), [
      job({ id: '1', phase: 'complete' }),
      job({ id: '2', phase: 'error' }),
      job({ id: '3', phase: 'uploading' }),
    ]);

    expect(figures.filesImported).toBe(1);
    expect(figures.filesFailed).toBe(1);
  });

  it('keeps imported and awaiting independent — one file can be both', () => {
    const figures = computeArchiveImportProgress(batch({ totalFiles: 2 }), [
      job({ id: '1', phase: 'missing_data', issueKind: 'address_deferred' }),
      job({ id: '2', phase: 'missing_data', issueKind: 'address_deferred' }),
    ]);

    expect(figures.filesImported).toBe(2);
    expect(figures.itemsAwaitingResolution).toBe(2);
    expect(figures.filesImported + figures.itemsAwaitingResolution).toBeGreaterThan(
      figures.filesTotal,
    );
  });
});

describe('shouldShowArchiveImportProgress', () => {
  it('shows while an archive batch is uploading', () => {
    const figures = { filesImported: 0, filesFailed: 0, filesTotal: 10, itemsAwaitingResolution: 0 };
    expect(shouldShowArchiveImportProgress(batch({ status: 'uploading' }), figures)).toBe(true);
  });

  it('shows after complete while a backlog remains', () => {
    const figures = { filesImported: 10, filesFailed: 0, filesTotal: 10, itemsAwaitingResolution: 4 };
    expect(shouldShowArchiveImportProgress(batch({ status: 'complete' }), figures)).toBe(true);
  });

  it('hides when complete and backlog is empty', () => {
    const figures = { filesImported: 10, filesFailed: 0, filesTotal: 10, itemsAwaitingResolution: 0 };
    expect(shouldShowArchiveImportProgress(batch({ status: 'complete' }), figures)).toBe(false);
  });

  it('hides for interactive batches', () => {
    const figures = { filesImported: 1, filesFailed: 0, filesTotal: 1, itemsAwaitingResolution: 0 };
    expect(
      shouldShowArchiveImportProgress(batch({ importMode: 'interactive' }), figures),
    ).toBe(false);
  });
});
