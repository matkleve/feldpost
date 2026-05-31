/**
 * Persisted missing_data resolution (RPC location / project assign).
 */

import { Injectable, inject } from '@angular/core';
import {
  describeLocationUpdateRpcError,
  LOCATION_UPDATE_NOT_FOUND_ERROR,
} from '../media-location-update/media-location-update.helpers';
import { ProjectsService } from '../projects/projects.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  formatUploadFailureMessage,
  uploadFailureMessageToToastText,
} from './upload-error-messages.util';
import { UploadJobStateService, phaseLabel } from './upload-job-state.service';
import type { ExifCoords } from './upload.service';

@Injectable({ providedIn: 'root' })
export class UploadManagerMissingDataService {
  private readonly supabase = inject(SupabaseService);
  private readonly jobState = inject(UploadJobStateService);
  private readonly projects = inject(ProjectsService);

  async resolvePersistedMissingDataLocation(
    jobId: string,
    mediaId: string,
    coords: ExifCoords,
    emitBatchProgress: (batchId: string) => void,
  ): Promise<void> {
    const { data, error } = await this.supabase.client.rpc('resolve_media_location', {
      p_media_item_id: mediaId,
      p_latitude: coords.lat,
      p_longitude: coords.lng,
    });

    if (error || data !== true) {
      const failureMessage = uploadFailureMessageToToastText(
        formatUploadFailureMessage(
          error ? describeLocationUpdateRpcError(error) : LOCATION_UPDATE_NOT_FOUND_ERROR,
        ),
      );
      this.jobState.updateJob(jobId, {
        phase: 'error',
        issueKind: 'upload_error',
        error: failureMessage,
        statusLabel: failureMessage,
      });
      return;
    }

    this.jobState.updateJob(jobId, {
      phase: 'complete',
      statusLabel: phaseLabel('complete'),
      coords,
      issueKind: undefined,
      locationSourceUsed: 'exif',
    });
    const job = this.jobState.findJob(jobId);
    if (job) {
      emitBatchProgress(job.batchId);
    }
  }

  async resolvePersistedMissingDataProject(
    jobId: string,
    mediaId: string,
    projectId: string,
    emitBatchProgress: (batchId: string) => void,
  ): Promise<void> {
    const ok = await this.projects.addMediaToProject(mediaId, projectId);
    if (!ok) {
      const errorLabel = phaseLabel('error');
      this.jobState.updateJob(jobId, {
        phase: 'error',
        issueKind: 'upload_error',
        error: errorLabel,
        statusLabel: errorLabel,
      });
      return;
    }

    this.jobState.updateJob(jobId, {
      phase: 'complete',
      statusLabel: phaseLabel('complete'),
      projectId,
      issueKind: undefined,
    });
    const job = this.jobState.findJob(jobId);
    if (job) {
      emitBatchProgress(job.batchId);
    }
  }
}
