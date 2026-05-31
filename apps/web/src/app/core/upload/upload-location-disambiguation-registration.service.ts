/**
 * Register / merge disambiguation tray groups and sync batch aggregates.
 * @see docs/specs/service/media-upload-service/upload-location-resolution.md
 */

import { Injectable, Injector, inject } from '@angular/core';
import { UploadJobStateService } from './upload-job-state.service';
import { UploadLocationDisambiguationStoreService } from './upload-location-disambiguation-store.service';
import {
  mergeDisambiguationGroupPatch,
  type DisambiguationRegistrationInput,
} from './upload-location-disambiguation-registration.helpers';
import { UploadLocationResolutionService } from './upload-location-resolution.service';
import { isGroupBlocked } from './upload-location-resolution.helpers';
import { uploadTraceDecision, uploadTraceEnter } from './upload-address-resolution.debug';
import { UploadLocationTrayProducerAdapter } from '../upload-resolver-tray-orchestrator/adapters/upload-location-tray-producer.adapter';
import { UploadPreResolveWaveService } from './upload-pre-resolve-wave.service';
import { USE_TRAY_ORCHESTRATOR } from '../upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.types';
import type { DisambiguationRequiredEvent, UploadDisambiguationGroup } from './upload-manager.types';

@Injectable({ providedIn: 'root' })
export class UploadLocationDisambiguationRegistrationService {
  private readonly jobState = inject(UploadJobStateService);
  private readonly disambiguationStore = inject(UploadLocationDisambiguationStoreService);
  private readonly injector = inject(Injector);

  private resolution(): UploadLocationResolutionService {
    return this.injector.get(UploadLocationResolutionService);
  }

  registerDisambiguationGroup(
    input: DisambiguationRegistrationInput,
    options?: { activateTray?: boolean },
  ): void {
    uploadTraceEnter('tray', 'registerDisambiguationGroup', {
      batchId: input.batchId,
      queryKey: input.queryKey,
      jobIds: input.jobIds,
      disambiguationKind: input.disambiguationKind,
      trayStep: input.trayStep,
      candidateCount: input.candidates.length,
      titleAddress: input.titleAddress,
    });
    const existing = this.disambiguationStore.groups().find(
      (g) => g.batchId === input.batchId && g.queryKey === input.queryKey && isGroupBlocked(g),
    );

    const group =
      existing ??
      this.disambiguationStore.createGroup({
        batchId: input.batchId,
        queryKey: input.queryKey,
        folderDisplayPath: input.folderDisplayPath,
        titleAddress: input.titleAddress,
        localityHint: input.localityHint,
        candidates: input.candidates,
        jobIds: [],
        disambiguationKind: input.disambiguationKind ?? 'geocode',
        trayStep: input.trayStep,
        confirmedCity: input.confirmedCity,
        step1bGate: input.step1bGate,
        projectCentroid: input.projectCentroid,
        citySuggestions: input.citySuggestions,
        houseNumberCandidates: input.houseNumberCandidates,
      });

    const updated = mergeDisambiguationGroupPatch(group, input);
    this.disambiguationStore.patchGroup(updated);
    this.markJobsAwaitingDisambiguation(input, updated);

    if (!existing) {
      this.emitDisambiguationRequired(input, updated);
    }

    uploadTraceDecision('tray', existing ? 'merged into existing group' : 'created new group', {
      groupId: updated.id,
      jobCount: updated.jobIds.length,
      disambiguationKind: updated.disambiguationKind,
      trayStep: updated.trayStep,
    });
    if (options?.activateTray !== false) {
      this.disambiguationStore.selectGroupId(updated.id);
    }
    this.syncTrayOrchestratorIfNeeded(input, updated, !existing);
    this.disambiguationStore.syncBatchDisambiguationAggregates(input.batchId);
  }

  private markJobsAwaitingDisambiguation(
    input: DisambiguationRegistrationInput,
    updated: UploadDisambiguationGroup,
  ): void {
    for (const jobId of input.jobIds) {
      this.jobState.setPhase(jobId, 'awaiting_disambiguation');
      this.jobState.updateJob(jobId, {
        disambiguationGroupId: updated.id,
        resolutionStatus: 'pending',
        issueKind: 'address_ambiguous',
        addressCandidates: input.candidates,
        folderDisplayPath: input.folderDisplayPath,
        statusLabel: 'Choose address',
      });
    }
  }

  private emitDisambiguationRequired(
    input: DisambiguationRegistrationInput,
    updated: UploadDisambiguationGroup,
  ): void {
    const requiredEvent: DisambiguationRequiredEvent = {
      batchId: input.batchId,
      groupId: updated.id,
      queryKey: input.queryKey,
      jobIds: updated.jobIds,
      candidateCount: input.candidates.length,
    };
    this.resolution().notifyDisambiguationRequired(requiredEvent);
  }

  private syncTrayOrchestratorIfNeeded(
    input: DisambiguationRegistrationInput,
    updated: UploadDisambiguationGroup,
    isNewGroup: boolean,
  ): void {
    if (!USE_TRAY_ORCHESTRATOR || !isGroupBlocked(updated)) {
      return;
    }
    this.injector.get(UploadLocationTrayProducerAdapter).syncGroupToOrchestrator(updated);
    if (isNewGroup) {
      this.injector.get(UploadPreResolveWaveService).notifyFirstTrayReady(input.batchId, {
        groupId: updated.id,
        queryKey: input.queryKey,
        disambiguationKind: updated.disambiguationKind,
      });
    }
  }
}
