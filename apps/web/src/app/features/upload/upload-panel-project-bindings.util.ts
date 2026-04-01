import type { UploadJob } from '../../core/upload/upload-manager.service';

type UploadJobWithBindings = UploadJob & { projectIds?: string[] };

export function getBoundProjectIds(job: UploadJob): string[] {
  const bindings = (job as UploadJobWithBindings).projectIds;
  if (Array.isArray(bindings) && bindings.length > 0) {
    return [...new Set(bindings.filter((id) => typeof id === 'string' && id.trim().length > 0))];
  }
  return job.projectId ? [job.projectId] : [];
}
