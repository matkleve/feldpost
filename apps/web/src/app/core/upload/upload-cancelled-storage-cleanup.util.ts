import type { UploadJob } from './upload-manager.types';

type CancelledStorageCleanupArgs = {
  cancelled: boolean;
  storagePath: string;
  removeStoragePath: (storagePath: string) => Promise<void>;
  findJob: () => UploadJob | undefined;
  markDone: () => void;
  emitBatchProgress: (batchId: string) => void;
  drainQueue: () => void;
};

export async function handleCancelledStorageCleanup(
  args: CancelledStorageCleanupArgs,
): Promise<boolean> {
  const {
    cancelled,
    storagePath,
    removeStoragePath,
    findJob,
    markDone,
    emitBatchProgress,
    drainQueue,
  } = args;

  if (!cancelled) {
    return false;
  }

  await removeStoragePath(storagePath);
  const cancelledJob = findJob();
  markDone();
  if (cancelledJob) {
    emitBatchProgress(cancelledJob.batchId);
  }
  drainQueue();
  return true;
}
