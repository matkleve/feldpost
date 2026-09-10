/**
 * Opt-in debug logging for upload-manager queue-drain and pipeline-routing trace noise.
 *
 * `drainQueue` fires after every job transition, so leaving these ungated means a
 * large folder import produces thousands of console lines (UP-41).
 *
 * Enable in the browser console (then reload or upload again):
 *   localStorage.setItem('feldpost:debug:upload-manager', '1')
 *
 * Filter DevTools console by `[upload-manager]` or `[attach-pipeline]`.
 * Disable:
 *   localStorage.removeItem('feldpost:debug:upload-manager')
 *
 * @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-41
 * @see ../address-resolution/upload-address-resolution.debug.ts — same pattern, different scope
 */

const STORAGE_KEY = 'feldpost:debug:upload-manager';

export function isUploadManagerDebugEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** `console.log`, gated behind the upload-manager debug flag. */
export function uploadManagerDebugLog(...args: unknown[]): void {
  if (!isUploadManagerDebugEnabled()) {
    return;
  }
  console.log(...args);
}
