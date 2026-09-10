import { describe, expect, it, vi } from 'vitest';
import {
  insertDedupHashFireAndForget,
  organizationIdFromStoragePath,
  verifyStoragePathWrite,
} from './upload-db-postwrite.util';

describe('insertDedupHashFireAndForget', () => {
  it('does not throw synchronously when the insert rejects', () => {
    const insert = vi.fn().mockRejectedValue(new Error('insert failed'));

    expect(() =>
      insertDedupHashFireAndForget({
        contentHash: 'hash-1',
        mediaItemId: 'media-1',
        userId: 'user-1',
        organizationId: 'org-1',
        hashAlgo: 'photo_v1',
        insert,
      }),
    ).not.toThrow();
  });

  // @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-35
  it('logs the rejection instead of leaving it unhandled', async () => {
    const rejection = new Error('insert failed');
    const insert = vi.fn().mockRejectedValue(rejection);
    const onError = vi.fn();

    insertDedupHashFireAndForget({
      contentHash: 'hash-1',
      mediaItemId: 'media-1',
      userId: 'user-1',
      organizationId: 'org-1',
      hashAlgo: 'photo_v1',
      insert,
      onError,
    });

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(rejection);
    });
  });

  it('does nothing when contentHash is missing', () => {
    const insert = vi.fn();
    insertDedupHashFireAndForget({
      contentHash: undefined,
      mediaItemId: 'media-1',
      userId: 'user-1',
      organizationId: 'org-1',
      hashAlgo: 'photo_v1',
      insert,
    });
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('organizationIdFromStoragePath', () => {
  it('extracts the first path segment', () => {
    expect(organizationIdFromStoragePath('org-1/user-1/uuid.jpg')).toBe('org-1');
  });

  it('returns undefined for an empty path', () => {
    expect(organizationIdFromStoragePath(undefined)).toBeUndefined();
  });
});

describe('verifyStoragePathWrite', () => {
  const logInfo = vi.fn();
  const logError = vi.fn();

  // @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-15
  it('reports persisted: false when the read-back path does not match what was written', async () => {
    const result = await verifyStoragePathWrite({
      expectedStoragePath: 'org-1/user-1/new.jpg',
      readBack: async () => ({ storagePath: 'org-1/user-1/old.jpg', error: null }),
      logInfo,
      logError,
    });

    expect(result.persisted).toBe(false);
  });

  it('reports persisted: true when the read-back path matches', async () => {
    const result = await verifyStoragePathWrite({
      expectedStoragePath: 'org-1/user-1/new.jpg',
      readBack: async () => ({ storagePath: 'org-1/user-1/new.jpg', error: null }),
      logInfo,
      logError,
    });

    expect(result.persisted).toBe(true);
  });
});
