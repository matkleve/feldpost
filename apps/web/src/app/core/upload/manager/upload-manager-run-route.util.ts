/**
 * runUploadPipelineByMode() — Route job to correct pipeline by mode.
 * Delegates to UploadNewPipelineService, UploadReplacePipelineService, or UploadAttachPipelineService
 * based on job.mode. Entry point for pipeline execution.
 */

import type { UploadJob } from '../upload-manager.types';
import { uploadManagerDebugLog } from '../support/upload-manager-debug.util';

export interface RunUploadPipelineByModeDeps {
  runReplace: (jobId: string) => Promise<void>;
  runAttach: (jobId: string) => Promise<void>;
  runNew: (jobId: string) => Promise<void>;
  logJobIdPrefixLen: number;
}

export async function runUploadPipelineByMode(
  job: UploadJob,
  deps: RunUploadPipelineByModeDeps,
): Promise<void> {
  const shortId = job.id.slice(0, deps.logJobIdPrefixLen);

  uploadManagerDebugLog(
    `[upload-manager] runPipeline: routing job ${shortId} via mode=${job.mode}, targetMediaId=${job.targetMediaId}`,
  );

  if (job.mode === 'replace') {
    uploadManagerDebugLog('[upload-manager] → replacePipeline.run()');
    await deps.runReplace(job.id);
  } else if (job.mode === 'attach') {
    uploadManagerDebugLog('[upload-manager] → attachPipeline.run()');
    await deps.runAttach(job.id);
  } else {
    uploadManagerDebugLog('[upload-manager] → newPipeline.run()');
    await deps.runNew(job.id);
  }
}
