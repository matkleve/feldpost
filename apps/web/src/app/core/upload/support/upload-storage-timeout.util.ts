/**
 * Race a storage upload promise against a timeout.
 * Shared by new, attach, and replace pipelines.
 *
 * @see docs/audits/upload-flow-review-2026-09-10/02-new-issues.md NF-05
 */

export const DEFAULT_UPLOAD_PHASE_TIMEOUT_MS = 180_000;

export async function runStorageUploadWithTimeout<T>(
  uploadPromise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
  onTimeout?: () => void,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      uploadPromise,
      new Promise<T>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          onTimeout?.();
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
