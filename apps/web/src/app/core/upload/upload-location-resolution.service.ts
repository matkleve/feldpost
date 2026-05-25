/**
 * Pre-upload geocode disambiguation: grouping, search, gate (OD-3).
 * @see docs/specs/service/media-upload-service/upload-location-resolution.md
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';
import { GeocodingService } from '../geocoding/geocoding.service';
import { UploadBatchService } from './upload-batch.service';
import { UploadJobStateService } from './upload-job-state.service';
import { UploadLocationConfigService } from './upload-location-config.service';
import {
  buildDisambiguationQueryKey,
  buildSearchQuery,
  classifySearchHits,
  deriveFolderDisplayPath,
  deriveLocalityHint,
  isGroupBlocked,
  isJobBlocked,
  pickCollapseStage,
} from './upload-location-resolution.helpers';
import type {
  DisambiguationRequiredEvent,
  DisambiguationResolvedEvent,
  UploadAddressCandidate,
  UploadDisambiguationGroup,
  UploadJob,
  UploadResolutionStatus,
} from './upload-manager.types';

@Injectable({ providedIn: 'root' })
export class UploadLocationResolutionService {
  private readonly geocoding = inject(GeocodingService);
  private readonly jobState = inject(UploadJobStateService);
  private readonly batchService = inject(UploadBatchService);
  private readonly locationConfig = inject(UploadLocationConfigService);

  private readonly _groups = signal<UploadDisambiguationGroup[]>([]);
  private readonly _selectedGroupId = signal<string | null>(null);

  readonly disambiguationGroups = this._groups.asReadonly();
  readonly selectedGroupId = this._selectedGroupId.asReadonly();

  readonly groupsById = computed(() => {
    const map = new Map<string, UploadDisambiguationGroup>();
    for (const group of this._groups()) {
      map.set(group.id, group);
    }
    return map;
  });

  readonly pendingGroupCount = computed(
    () => this._groups().filter((g) => isGroupBlocked(g)).length,
  );

  readonly activeGroup = computed(() => {
    const selectedId = this._selectedGroupId();
    const groups = this._groups().filter((g) => isGroupBlocked(g));
    if (!groups.length) {
      return null;
    }
    if (selectedId) {
      return groups.find((g) => g.id === selectedId) ?? groups[0];
    }
    return groups[0];
  });

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
    this._selectedGroupId.set(groupId);
    const group = groupId ? this._groups().find((g) => g.id === groupId) : undefined;
    if (group) {
      this.syncBatchDisambiguationAggregates(group.batchId);
    }
  }

  clearBatch(batchId: string): void {
    this._groups.update((prev) => prev.filter((g) => g.batchId !== batchId));
    this.syncBatchDisambiguationAggregates(batchId);
  }

  /**
   * Run GeocodingService.search for a title address; returns whether job may proceed to dedup/route.
   */
  async resolveJobTitleAddress(jobId: string): Promise<'continue' | 'held' | 'failed'> {
    const job = this.jobState.findJob(jobId);
    if (!job?.titleAddress?.trim()) {
      return 'continue';
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

    const outcome = classifySearchHits(hits, config, job.coords);

    if (outcome.kind === 'auto') {
      this.applyResolvedCandidate(jobId, job, outcome.candidate, folderDisplayPath);
      return 'continue';
    }

    if (outcome.kind === 'ambiguous') {
      this.holdJobForDisambiguation(job, folderDisplayPath, localityHint, outcome.candidates);
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

  applyCandidateToGroup(groupId: string, candidateId: string): void {
    const group = this._groups().find((g) => g.id === groupId);
    if (!group) {
      return;
    }
    const candidate = group.candidates.find((c) => c.id === candidateId);
    if (!candidate) {
      return;
    }

    const resolvedGroup: UploadDisambiguationGroup = {
      ...group,
      resolutionStatus: 'resolved',
      resolutionGateOpen: false,
      selectedCandidateId: candidateId,
    };
    this.patchGroup(resolvedGroup);

    for (const jobId of group.jobIds) {
      const job = this.jobState.findJob(jobId);
      if (!job) {
        continue;
      }
      this.applyResolvedCandidate(jobId, job, candidate, group.folderDisplayPath);
      this.jobState.setPhase(jobId, 'queued');
    }

    this._disambiguationResolved$.next({
      batchId: group.batchId,
      groupId: group.id,
      jobIds: [...group.jobIds],
      selectedCandidateId: candidateId,
    });

    this.syncBatchDisambiguationAggregates(group.batchId);
    this.pickNextActiveGroup(group.batchId);
  }

  deferGroup(groupId: string): void {
    const group = this._groups().find((g) => g.id === groupId);
    if (!group) {
      return;
    }
    const deferred: UploadDisambiguationGroup = {
      ...group,
      resolutionGateOpen: false,
      resolutionStatus: 'failed',
    };
    this.patchGroup(deferred);
    for (const jobId of group.jobIds) {
      this.jobState.updateJob(jobId, {
        resolutionStatus: 'failed',
        issueKind: 'missing_gps',
      });
      this.jobState.setPhase(jobId, 'missing_data');
    }
    this.syncBatchDisambiguationAggregates(group.batchId);
    this.pickNextActiveGroup(group.batchId);
  }

  private holdJobForDisambiguation(
    job: UploadJob,
    folderDisplayPath: string,
    localityHint: string | undefined,
    candidates: UploadAddressCandidate[],
  ): void {
    const queryKey = buildDisambiguationQueryKey(job.titleAddress!, folderDisplayPath);
    const existing = this._groups().find(
      (g) => g.batchId === job.batchId && g.queryKey === queryKey && isGroupBlocked(g),
    );

    const group =
      existing ??
      this.createGroup({
        batchId: job.batchId,
        queryKey,
        folderDisplayPath,
        titleAddress: job.titleAddress!,
        localityHint,
        candidates,
        jobIds: [],
      });

    const jobIds = group.jobIds.includes(job.id) ? group.jobIds : [...group.jobIds, job.id];
    const updated: UploadDisambiguationGroup = {
      ...group,
      jobIds,
      candidates,
      collapseStage: pickCollapseStage(candidates, jobIds.length),
    };
    this.patchGroup(updated);

    this.jobState.setPhase(job.id, 'awaiting_disambiguation');
    this.jobState.updateJob(job.id, {
      disambiguationGroupId: updated.id,
      resolutionStatus: 'pending',
      issueKind: 'address_ambiguous',
      addressCandidates: candidates,
      folderDisplayPath,
      statusLabel: 'Choose address',
    });

    if (!existing) {
      this._disambiguationRequired$.next({
        batchId: job.batchId,
        groupId: updated.id,
        queryKey,
        jobIds,
        candidateCount: candidates.length,
      });
    }

    this._selectedGroupId.set(updated.id);
    this.syncBatchDisambiguationAggregates(job.batchId);
  }

  private createGroup(input: {
    batchId: string;
    queryKey: string;
    folderDisplayPath: string;
    titleAddress: string;
    localityHint?: string;
    candidates: UploadAddressCandidate[];
    jobIds: string[];
  }): UploadDisambiguationGroup {
    const id = crypto.randomUUID();
    return {
      id,
      batchId: input.batchId,
      queryKey: input.queryKey,
      folderDisplayPath: input.folderDisplayPath,
      titleAddress: input.titleAddress,
      jobIds: input.jobIds,
      candidates: input.candidates,
      collapseStage: pickCollapseStage(input.candidates, input.jobIds.length || 1),
      resolutionStatus: 'pending',
      resolutionGateOpen: true,
      localityHint: input.localityHint,
    };
  }

  private applyResolvedCandidate(
    jobId: string,
    job: UploadJob,
    candidate: UploadAddressCandidate,
    folderDisplayPath: string,
  ): void {
    this.jobState.updateJob(jobId, {
      coords: { lat: candidate.lat, lng: candidate.lng },
      titleAddressCoords: { lat: candidate.lat, lng: candidate.lng },
      titleAddress: candidate.addressLabel,
      locationSourceUsed: job.titleAddressSource ?? 'file',
      resolutionStatus: 'resolved' as UploadResolutionStatus,
      issueKind: undefined,
      addressCandidates: undefined,
      disambiguationGroupId: undefined,
      folderDisplayPath,
      statusLabel: undefined,
    });
  }

  private patchGroup(group: UploadDisambiguationGroup): void {
    this._groups.update((prev) => {
      const index = prev.findIndex((g) => g.id === group.id);
      if (index < 0) {
        return [...prev, group];
      }
      const next = [...prev];
      next[index] = group;
      return next;
    });
  }

  private syncBatchDisambiguationAggregates(batchId: string): void {
    const pending = this._groups().filter(
      (g) => g.batchId === batchId && isGroupBlocked(g),
    ).length;
    const activeId = this._selectedGroupId();
    this.batchService.updateBatch(batchId, {
      pendingDisambiguationCount: pending,
      activeDisambiguationGroupId: pending > 0 ? activeId : null,
    });
  }

  private pickNextActiveGroup(batchId: string): void {
    const next = this._groups().find((g) => g.batchId === batchId && isGroupBlocked(g));
    this._selectedGroupId.set(next?.id ?? null);
    this.syncBatchDisambiguationAggregates(batchId);
  }
}
