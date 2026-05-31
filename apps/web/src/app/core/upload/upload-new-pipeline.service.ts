/**
 * UploadNewPipelineService ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â handles the 'new' upload pipeline.
 *
 * Pipeline paths (Spec: upload-manager-pipeline.md Ãƒâ€šÃ‚Â§ New Upload Pipeline):
 *  - Path A: GPS found ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ conflict check ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ upload ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ save ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ reverse-geocode
 *  - Path B: address in filename (high confidence) ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ conflict check ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ upload ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ save ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ forward-geocode
 *  - Path C: no GPS + no address ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ phase=missing_data, issueKind=missing_gps (photos) | document_unresolved (docs)
 *
 * Deterministic precedence used by route logic:
 *  1) EXIF GPS (strongest source)
 *  2) High-confidence title address
 *  3) Issues lane (`missing_data`) when no strong source exists
 *
 * Important: low-confidence title parsing is preserved as metadata but is not
 * considered a reliable location anchor for auto-routing.
 *
 * Entry points:
 *  - run(jobId, ctx): Main orchestrator; calls resumeIfAlreadyRoutedNewJob, prepareNewJobForUpload, routePreparedNewJob
 *
 * Delegates to:
 *  - FilenameParserService: Address extraction from filename (confidence scoring)
 *  - UploadConflictService: Photoless row matching
 *  - UploadAttachPipelineService: Conflict resolution (attach mode)
 *  - UploadEnrichmentService: Reverse/forward geocoding, address enrichment
 *  - UploadService: EXIF parsing, file validation, media type detection
 */

import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { FilenameParserService } from '../filename-parser/filename-parser.service';
import { MediaDownloadService } from '../media-download/media-download.service';
import { MediaThumbnailPersistenceService } from '../media-thumbnail/media-thumbnail-persistence.service';
import { MediaPreviewGenerationService } from '../media-thumbnail/media-preview-generation.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UploadAttachPipelineService } from './upload-attach-pipeline.service';
import { isCancelledUploadJob } from './upload-cancelled.util';
import { UploadConflictService } from './upload-conflict.service';
import { UploadEnrichmentService } from './upload-enrichment.service';
import { UploadJobStateService } from './upload-job-state.service';
import { UploadLocationConfigService } from './upload-location-config.service';
import type { PipelineContext } from './upload-manager.types';
import { UploadAddressResolutionOrchestrator } from './upload-address-resolution.orchestrator';
import { UploadLocationResolutionService } from './upload-location-resolution.service';
import {
  prepareNewJobForUpload,
  resumeIfAlreadyRoutedNewJob,
  routePreparedNewJob,
} from './upload-new-prepare-route.util';
import { runPreUploadLocationResolve } from './upload-new-pre-resolve.util';
import { runNewUploadPhase } from './upload-new-run-upload-phase.util';
import { UploadQueueService } from './upload-queue.service';
import { UploadPreResolveWaveService } from './upload-pre-resolve-wave.service';
import { UploadService } from './upload.service';
import type { ExifCoords, ParsedExif } from './upload.service';
import {
  uploadTraceDecision,
  uploadTraceEnter,
  uploadTraceExit,
} from './upload-address-resolution.debug';

@Injectable({ providedIn: 'root' })
export class UploadNewPipelineService {
  private static readonly UPLOAD_PHASE_TIMEOUT_MS = Number('180000');

  private readonly uploadService = inject(UploadService);
  private readonly jobState = inject(UploadJobStateService);
  private readonly queue = inject(UploadQueueService);
  private readonly filenameParser = inject(FilenameParserService);
  private readonly conflictService = inject(UploadConflictService);
  private readonly enrichment = inject(UploadEnrichmentService);
  private readonly locationConfig = inject(UploadLocationConfigService);
  private readonly mediaDownloadService = inject(MediaDownloadService);
  private readonly thumbnailPersistence = inject(MediaThumbnailPersistenceService);
  private readonly previewGeneration = inject(MediaPreviewGenerationService);
  private readonly attachPipeline = inject(UploadAttachPipelineService);
  private readonly locationResolution = inject(UploadLocationResolutionService);
  private readonly addressOrchestrator = inject(UploadAddressResolutionOrchestrator);
  private readonly preResolveWave = inject(UploadPreResolveWaveService);
  private readonly supabase = inject(SupabaseService);

  /** Run the new-upload pipeline for a single job. */
  async run(jobId: string, ctx: PipelineContext): Promise<void> {
    const job = this.jobState.findJob(jobId);
    uploadTraceEnter('pipeline', 'UploadNewPipelineService.run', {
      jobId,
      fileName: job?.file.name,
      batchId: job?.batchId,
    });
    const resumed = await resumeIfAlreadyRoutedNewJob(
      this.prepareRouteDeps,
      jobId,
      ctx,
      this.runUploadPhase.bind(this),
    );
    if (resumed) {
      uploadTraceExit('pipeline', 'UploadNewPipelineService.run', 'resumed');
      return;
    }

    const prepared = await prepareNewJobForUpload(this.prepareRouteDeps, jobId, ctx);
    if (!prepared) {
      uploadTraceExit('pipeline', 'UploadNewPipelineService.run', 'prepare failed');
      return;
    }

    const preResolve = await runPreUploadLocationResolve(
      {
        ...this.prepareRouteDeps,
        locationResolution: this.locationResolution,
        addressOrchestrator: this.addressOrchestrator,
        preResolveWave: this.preResolveWave,
      },
      jobId,
      prepared.parsedExif,
      ctx,
    );
    if (preResolve === 'held' || preResolve === 'dedup_skip') {
      uploadTraceExit('pipeline', 'UploadNewPipelineService.run', preResolve);
      return;
    }

    uploadTraceDecision('pipeline', 'pre-resolve done — route to upload');
    await routePreparedNewJob(
      this.prepareRouteDeps,
      jobId,
      prepared.job,
      prepared.parsedExif,
      ctx,
      this.runUploadPhase.bind(this),
    );
    uploadTraceExit('pipeline', 'UploadNewPipelineService.run', 'routed');
  }

  private isCancelled(jobId: string): boolean {
    return isCancelledUploadJob(this.jobState.findJob(jobId));
  }

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Upload + save + enrich ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

  /**
   * Upload phase: delegates to UploadService, then runs post-upload enrichment.
   * Handles both Path A (has coords) and Path B (has titleAddress, no coords).
   */
  private async runUploadPhase(
    jobId: string,
    coords: ExifCoords | undefined,
    parsedExif: ParsedExif | undefined,
    ctx: PipelineContext,
  ): Promise<void> {
    await runNewUploadPhase({
      jobId,
      coords,
      parsedExif,
      ctx,
      uploadPhaseTimeoutMs: UploadNewPipelineService.UPLOAD_PHASE_TIMEOUT_MS,
      mismatchToleranceMeters: this.locationConfig.getConfig().mismatchToleranceMeters,
      isCancelled: () => this.isCancelled(jobId),
      jobState: this.jobState,
      queue: this.queue,
      uploadService: this.uploadService,
      supabaseClient: this.supabase.client,
      enrich: this.enrichment,
      mediaDownloadService: this.mediaDownloadService,
      thumbnailPersistence: this.thumbnailPersistence,
      previewGeneration: this.previewGeneration,
      getUserId: () => this.auth.user()?.id,
    });
  }

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Conflict check ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

  private readonly auth = inject(AuthService);

  private get prepareRouteDeps(): {
    jobState: UploadJobStateService;
    queue: UploadQueueService;
    uploadService: UploadService;
    filenameParser: FilenameParserService;
    locationConfig: UploadLocationConfigService;
    conflictService: UploadConflictService;
    attachPipeline: UploadAttachPipelineService;
  } {
    return {
      jobState: this.jobState,
      queue: this.queue,
      uploadService: this.uploadService,
      filenameParser: this.filenameParser,
      locationConfig: this.locationConfig,
      conflictService: this.conflictService,
      attachPipeline: this.attachPipeline,
    };
  }
}
