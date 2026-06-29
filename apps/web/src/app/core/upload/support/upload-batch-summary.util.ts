import type { ToastOptions } from '../../toast/toast.types';
import type { BatchCompleteEvent } from '../upload-manager.types';

/**
 * Calm batch-completion summary ("X uploaded · Y already present · Z addresses
 * added"). Returns null for an all-new batch (each row already shows
 * "Uploaded"), so the toast only appears when dedup/merge/failure happened and
 * a one-line recap actually helps.
 */
export function buildBatchSummaryToast(event: BatchCompleteEvent): ToastOptions | null {
  const { completedFiles, skippedFiles, mergedAddressFiles, failedFiles } = event;

  const noteworthy = skippedFiles > 0 || mergedAddressFiles > 0 || failedFiles > 0;
  if (!noteworthy) {
    return null;
  }

  const parts: string[] = [];
  if (completedFiles > 0) {
    parts.push(`${completedFiles} uploaded`);
  }
  if (skippedFiles > 0) {
    parts.push(`${skippedFiles} already present`);
  }
  if (mergedAddressFiles > 0) {
    parts.push(`${mergedAddressFiles} ${mergedAddressFiles === 1 ? 'address' : 'addresses'} added`);
  }
  if (failedFiles > 0) {
    parts.push(`${failedFiles} failed`);
  }

  return {
    title: 'Upload complete',
    body: parts.join(' · '),
    type: failedFiles > 0 ? 'warning' : 'info',
  };
}
