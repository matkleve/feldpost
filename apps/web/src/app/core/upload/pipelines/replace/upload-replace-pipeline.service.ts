/**
 * UploadReplacePipelineService — handles the 'replace' upload pipeline.
 *
 * Pipeline phases (Spec: upload-manager-pipeline.md § Replace Upload Pipeline):
 * validating → converting_format → hashing → dedup_check → uploading → replacing_record → complete
 *
 * Purpose: Swap the file on an existing image row, update EXIF metadata, preserve location/project.
 * Triggered by: resolveUploadManagerConflict(jobId, 'use_existing')
 *
 * @see upload-replace-pipeline-run.util.ts prepareReplacePipelineJob, finishReplacePipelineJob
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.md
 */

import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../auth/auth.service';
import { MediaDownloadService } from '../../../media-download/media-download.service';
import { SupabaseService } from '../../../supabase/supabase.service';
import { isCancelledUploadJob } from '../../support/upload-cancelled.util';
import { UploadJobStateService } from '../../support/upload-job-state.service';
import type { PipelineContext } from '../../upload-manager.types';
import { UploadQueueService } from '../../support/upload-queue.service';
import { finishReplacePipelineJob } from './upload-replace-pipeline-finish.util';
import {
  prepareReplacePipelineJob,
  type ReplacePipelineRunDeps,
} from './upload-replace-pipeline-run.util';
import { UploadStorageService } from '../../support/upload-storage.service';
import { UploadService } from '../../upload.service';

@Injectable({ providedIn: 'root' })
export class UploadReplacePipelineService {
  private readonly uploadService = inject(UploadService);
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);
  private readonly mediaDownloadService = inject(MediaDownloadService);
  private readonly jobState = inject(UploadJobStateService);
  private readonly queue = inject(UploadQueueService);
  private readonly storage = inject(UploadStorageService);

  /** Run the replace pipeline for a single job. @see upload-replace-pipeline-run.util.ts */
  async run(jobId: string, ctx: PipelineContext): Promise<void> {
    const abortSignal = ctx.getAbortSignal(jobId);
    const prepared = await prepareReplacePipelineJob(jobId, ctx, this.replaceRunDeps());
    if (!prepared) {
      return;
    }
    await finishReplacePipelineJob(jobId, ctx, prepared, abortSignal, this.replaceRunDeps());
  }

  /** @see upload-replace-pipeline-run.util.ts ReplacePipelineRunDeps */
  private replaceRunDeps(): ReplacePipelineRunDeps {
    return {
      uploadService: this.uploadService,
      supabaseClient: this.supabase.client,
      mediaDownloadService: this.mediaDownloadService,
      jobState: this.jobState,
      queue: this.queue,
      storage: this.storage,
      getUser: () => this.auth.user(),
      isCancelled: (id) => this.isCancelled(id),
    };
  }

  private isCancelled(jobId: string): boolean {
    return isCancelledUploadJob(this.jobState.findJob(jobId));
  }
}
