/**
 * Persisted missing_data resolution (RPC location / project assign).
 */

import { Injectable, inject } from '@angular/core';
import {
  describeLocationUpdateRpcError,
  LOCATION_UPDATE_NOT_FOUND_ERROR,
} from '../../media-location-update/media-location-update.helpers';
import { GeocodingService } from '../../geocoding/geocoding.service';
import { ProjectsService } from '../../projects/projects.service';
import { SupabaseService } from '../../supabase/supabase.service';
import {
  capFieldsToPrecisionTier,
  deriveAddressPrecisionFromCandidate,
  deriveAddressPrecisionFromPinReverse,
  geocodeResultToPrecisionFields,
} from '../address-resolution/upload-address-precision.helpers';
import {
  formatUploadFailureMessage,
  uploadFailureMessageToToastText,
} from '../support/upload-error-messages.util';
import { UploadJobStateService, phaseLabel } from '../support/upload-job-state.service';
import type { UploadAddressCandidate } from '../upload-manager.types';
import type { ExifCoords } from '../upload.service';

@Injectable({ providedIn: 'root' })
export class UploadManagerMissingDataService {
  private readonly supabase = inject(SupabaseService);
  private readonly jobState = inject(UploadJobStateService);
  private readonly projects = inject(ProjectsService);
  private readonly geocoding = inject(GeocodingService);

  async resolvePersistedMissingDataLocation(
    jobId: string,
    mediaId: string,
    coords: ExifCoords,
    emitBatchProgress: (batchId: string) => void,
    candidate?: UploadAddressCandidate,
  ): Promise<void> {
    const rpcPayload = candidate
      ? this.buildCandidateLocationPayload(mediaId, coords, candidate)
      : await this.buildPinDropLocationPayload(mediaId, coords);

    const { data, error } = await this.supabase.client.rpc(
      'resolve_media_location',
      rpcPayload,
    );

    if (error || data !== true) {
      const failureMessage = uploadFailureMessageToToastText(
        formatUploadFailureMessage(
          error ? describeLocationUpdateRpcError(error) : LOCATION_UPDATE_NOT_FOUND_ERROR,
        ),
      );
      this.jobState.transitionTo(jobId, 'error', {
        channel: 'user',
        statusLabel: failureMessage,
      });
      this.jobState.updateJob(jobId, {
        issueKind: 'upload_error',
        error: failureMessage,
      });
      return;
    }

    this.jobState.transitionTo(jobId, 'complete', {
      channel: 'user',
      statusLabel: phaseLabel('complete'),
    });
    this.jobState.updateJob(jobId, {
      coords,
      issueKind: undefined,
      locationSourceUsed: 'exif',
    });
    const job = this.jobState.findJob(jobId);
    if (job) {
      emitBatchProgress(job.batchId);
    }
  }

  private buildCandidateLocationPayload(
    mediaId: string,
    coords: ExifCoords,
    candidate: UploadAddressCandidate,
  ): Record<string, unknown> {
    const precision = deriveAddressPrecisionFromCandidate(candidate);
    const rawFields = {
      country: null,
      state: candidate.state ?? null,
      postcode: candidate.postcode ?? null,
      city: candidate.city ?? null,
      street: null,
      houseNumber: null,
    };
    const fields = precision ? capFieldsToPrecisionTier(rawFields, precision) : rawFields;

    return {
      p_media_item_id: mediaId,
      p_latitude: coords.lat,
      p_longitude: coords.lng,
      p_address_label: candidate.addressLabel,
      p_city: fields.city,
      p_district: candidate.district ?? null,
      p_postcode: fields.postcode,
      p_address_precision: precision,
    };
  }

  private async buildPinDropLocationPayload(
    mediaId: string,
    coords: ExifCoords,
  ): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {
      p_media_item_id: mediaId,
      p_latitude: coords.lat,
      p_longitude: coords.lng,
      p_address_precision: null,
    };

    try {
      const reverse = await this.geocoding.reverse(coords.lat, coords.lng);
      if (!reverse) {
        return payload;
      }

      const precision = deriveAddressPrecisionFromPinReverse(reverse);
      const fields = precision
        ? capFieldsToPrecisionTier(geocodeResultToPrecisionFields(reverse), precision)
        : geocodeResultToPrecisionFields(reverse);

      payload['p_address_label'] = reverse.addressLabel;
      payload['p_city'] = fields.city;
      payload['p_district'] = reverse.district;
      payload['p_street'] = fields.street;
      payload['p_house_number'] = fields.houseNumber;
      payload['p_postcode'] = fields.postcode;
      payload['p_country'] = fields.country;
      payload['p_address_precision'] = precision;
    } catch {
      // Coords-only persist with null precision when reverse fails.
    }

    return payload;
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
      this.jobState.transitionTo(jobId, 'error', {
        channel: 'user',
        statusLabel: errorLabel,
      });
      this.jobState.updateJob(jobId, {
        issueKind: 'upload_error',
        error: errorLabel,
      });
      return;
    }

    this.jobState.transitionTo(jobId, 'complete', {
      channel: 'user',
      statusLabel: phaseLabel('complete'),
    });
    this.jobState.updateJob(jobId, {
      projectId,
      issueKind: undefined,
    });
    const job = this.jobState.findJob(jobId);
    if (job) {
      emitBatchProgress(job.batchId);
    }
  }
}
