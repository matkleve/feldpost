/**
 * Pre-upload geocode disambiguation: grouping, search, gate (OD-3).
 * @see docs/specs/service/media-upload-service/upload-location-resolution.md
 */

import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';
import { UploadAddressResolutionOrchestrator } from '../address-resolution/upload-address-resolution.orchestrator';
import { UploadJobStateService } from '../support/upload-job-state.service';
import { UploadLocationDisambiguationStoreService } from './upload-location-disambiguation-store.service';
import { UploadLocationSourceConflictService } from './upload-location-source-conflict.service';
import { UploadLocationPlacementService } from './upload-location-placement.service';
import { UploadLocationTrayFlowService } from './upload-location-tray-flow.service';
import { UploadLocationDisambiguationRegistrationService } from './upload-location-disambiguation-registration.service';
import type { DisambiguationRegistrationInput } from './upload-location-disambiguation-registration.helpers';
import { UploadLocationPreResolveOrchestratorService } from './upload-location-pre-resolve-orchestrator.service';
import { UploadLocationCandidateApplyService } from './upload-location-candidate-apply.service';
import { isJobBlocked } from './upload-location-resolution.helpers';
import type { ExifCoords } from '../upload.types';
import type {
  DisambiguationRequiredEvent,
  DisambiguationResolvedEvent,
  UploadAddressCandidate,
  UploadDisambiguationGroup,
  UploadJob,
} from '../upload-manager.types';

@Injectable({ providedIn: 'root' })
export class UploadLocationResolutionService {
  private readonly orchestrator = inject(UploadAddressResolutionOrchestrator);
  private readonly jobState = inject(UploadJobStateService);
  private readonly disambiguationStore = inject(UploadLocationDisambiguationStoreService);
  private readonly sourceConflict = inject(UploadLocationSourceConflictService);
  private readonly placement = inject(UploadLocationPlacementService);
  private readonly trayFlow = inject(UploadLocationTrayFlowService);
  private readonly disambiguationRegistration = inject(UploadLocationDisambiguationRegistrationService);
  private readonly preResolveOrchestrator = inject(UploadLocationPreResolveOrchestratorService);
  private readonly candidateApply = inject(UploadLocationCandidateApplyService);

  private readonly batchProjectTrayRegistered = new Set<string>();

  /** @internal collaborator hook for registration / tray-flow */
  notifyDisambiguationRequired(event: DisambiguationRequiredEvent): void {
    this._disambiguationRequired$.next(event);
  }

  /** @internal collaborator hook for tray-flow layer package completion */
  notifyDisambiguationResolved(event: DisambiguationResolvedEvent): void {
    this._disambiguationResolved$.next(event);
  }

  readonly disambiguationGroups = this.disambiguationStore.disambiguationGroups;
  readonly selectedGroupId = this.disambiguationStore.selectedGroupId;
  readonly groupsById = this.disambiguationStore.groupsById;
  readonly pendingGroupCount = this.disambiguationStore.pendingGroupCount;
  readonly activeGroup = this.disambiguationStore.activeGroup;

  private readonly _disambiguationRequired$ = new Subject<DisambiguationRequiredEvent>();
  private readonly _disambiguationResolved$ = new Subject<DisambiguationResolvedEvent>();

  readonly disambiguationRequired$: Observable<DisambiguationRequiredEvent> =
    this._disambiguationRequired$.asObservable();
  readonly disambiguationResolved$: Observable<DisambiguationResolvedEvent> =
    this._disambiguationResolved$.asObservable();

  isJobBlockedByGate(job: UploadJob): boolean {
    return isJobBlocked(job, this.groupsById());
  }

  setSelectedGroupId(groupId: string | null): void {
    this.disambiguationStore.setSelectedGroupId(groupId);
  }

  clearBatch(batchId: string): void {
    this.disambiguationStore.removeGroupsForBatch(batchId);
    this.orchestrator.clearBatch(batchId);
    this.batchProjectTrayRegistered.delete(batchId);
    this.sourceConflict.clearForBatch(batchId);
    this.disambiguationStore.syncBatchDisambiguationAggregates(batchId);
  }

  /**
   * Whether the user already answered source-conflict for this folder grouping.
   * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md § Phase 3
   */
  isSourceConflictResolved(batchId: string, groupingKey: string | undefined | null): boolean {
    return this.sourceConflict.isSourceConflictResolved(batchId, groupingKey);
  }

  /** Stored `selectedCandidateId` for replay when a late job hits Phase 3. */
  getSourceConflictChoice(
    batchId: string,
    groupingKey: string | undefined | null,
  ): string | undefined {
    return this.sourceConflict.getSourceConflictChoice(batchId, groupingKey);
  }

  /**
   * @deprecated Removed — project location is bias-only (Branch B), not an address fallback.
   * @see docs/specs/service/media-upload-service/address-resolution-model.md
   */
  async registerBatchProjectTrayIfNeeded(batchId: string): Promise<void> {
    return this.trayFlow.registerBatchProjectTrayIfNeeded(batchId);
  }

  registerLayerPackageGroupsAfterClassify(batchId: string): void {
    this.trayFlow.registerLayerPackageGroupsAfterClassify(batchId);
  }

  async confirmTrayCity(groupId: string, city: string): Promise<void> {
    return this.trayFlow.confirmTrayCity(groupId, city);
  }

  applyTrayHouseSelection(groupId: string, candidateId: string | null, streetCentroid = false): void {
    this.trayFlow.applyTrayHouseSelection(groupId, candidateId, streetCentroid);
  }

  /** Apply orchestrator cache for a job (Search Object pipeline). */
  async applyPreResolveFromOrchestrator(
    jobId: string,
  ): Promise<'continue' | 'held' | 'partial'> {
    return this.preResolveOrchestrator.applyPreResolveFromOrchestrator(jobId);
  }

  async resolveJobTitleAddress(jobId: string): Promise<'continue' | 'held' | 'failed'> {
    return this.placement.resolveJobTitleAddress(jobId);
  }

  finalizePlacementForJob(jobId: string): boolean {
    return this.placement.finalizePlacementForJob(jobId);
  }

  registerSourceConflictGroup(
    job: UploadJob,
    textCoords: ExifCoords,
    exifCoords: ExifCoords,
  ): Promise<void> {
    return this.sourceConflict.registerSourceConflictGroup(job, textCoords, exifCoords);
  }

  registerDisambiguationGroup(
    input: DisambiguationRegistrationInput,
    options?: { activateTray?: boolean },
  ): void {
    this.disambiguationRegistration.registerDisambiguationGroup(input, options);
  }

  applyCandidateToGroup(groupId: string, candidateId: string): void {
    this.candidateApply.applyCandidateToGroup(groupId, candidateId);
  }

  isolateJobFromGroup(groupId: string, jobId: string): void {
    this.candidateApply.isolateJobFromGroup(groupId, jobId);
  }

  deferGroup(groupId: string): void {
    this.candidateApply.deferGroup(groupId);
  }
}
