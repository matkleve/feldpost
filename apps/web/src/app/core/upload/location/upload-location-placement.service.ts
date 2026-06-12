/**
 * Job placement after geocode: title-address resolve, Phase 3–4 coords, weak Branch C EXIF.
 * @see docs/specs/service/media-upload-service/upload-location-resolution.md
 */

import { Injectable, Injector, inject } from '@angular/core';
import { GeocodingService } from '../../geocoding/geocoding.service';
import { UploadJobStateService } from '../support/upload-job-state.service';
import { UploadLocationConfigService } from './upload-location-config.service';
import { UploadLocationResolutionService } from './upload-location-resolution.service';
import { UploadLocationSourceConflictService } from './upload-location-source-conflict.service';
import {
  buildChosenPlacementPatch,
  buildGeocodeCandidatePatch,
  getExifMetadataCoords,
  haversineMeters,
  isJobEligibleForSourceConflictGroup,
  resolvePlacementAfterTextGeocode,
  resolvePlacementWithoutText,
} from './upload-location-precedence.helpers';
import {
  buildDisambiguationQueryKey,
  buildSearchQuery,
  classifySearchHits,
  deriveFolderDisplayPath,
  deriveLocalityHint,
  isExifAuthoritativeOverWeakFilenameStreet,
} from './upload-location-resolution.helpers';
import {
  summarizeJobPlacement,
  uploadAddressDebug,
  uploadPlacementLog,
  uploadSoMutation,
  uploadTraceDecision,
  uploadTraceEnter,
  uploadTraceExit,
  uploadTrayGate,
} from '../address-resolution/upload-address-resolution.debug';
import type { UploadGroupResolutionState } from '../address-resolution/upload-address-resolution.types';
import type { UploadAddressCandidate, UploadJob } from '../upload-manager.types';

@Injectable({ providedIn: 'root' })
export class UploadLocationPlacementService {
  private readonly geocoding = inject(GeocodingService);
  private readonly jobState = inject(UploadJobStateService);
  private readonly locationConfig = inject(UploadLocationConfigService);
  private readonly sourceConflict = inject(UploadLocationSourceConflictService);
  private readonly injector = inject(Injector);

  private resolution(): UploadLocationResolutionService {
    return this.injector.get(UploadLocationResolutionService);
  }

  applyGeocodeCandidateToJob(
    jobId: string,
    job: UploadJob,
    candidate: UploadAddressCandidate,
    folderDisplayPath: string,
  ): void {
    const patch = buildGeocodeCandidatePatch(candidate, folderDisplayPath);
    uploadSoMutation('geocode', 'titleAddressCoords from Photon candidate (not job.coords yet)', {
      jobId,
      groupingKey: job.groupingKey,
      before: summarizeJobPlacement(job),
      patch: {
        titleAddressCoords: patch.titleAddressCoords,
        addressLabel: candidate.addressLabel,
      },
    });
    this.jobState.updateJob(jobId, patch);
  }

  /**
   * Legacy free-text search when no grouping key on job.
   */
  async resolveJobTitleAddress(jobId: string): Promise<'continue' | 'held' | 'failed'> {
    uploadTraceEnter('ulr', 'resolveJobTitleAddress', { jobId });
    const job = this.jobState.findJob(jobId);
    if (!job) {
      uploadTraceExit('ulr', 'resolveJobTitleAddress', 'continue (no job)');
      return 'continue';
    }

    if (!job.titleAddress?.trim()) {
      uploadTraceDecision('ulr', 'continue — empty titleAddress');
      uploadTraceExit('ulr', 'resolveJobTitleAddress', 'continue');
      return 'continue';
    }

    if (job.groupingKey && !job.titleAddressCoords) {
      const orchestrated = await this.resolution().applyPreResolveFromOrchestrator(jobId);
      if (orchestrated === 'held') {
        return 'held';
      }
      const after = this.jobState.findJob(jobId);
      if (after?.coords || after?.titleAddressCoords) {
        return 'continue';
      }
      if (after?.phase === 'awaiting_disambiguation') {
        return 'held';
      }
    }

    const folderDisplayPath =
      job.folderDisplayPath ?? deriveFolderDisplayPath(job.relativePath);
    const localityHint = deriveLocalityHint(job.relativePath);
    const query = buildSearchQuery(job.titleAddress, localityHint);

    this.jobState.setPhase(jobId, 'resolving_location');
    this.jobState.updateJob(jobId, {
      folderDisplayPath,
      resolutionStatus: 'pending',
    });

    const config = this.locationConfig.getConfig();
    const hits = await this.geocoding.search(query, {
      limit: config.geocodeSearchDefaultLimit,
      countrycodes: ['at'],
    });

    const outcome = classifySearchHits(hits, config, getExifMetadataCoords(job));

    if (outcome.kind === 'auto') {
      this.applyGeocodeCandidateToJob(jobId, job, outcome.candidate, folderDisplayPath);
      return (await this.finalizePlacementForJobAsync(jobId)) ? 'held' : 'continue';
    }

    if (outcome.kind === 'ambiguous') {
      this.resolution().registerDisambiguationGroup({
        batchId: job.batchId,
        queryKey: buildDisambiguationQueryKey(job.titleAddress!, folderDisplayPath),
        folderDisplayPath,
        titleAddress: job.titleAddress!,
        jobIds: [job.id],
        candidates: outcome.candidates,
        localityHint,
        disambiguationKind: 'geocode',
      });
      return 'held';
    }

    if (outcome.kind === 'failed') {
      this.jobState.updateJob(jobId, {
        resolutionStatus: 'failed',
        disambiguationGroupId: undefined,
      });
      return 'continue';
    }

    return 'continue';
  }

  /**
   * Phase 3–4: set job.coords after text geocode + optional source tray.
   * @returns true when job is held for disambiguation
   */
  finalizePlacementForJob(jobId: string): boolean {
    return this.finalizePlacementForJobSync(jobId);
  }

  finalizePlacementForJobSync(jobId: string): boolean {
    const job = this.jobState.findJob(jobId);
    if (!job) {
      return false;
    }
    const config = this.locationConfig.getConfig();

    if (job.titleAddressCoords) {
      const exifCoords = getExifMetadataCoords(job);
      const distanceM =
        exifCoords != null
          ? Math.round(haversineMeters(job.titleAddressCoords, exifCoords))
          : undefined;
      const outcome = resolvePlacementAfterTextGeocode(job, config);
      uploadPlacementLog('P3', jobId, job.file.name, `source agreement → ${outcome.kind}`, {
        distanceM,
        agreeRadiusM: config.sourceAgreementRadiusMeters,
        textCoords: job.titleAddressCoords,
        exifMetadata: exifCoords,
      });
      if (outcome.kind === 'held_source_conflict') {
        const groupingKey = job.groupingKey;
        uploadTrayGate('held for source conflict tray — EXIF far from text geocode pin', {
          jobId,
          groupingKey,
          distanceM,
          titleAddress: job.titleAddress,
          folderDisplayPath: job.folderDisplayPath,
          textCoords: job.titleAddressCoords,
          exifMetadata: exifCoords,
        });
        if (
          groupingKey &&
          this.sourceConflict.isSourceConflictResolved(job.batchId, groupingKey) &&
          isJobEligibleForSourceConflictGroup(job)
        ) {
          const choice = this.sourceConflict.getSourceConflictChoice(job.batchId, groupingKey)!;
          uploadTrayGate('replay stored source-conflict choice', {
            jobId,
            groupingKey,
            replayedChoice: choice,
          });
          this.sourceConflict.applySourceConflictChoiceToJobId(jobId, choice);
          return false;
        }
        const textCoords = job.titleAddressCoords;
        void this.sourceConflict.registerSourceConflictGroup(job, textCoords, exifCoords!);
        return true;
      }
      if (outcome.kind === 'missing_data') {
        return false;
      }
      this.jobState.updateJob(
        jobId,
        buildChosenPlacementPatch(job, 'text', job.titleAddressCoords),
      );
      uploadPlacementLog('P4', jobId, job.file.name, 'placement = folder/file text', {
        ...summarizeJobPlacement(this.jobState.findJob(jobId)!),
      });
      return false;
    }

    const withoutText = resolvePlacementWithoutText(job);
    if (withoutText === 'exif') {
      const exifCoords = getExifMetadataCoords(job)!;
      this.jobState.updateJob(jobId, buildChosenPlacementPatch(job, 'exif', exifCoords));
      uploadPlacementLog('P4', jobId, job.file.name, 'placement = EXIF (no text coords)', {
        ...summarizeJobPlacement(this.jobState.findJob(jobId)!),
      });
      return false;
    }
    return false;
  }

  private async finalizePlacementForJobAsync(jobId: string): Promise<boolean> {
    return this.finalizePlacementForJobSync(jobId);
  }

  /**
   * Branch C from filename-only street (e.g. IMG_1121 → "IMG") must not open city tray when EXIF exists.
   * @see upload-manager-pipeline.location-routing.supplement.md — EXIF before weak text
   */
  tryApplyExifPlacementForWeakBranchC(groupState: UploadGroupResolutionState): boolean {
    if (
      !isExifAuthoritativeOverWeakFilenameStreet(groupState, (id) =>
        this.jobState.findJob(id),
      )
    ) {
      return false;
    }
    for (const jobId of groupState.jobIds) {
      const job = this.jobState.findJob(jobId);
      const exif = job ? getExifMetadataCoords(job) : undefined;
      if (!job || !exif) {
        return false;
      }
      this.jobState.updateJob(jobId, buildChosenPlacementPatch(job, 'exif', exif));
    }
    uploadAddressDebug('pre-resolve', 'EXIF overrides weak Branch C tray', {
      groupingKey: groupState.groupingKey,
      jobIds: groupState.jobIds,
    });
    return true;
  }
}
