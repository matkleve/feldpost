/**
 * Register / merge disambiguation tray groups and sync batch aggregates.
 * @see docs/specs/service/media-upload-service/upload-location-resolution.md
 */

import { Injectable, Injector, inject } from '@angular/core';
import { UploadJobStateService } from '../support/upload-job-state.service';
import { UploadLocationDisambiguationStoreService } from './upload-location-disambiguation-store.service';
import {
  buildAwaitingDisambiguationJobPatch,
  mergeDisambiguationGroupPatch,
  type DisambiguationRegistrationInput,
} from './upload-location-disambiguation-registration.helpers';
import { isGroupBlocked } from './upload-location-resolution.helpers';
import {
  uploadTraceDecision,
  uploadTraceEnter,
  uploadTraceExit,
} from '../address-resolution/upload-address-resolution.debug';
import { UploadLocationTrayProducerAdapter } from '../../upload-resolver-tray-orchestrator/adapters/upload-location-tray-producer.adapter';
import { UploadPreResolveWaveService } from '../support/upload-pre-resolve-wave.service';
import type { DisambiguationRequiredEvent, UploadDisambiguationGroup } from '../upload-manager.types';

@Injectable({ providedIn: 'root' })
export class UploadLocationDisambiguationRegistrationService {
  private readonly jobState = inject(UploadJobStateService);
  private readonly disambiguationStore = inject(UploadLocationDisambiguationStoreService);
  private readonly injector = inject(Injector);

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
    // Archive import never asks. A group registered here would mark its jobs
    // `awaiting_disambiguation` — the one phase that mode forbids — and they would sit there
    // waiting on a user with nothing to answer (TRAP-021's shape). Suppressing *presentation* is
    // not enough; the registration itself must not happen.
    // @see docs/specs/service/media-upload-service/upload-archive-import-mode.fsm.supplement.md
    if (this.isArchiveImport(input.jobIds)) {
      uploadTraceDecision('tray', 'archive import — routing to Issues instead of a tray', {
        batchId: input.batchId,
        queryKey: input.queryKey,
        jobIds: input.jobIds,
      });
      this.routeJobsToDeferredIssues(input.jobIds);
      uploadTraceExit('tray', 'registerDisambiguationGroup', 'archive (deferred)');
      return;
    }

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

  /** A batch is an archive import when its jobs say so; absent means interactive. */
  private isArchiveImport(jobIds: readonly string[]): boolean {
    for (const jobId of jobIds) {
      const job = this.jobState.findJob(jobId);
      if (job) {
        return job.importMode === 'archive';
      }
    }
    return false;
  }

  /**
   * Park jobs in the Issues lane instead of a tray. `missing_data` is already terminal and already
   * the Issues lane, so this adds no phase and no new terminal — the archive mode narrows the
   * existing machine rather than introducing a second one.
   */
  private routeJobsToDeferredIssues(jobIds: readonly string[]): void {
    for (const jobId of jobIds) {
      this.jobState.setPhase(jobId, 'missing_data');
      this.jobState.updateJob(jobId, {
        issueKind: 'address_deferred',
        resolutionStatus: 'pending',
        statusLabel: '',
      });
    }
  }

  private markJobsAwaitingDisambiguation(
    input: DisambiguationRegistrationInput,
    updated: UploadDisambiguationGroup,
  ): void {
    for (const jobId of input.jobIds) {
      this.jobState.setPhase(jobId, 'awaiting_disambiguation');
      this.jobState.updateJob(jobId, buildAwaitingDisambiguationJobPatch(input, updated.id));
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
    this.disambiguationStore.notifyDisambiguationRequired(requiredEvent);
  }

  private syncTrayOrchestratorIfNeeded(
    input: DisambiguationRegistrationInput,
    updated: UploadDisambiguationGroup,
    isNewGroup: boolean,
  ): void {
    if (!isGroupBlocked(updated)) {
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
