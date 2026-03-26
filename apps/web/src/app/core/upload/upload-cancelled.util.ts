import type { UploadJob } from './upload-manager.types';

export function isCancelledUploadJob(job: UploadJob | undefined): boolean {
  return job?.phase === 'error' && typeof job.error === 'string' && /cancelled/i.test(job.error);
}
