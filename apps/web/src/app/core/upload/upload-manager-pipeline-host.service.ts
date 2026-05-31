/**
 * Upload queue drain, per-job pipeline execution, abort controllers.
 */

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { cancelAllActiveUploads } from './upload-manager-cancel-active.util';
import { drainUploadManagerQueue } from './upload-manager-drain.util';
import { handleUploadPipelineError } from './upload-manager-error.util';
import { failUploadManagerJob } from './upload-manager-fail.util';
import {
  abortUploadManagerJobRequest,
  clearUploadAbortController,
  ensureUploadAbortController,
} from './upload-manager-lifecycle.util';
import { runUploadPipelineByMode } from './upload-manager-run-route.util';
import { UploadAttachPipelineService } from './upload-attach-pipeline.service';
import { UploadJobStateService, TERMINAL_PHASES } from './upload-job-state.service';
import { UploadLocationResolutionService } from './upload-location-resolution.service';
import type { PipelineContext } from './upload-manager.types';
import { UploadNewPipelineService } from './upload-new-pipeline.service';
import { UploadQueueService } from './upload-queue.service';
import { UploadReplacePipelineService } from './upload-replace-pipeline.service';
import type { UploadPhase } from './upload-manager.types';

@Injectable({ providedIn: 'root' })
export class UploadManagerPipelineHostService {
  private static readonly LOG_JOB_ID_PREFIX_LEN = '00000000'.length;

  private readonly jobState = inject(UploadJobStateService);
  private readonly queue = inject(UploadQueueService);
  private readonly supabase = inject(SupabaseService);
  private readonly locationResolution = inject(UploadLocationResolutionService);
  private readonly newPipeline = inject(UploadNewPipelineService);
  private readonly replacePipeline = inject(UploadReplacePipelineService);
  private readonly attachPipeline = inject(UploadAttachPipelineService);

  private readonly abortControllers = new Map<string, AbortController>();

  drainQueue(pipelineCtx: PipelineContext): void {
    drainUploadManagerQueue({
      snapshotJobs: () => this.jobState.snapshot(),
      availableSlots: () => this.queue.availableSlots,
      isJobBlocked: (job) => this.locationResolution.isJobBlockedByGate(job),
      isJobRunning: (jobId) => this.queue.isRunning(jobId),
      ensureAbortController: (jobId) => {
        this.ensureAbortController(jobId);
      },
      markRunning: (jobId) => {
        this.queue.markRunning(jobId);
      },
      runPipeline: (jobId) => {
        void this.runPipeline(jobId, pipelineCtx);
      },
      logJobIdPrefixLen: UploadManagerPipelineHostService.LOG_JOB_ID_PREFIX_LEN,
    });
  }

  kickQueueAfterLocationGate(pipelineCtx: PipelineContext): void {
    this.drainQueue(pipelineCtx);
  }

  async runPipeline(jobId: string, pipelineCtx: PipelineContext): Promise<void> {
    try {
      const job = this.jobState.findJob(jobId);
      if (!job) {
        console.error('[upload-manager] runPipeline: job not found for', jobId);
        return;
      }
      if (job.mediaId) {
        if (job.phase === 'queued') {
          this.jobState.setPhase(jobId, 'complete');
        }
        return;
      }

      await runUploadPipelineByMode(job, {
        runReplace: (id) => this.replacePipeline.run(id, pipelineCtx),
        runAttach: (id) => this.attachPipeline.run(id, pipelineCtx),
        runNew: (id) => this.newPipeline.run(id, pipelineCtx),
        logJobIdPrefixLen: UploadManagerPipelineHostService.LOG_JOB_ID_PREFIX_LEN,
      });

      console.log(
        `[upload-manager] runPipeline: job ${jobId.slice(0, UploadManagerPipelineHostService.LOG_JOB_ID_PREFIX_LEN)} pipeline finished`,
      );
    } catch (err) {
      handleUploadPipelineError(jobId, err, {
        findJob: (id) => this.jobState.findJob(id) ?? undefined,
        markDone: (id) => {
          this.queue.markDone(id);
        },
        emitBatchProgress: (batchId) => {
          pipelineCtx.emitBatchProgress(batchId);
        },
        drainQueue: () => {
          this.drainQueue(pipelineCtx);
        },
        failJob: (id, failedAt, error) => {
          this.failJob(id, failedAt, error, pipelineCtx);
        },
        logJobIdPrefixLen: UploadManagerPipelineHostService.LOG_JOB_ID_PREFIX_LEN,
      });
    } finally {
      clearUploadAbortController(this.abortControllers, jobId);
      if (this.queue.isRunning(jobId)) {
        this.queue.markDone(jobId);
        this.drainQueue(pipelineCtx);
      }
    }
  }

  failJob(
    jobId: string,
    failedAt: UploadPhase,
    error: string,
    pipelineCtx: PipelineContext,
  ): void {
    failUploadManagerJob(jobId, failedAt, error, {
      abortJobRequest: (id) => {
        this.abortJobRequest(id);
      },
      markDone: (id) => {
        this.queue.markDone(id);
      },
      failJobState: (id, phase, message) => {
        this.jobState.failJob(id, phase, message);
      },
      findJob: (id) => this.jobState.findJob(id) ?? undefined,
      emitBatchProgress: (batchId) => {
        pipelineCtx.emitBatchProgress(batchId);
      },
      drainQueue: () => {
        this.drainQueue(pipelineCtx);
      },
    });
  }

  cancelAllActive(): void {
    cancelAllActiveUploads({
      snapshotJobs: () => this.jobState.snapshot(),
      isTerminalPhase: (phase) => TERMINAL_PHASES.has(phase),
      abortJobRequest: (jobId) => {
        this.abortJobRequest(jobId);
      },
      markDone: (jobId) => {
        this.queue.markDone(jobId);
      },
      removeStoragePath: (storagePath) => {
        this.supabase.client.storage.from('media').remove([storagePath]);
      },
      markCancelledSignedOut: (jobId, failedAt) => {
        this.jobState.updateJob(jobId, {
          phase: 'error',
          statusLabel: 'Cancelled',
          error: 'Upload cancelled — user signed out.',
          failedAt,
        });
      },
    });
  }

  getAbortSignal(jobId: string): AbortSignal | undefined {
    return this.abortControllers.get(jobId)?.signal;
  }

  abortJobRequest(jobId: string): void {
    abortUploadManagerJobRequest(this.abortControllers, jobId);
  }

  private ensureAbortController(jobId: string): AbortController {
    return ensureUploadAbortController(this.abortControllers, jobId);
  }
}
