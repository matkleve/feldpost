/**
 * Sanitize file-name extensions for storage object keys.
 *
 * @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-43
 */

const SAFE_STORAGE_EXTENSION_RE = /^[a-z0-9]{1,8}$/;

/** Returns a lowercase extension safe for `{org}/{user}/{uuid}.{ext}` keys. */
export function sanitizeStorageFileExtension(fileName: string, fallback = 'bin'): string {
  const raw = (fileName.split('.').pop() ?? fallback).toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9]/g, '');
  if (!cleaned || !SAFE_STORAGE_EXTENSION_RE.test(cleaned)) {
    return fallback;
  }
  return cleaned;
}
