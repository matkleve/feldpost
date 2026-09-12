/**
 * Counts job-store writes during a trace run.
 *
 * The scale tier projects total job-store cost as writes × per-write cost; the writes side is
 * measured here rather than assumed.
 *
 * @see docs/playbooks/upload-pipeline-trace.md § Database scale
 */

import type { UploadJobStateService } from '../support/upload-job-state.service';

/** Wrap the injected singleton's `updateJob` and return a reader for the running count. */
export function countJobStoreWrites(jobState: UploadJobStateService): () => number {
  let writes = 0;
  const original = jobState.updateJob.bind(jobState);
  jobState.updateJob = (jobId, patch): void => {
    writes += 1;
    original(jobId, patch);
  };
  return () => writes;
}
