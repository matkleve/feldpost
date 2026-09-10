import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isUploadManagerDebugEnabled, uploadManagerDebugLog } from './upload-manager-debug.util';

const STORAGE_KEY = 'feldpost:debug:upload-manager';

describe('isUploadManagerDebugEnabled', () => {
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('is disabled by default', () => {
    expect(isUploadManagerDebugEnabled()).toBe(false);
  });

  it('is enabled once the flag is set', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    expect(isUploadManagerDebugEnabled()).toBe(true);
  });

  it('stays disabled for any value other than "1"', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    expect(isUploadManagerDebugEnabled()).toBe(false);
  });
});

describe('uploadManagerDebugLog', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    localStorage.removeItem(STORAGE_KEY);
  });

  it('does not call console.log when the flag is disabled', () => {
    uploadManagerDebugLog('[upload-manager] noise');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('forwards to console.log when the flag is enabled', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    uploadManagerDebugLog('[upload-manager] noise', { a: 1 });
    expect(logSpy).toHaveBeenCalledWith('[upload-manager] noise', { a: 1 });
  });
});
