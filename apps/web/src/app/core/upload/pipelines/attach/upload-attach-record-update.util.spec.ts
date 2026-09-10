import { describe, expect, it, vi } from 'vitest';
import { performAttachRecordUpdate } from './upload-attach-record-update.util';

function buildArgs(overrides: Partial<Parameters<typeof performAttachRecordUpdate>[0]> = {}) {
  return {
    storagePath: 'org-1/user-1/new.jpg',
    originalFilename: 'photo.jpg',
    targetMediaId: 'media-1',
    parsedExif: {},
    conflictResolution: undefined,
    contentHash: 'hash-1',
    contentHashAlgo: 'photo_v1',
    userId: 'user-1',
    fetchExistingRow: vi.fn().mockResolvedValue({
      data: { hasZoomableLocation: false, latitude: null, longitude: null },
      error: null,
    }),
    updateImageRow: vi.fn().mockResolvedValue({ error: null }),
    readBackStoragePath: vi
      .fn()
      .mockResolvedValue({ storagePath: 'org-1/user-1/new.jpg', error: null }),
    removeStoragePath: vi.fn().mockResolvedValue(undefined),
    onFail: vi.fn(),
    onCancelled: vi.fn().mockResolvedValue(false),
    insertDedupHash: vi.fn().mockResolvedValue(undefined),
    logInfo: vi.fn(),
    logError: vi.fn(),
    ...overrides,
  };
}

describe('performAttachRecordUpdate', () => {
  it('returns a result and inserts the dedup hash when the write persists', async () => {
    const args = buildArgs();

    const result = await performAttachRecordUpdate(args);

    expect(result).not.toBeNull();
    expect(args.onFail).not.toHaveBeenCalled();
    expect(args.insertDedupHash).toHaveBeenCalled();
  });

  // @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-15
  it('fails the job and cleans up storage when the read-back shows RLS blocked the write', async () => {
    const args = buildArgs({
      readBackStoragePath: vi
        .fn()
        .mockResolvedValue({ storagePath: 'org-1/user-1/old.jpg', error: null }),
    });

    const result = await performAttachRecordUpdate(args);

    expect(result).toBeNull();
    expect(args.onFail).toHaveBeenCalledWith(
      'replacing_record',
      expect.stringContaining('did not persist'),
    );
    expect(args.removeStoragePath).toHaveBeenCalledWith('org-1/user-1/new.jpg');
    expect(args.insertDedupHash).not.toHaveBeenCalled();
  });
});
