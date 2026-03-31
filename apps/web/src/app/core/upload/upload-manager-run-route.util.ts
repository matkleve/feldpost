/**\n * runUploadPipelineByMode() — Route job to correct pipeline by mode.\n * Delegates to UploadNewPipelineService, UploadReplacePipelineService, or UploadAttachPipelineService\n * based on job.mode. Entry point for pipeline execution.\n */\n\nimport type { UploadJob } from './upload-manager.types';

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

  console.log(
    `[upload-manager] runPipeline: routing job ${shortId} via mode=${job.mode}, targetImageId=${job.targetImageId}`,
  );

  if (job.mode === 'replace') {
    console.log('[upload-manager] → replacePipeline.run()');
    await deps.runReplace(job.id);
  } else if (job.mode === 'attach') {
    console.log('[upload-manager] → attachPipeline.run()');
    await deps.runAttach(job.id);
  } else {
    console.log('[upload-manager] → newPipeline.run()');
    await deps.runNew(job.id);
  }
}
