/**
 * Source-conflict tray: resolution record, registration, apply choice to jobs.
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md § Phase 3
 */

import { Injectable, Injector, inject } from '@angular/core';
import { GeocodingService } from '../geocoding/geocoding.service';
import { UploadAddressResolutionOrchestrator } from './upload-address-resolution.orchestrator';
import { UploadJobStateService } from './upload-job-state.service';
import { UploadLocationDisambiguationStoreService } from './upload-location-disambiguation-store.service';
import { UploadLocationResolutionService } from './upload-location-resolution.service';
import {
  applySourceConflictChoiceToJob,
  buildSourceConflictCandidates,
  buildSourceConflictQueryKey,
  clearDisambiguationJobFields,
  collectSourceConflictJobIds,
  isJobEligibleForSourceConflictGroup,
  labelFromFolderDisplayPath,
  resolveFolderSourceOptionLabel,
} from './upload-location-precedence.helpers';
import {
  buildDisambiguationQueryKey,
  deriveFolderDisplayPath,
  deriveLocalityHint,
  isGroupBlocked,
} from './upload-location-resolution.helpers';
import { uploadAddressDebug, uploadTrayGate } from './upload-address-resolution.debug';
import type { ExifCoords } from './upload.types';
import type { UploadAddressCandidate, UploadDisambiguationGroup, UploadJob } from './upload-manager.types';

@Injectable({ providedIn: 'root' })
export class UploadLocationSourceConflictService {
  private readonly geocoding = inject(GeocodingService);
  private readonly orchestrator = inject(UploadAddressResolutionOrchestrator);
  private readonly jobState = inject(UploadJobStateService);
  private readonly disambiguationStore = inject(UploadLocationDisambiguationStoreService);
  private readonly injector = inject(Injector);

  /**
   * Stored tray choice per `queryKey` (`source|{groupingKey}`) for late-job replay.
   * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md § Phase 3 — source-conflict resolution record
   */
  private readonly resolvedSourceChoices = new Map<string, Map<string, string>>();

  private readonly sourceConflictInflight = new Map<string, Promise<void>>();

  private resolution(): UploadLocationResolutionService {
    return this.injector.get(UploadLocationResolutionService);
  }

  clearForBatch(batchId: string): void {
    this.resolvedSourceChoices.delete(batchId);
    for (const key of [...this.sourceConflictInflight.keys()]) {
      if (key.startsWith(`${batchId}|`)) {
        this.sourceConflictInflight.delete(key);
      }
    }
  }

  isSourceConflictResolved(batchId: string, groupingKey: string | undefined | null): boolean {
    return this.getSourceConflictChoice(batchId, groupingKey) !== undefined;
  }

  getSourceConflictChoice(
    batchId: string,
    groupingKey: string | undefined | null,
  ): string | undefined {
    if (!groupingKey?.trim()) {
      return undefined;
    }
    const queryKey = buildSourceConflictQueryKey(groupingKey);
    return this.resolvedSourceChoices.get(batchId)?.get(queryKey);
  }

  markSourceConflictResolved(batchId: string, queryKey: string, candidateId: string): void {
    let byQuery = this.resolvedSourceChoices.get(batchId);
    if (!byQuery) {
      byQuery = new Map();
      this.resolvedSourceChoices.set(batchId, byQuery);
    }
    byQuery.set(queryKey, candidateId);
  }

  registerSourceConflictGroup(
    job: UploadJob,
    textCoords: ExifCoords,
    exifCoords: ExifCoords,
  ): Promise<void> {
    return this.registerSourceConflictGroupAsync(job, textCoords, exifCoords);
  }

  applySourceConflictChoiceToJobId(
    jobId: string,
    candidateId: string,
    candidate?: UploadAddressCandidate,
  ): void {
    const job = this.jobState.findJob(jobId);
    if (!job || job.mediaId || job.phase === 'complete') {
      return;
    }
    const result = applySourceConflictChoiceToJob(job, candidateId, candidate);
    if (result.kind === 'placement') {
      this.jobState.updateJob(jobId, result.patch);
      this.jobState.setPhase(jobId, 'queued');
      return;
    }
    if (result.kind === 'skipped_no_exif' || result.kind === 'defer') {
      this.jobState.updateJob(jobId, {
        ...clearDisambiguationJobFields(),
        resolutionStatus: 'failed',
        issueKind: 'missing_gps',
      });
      this.jobState.setPhase(jobId, 'missing_data');
    }
  }

  applySourceCandidateToGroup(
    group: UploadDisambiguationGroup,
    candidateId: string,
    candidate: UploadAddressCandidate,
  ): void {
    const resolvedGroup: UploadDisambiguationGroup = {
      ...group,
      resolutionStatus: 'resolved',
      resolutionGateOpen: false,
      selectedCandidateId: candidateId,
    };
    this.disambiguationStore.patchGroup(resolvedGroup);
    this.markSourceConflictResolved(group.batchId, group.queryKey, candidateId);

    for (const jobId of group.jobIds) {
      const job = this.jobState.findJob(jobId);
      if (!job || job.mediaId) {
        continue;
      }
      this.applySourceConflictChoiceToJobId(jobId, candidateId, candidate);
    }
  }

  private sourceConflictInflightKey(batchId: string, queryKey: string): string {
    return `${batchId}|${queryKey}`;
  }

  private async registerSourceConflictGroupAsync(
    job: UploadJob,
    textCoords: ExifCoords,
    exifCoords: ExifCoords,
  ): Promise<void> {
    const folderDisplayPath =
      job.folderDisplayPath ?? deriveFolderDisplayPath(job.relativePath);
    const groupingKey =
      job.groupingKey ?? buildDisambiguationQueryKey(job.titleAddress ?? '', folderDisplayPath);
    const queryKey = buildSourceConflictQueryKey(groupingKey);

    if (this.isSourceConflictResolved(job.batchId, groupingKey)) {
      uploadTrayGate('registerSourceConflict skipped — queryKey already resolved', {
        batchId: job.batchId,
        queryKey,
        groupingKey,
      });
      return;
    }

    const inflightKey = this.sourceConflictInflightKey(job.batchId, queryKey);
    const existingInflight = this.sourceConflictInflight.get(inflightKey);
    if (existingInflight) {
      await existingInflight;
      return;
    }

    const inflight = this.executeRegisterSourceConflictGroupRun(
      job,
      textCoords,
      exifCoords,
      folderDisplayPath,
      groupingKey,
      queryKey,
    ).finally(() => {
      this.sourceConflictInflight.delete(inflightKey);
    });
    this.sourceConflictInflight.set(inflightKey, inflight);
    await inflight;
  }

  private async executeRegisterSourceConflictGroupRun(
    job: UploadJob,
    textCoords: ExifCoords,
    exifCoords: ExifCoords,
    folderDisplayPath: string,
    groupingKey: string,
    queryKey: string,
  ): Promise<void> {
    if (this.isSourceConflictResolved(job.batchId, groupingKey)) {
      return;
    }
    if (this.mergeBlockedSourceConflictGroup(job, folderDisplayPath, groupingKey, queryKey)) {
      return;
    }
    await this.registerFreshSourceConflictGroup(
      job,
      textCoords,
      exifCoords,
      folderDisplayPath,
      groupingKey,
      queryKey,
    );
  }

  private mergeBlockedSourceConflictGroup(
    job: UploadJob,
    folderDisplayPath: string,
    groupingKey: string,
    queryKey: string,
  ): boolean {
    const blocked = this.disambiguationStore.groups().find(
      (g) =>
        g.batchId === job.batchId &&
        g.queryKey === queryKey &&
        isGroupBlocked(g),
    );
    if (!blocked) {
      return false;
    }
    const jobIds = collectSourceConflictJobIds(
      this.jobState.jobs(),
      job.batchId,
      groupingKey,
    );
    if (jobIds.length) {
      const mergeTitle =
        labelFromFolderDisplayPath(folderDisplayPath) ?? job.titleAddress?.trim() ?? '';
      this.resolution().registerDisambiguationGroup({
        batchId: job.batchId,
        queryKey,
        folderDisplayPath,
        titleAddress: mergeTitle,
        jobIds,
        candidates: blocked.candidates,
        localityHint: deriveLocalityHint(job.relativePath),
        disambiguationKind: 'source',
      });
    }
    return true;
  }

  private async registerFreshSourceConflictGroup(
    job: UploadJob,
    textCoords: ExifCoords,
    exifCoords: ExifCoords,
    folderDisplayPath: string,
    groupingKey: string,
    queryKey: string,
  ): Promise<void> {
    const [folderRev, photoRev] = await Promise.all([
      this.geocoding.reverse(textCoords.lat, textCoords.lng),
      this.geocoding.reverse(exifCoords.lat, exifCoords.lng),
    ]);
    const reverseLabel = folderRev?.addressLabel?.trim() ?? '';
    const groupState = groupingKey
      ? this.orchestrator.getGroupState(job.batchId, groupingKey)
      : undefined;
    const folderPathLabel = labelFromFolderDisplayPath(folderDisplayPath);
    const folderAddress =
      resolveFolderSourceOptionLabel({ job, groupState, reverseGeocodeLabel: reverseLabel }) ||
      `${textCoords.lat.toFixed(4)}, ${textCoords.lng.toFixed(4)}`;
    const trayTitleAddress = folderPathLabel ?? job.titleAddress?.trim() ?? '';
    uploadAddressDebug('ulr', 'source conflict folder option label', {
      batchId: job.batchId,
      groupingKey,
      folderDisplayPath,
      parsedFolderTitle: job.titleAddress,
      reverseGeocodeOfTextPin: reverseLabel,
      chosenFolderOptionLabel: folderAddress,
      textCoords,
      labelSource: groupState?.searchObject
        ? 'search_object_label'
        : job.titleAddress?.trim()
          ? 'title_address'
          : reverseLabel
            ? 'reverse_geocode'
            : 'coords_fallback',
    });
    const photoAddress =
      photoRev?.addressLabel?.trim() ||
      `${exifCoords.lat.toFixed(4)}, ${exifCoords.lng.toFixed(4)}`;
    const candidates = buildSourceConflictCandidates({
      folderAddress,
      photoAddress,
      textCoords,
      exifCoords,
    });
    const jobIds = collectSourceConflictJobIds(
      this.jobState.jobs(),
      job.batchId,
      groupingKey,
    );
    const eligibleIds = jobIds.length
      ? jobIds
      : isJobEligibleForSourceConflictGroup(job)
        ? [job.id]
        : [];
    if (!eligibleIds.length) {
      return;
    }
    this.resolution().registerDisambiguationGroup({
      batchId: job.batchId,
      queryKey,
      folderDisplayPath,
      titleAddress: trayTitleAddress,
      jobIds: eligibleIds,
      candidates,
      localityHint: deriveLocalityHint(job.relativePath),
      disambiguationKind: 'source',
    });
  }
}
