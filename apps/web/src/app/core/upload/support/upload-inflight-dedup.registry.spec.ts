import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearInflightDedupRegistryForTests,
  lookupInflightDedupHash,
  tryRegisterInflightDedupHash,
  unregisterInflightDedupHash,
} from './upload-inflight-dedup.registry';

describe('upload-inflight-dedup.registry', () => {
  beforeEach(() => {
    clearInflightDedupRegistryForTests();
  });

  it('reserves a hash for the first job and rejects a second reservation', () => {
    expect(tryRegisterInflightDedupHash('hash-a', { jobId: 'job-1', registeredByUserId: 'user-1' })).toBe(
      true,
    );
    expect(tryRegisterInflightDedupHash('hash-a', { jobId: 'job-2', registeredByUserId: 'user-1' })).toBe(
      false,
    );
    expect(lookupInflightDedupHash('hash-a')?.jobId).toBe('job-1');
  });

  it('unregisters only the owning job', () => {
    tryRegisterInflightDedupHash('hash-a', { jobId: 'job-1', registeredByUserId: 'user-1' });
    unregisterInflightDedupHash('hash-a', 'job-2');
    expect(lookupInflightDedupHash('hash-a')?.jobId).toBe('job-1');

    unregisterInflightDedupHash('hash-a', 'job-1');
    expect(lookupInflightDedupHash('hash-a')).toBeUndefined();
  });
});
