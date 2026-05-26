/**
 * Pre-upload geocode disambiguation: grouping, search, gate (OD-3).
 * @see docs/specs/service/media-upload-service/upload-location-resolution.md
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';
import { GeocodingService } from '../geocoding/geocoding.service';
import { UploadAddressResolutionOrchestrator } from './upload-address-resolution.orchestrator';
import { UploadBatchService } from './upload-batch.service';
import { UploadJobStateService } from './upload-job-state.service';
import { UploadLocationConfigService } from './upload-location-config.service';
import type { UploadGroupResolutionState } from './upload-address-resolution.types';
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
import {
  summarizeGeocodeHits,
  summarizeGroupState,
  summarizeSearchObject,
  uploadAddressDebug,
} from './upload-address-resolution.debug';
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
  private readonly orchestrator = inject(UploadAddressResolutionOrchestrator);
  private readonly jobState = inject(UploadJobStateService);
  private readonly batchService = inject(UploadBatchService);
  private readonly locationConfig = inject(UploadLocationConfigService);

  private readonly geocodeInFlight = new Map<string, Promise<UploadGroupResolutionState>>();

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
    this.orchestrator.clearBatch(batchId);
    this.syncBatchDisambiguationAggregates(batchId);
  }

  /**
   * Apply orchestrator cache for a job (Search Object pipeline).
   */
  async applyPreResolveFromOrchestrator(
    jobId: string,
  ): Promise<'continue' | 'held' | 'partial'> {
    const job = this.jobState.findJob(jobId);
    if (!job?.groupingKey) {
      return 'continue';
    }

    let groupState = this.orchestrator.getGroupState(job.batchId, job.groupingKey);
    if (!groupState) {
      uploadAddressDebug('pre-resolve', 'no orchestrator cache for job', {
        jobId,
        batchId: job.batchId,
        groupingKey: job.groupingKey,
      });
      return 'continue';
    }

    uploadAddressDebug('pre-resolve', 'applyPreResolveFromOrchestrator', {
      jobId,
      initial: summarizeGroupState(groupState),
    });

    if (groupState.status === 'needsGeocode') {
      groupState = await this.ensureGeocodedGroup(job.batchId, job.groupingKey, groupState);
    }

    if (groupState.status === 'resolved' && groupState.candidate) {
      for (const id of groupState.jobIds) {
        const j = this.jobState.findJob(id);
        if (!j) {
          continue;
        }
        this.applyResolvedCandidate(id, j, groupState.candidate, groupState.folderDisplayPath);
      }
      return 'continue';
    }

    if (groupState.status === 'partial') {
      this.applyPartialToJobs(groupState);
      return 'partial';
    }

    if (groupState.status === 'ambiguous' && groupState.candidates?.length) {
      this.registerDisambiguationGroup({
        batchId: job.batchId,
        queryKey: buildDisambiguationQueryKey(job.groupingKey),
        folderDisplayPath: groupState.folderDisplayPath,
        titleAddress: groupState.titleAddressLabel,
        jobIds: groupState.jobIds,
        candidates: groupState.candidates,
        localityHint: deriveLocalityHint(job.relativePath),
      });
      return 'held';
    }

    this.applyPartialToJobs(groupState);
    return 'partial';
  }

  /**
   * Legacy free-text search when no grouping key on job.
   */
  async resolveJobTitleAddress(jobId: string): Promise<'continue' | 'held' | 'failed'> {
    const job = this.jobState.findJob(jobId);
    if (!job) {
      return 'continue';
    }

    if (job.groupingKey) {
      const orchestrated = await this.applyPreResolveFromOrchestrator(jobId);
      if (orchestrated === 'held') {
        return 'held';
      }
      return 'continue';
    }

    if (!job.titleAddress?.trim()) {
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
      this.registerDisambiguationGroup({
        batchId: job.batchId,
        queryKey: buildDisambiguationQueryKey(job.titleAddress!, folderDisplayPath),
        folderDisplayPath,
        titleAddress: job.titleAddress!,
        jobIds: [job.id],
        candidates: outcome.candidates,
        localityHint,
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

  registerDisambiguationGroup(input: {
    batchId: string;
    queryKey: string;
    folderDisplayPath: string;
    titleAddress: string;
    jobIds: string[];
    candidates: UploadAddressCandidate[];
    localityHint?: string;
  }): void {
    const existing = this._groups().find(
      (g) => g.batchId === input.batchId && g.queryKey === input.queryKey && isGroupBlocked(g),
    );

    const group =
      existing ??
      this.createGroup({
        batchId: input.batchId,
        queryKey: input.queryKey,
        folderDisplayPath: input.folderDisplayPath,
        titleAddress: input.titleAddress,
        localityHint: input.localityHint,
        candidates: input.candidates,
        jobIds: [],
      });

    const jobIds = [...new Set([...group.jobIds, ...input.jobIds])];
    const updated: UploadDisambiguationGroup = {
      ...group,
      jobIds,
      candidates: input.candidates,
      collapseStage: pickCollapseStage(input.candidates, jobIds.length),
    };
    this.patchGroup(updated);

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

    if (!existing) {
      this._disambiguationRequired$.next({
        batchId: input.batchId,
        groupId: updated.id,
        queryKey: input.queryKey,
        jobIds,
        candidateCount: input.candidates.length,
      });
    }

    this._selectedGroupId.set(updated.id);
    this.syncBatchDisambiguationAggregates(input.batchId);
  }

  private async ensureGeocodedGroup(
    batchId: string,
    groupingKey: string,
    initial: UploadGroupResolutionState,
  ): Promise<UploadGroupResolutionState> {
    const inflightKey = `${batchId}|${groupingKey}`;
    const existing = this.geocodeInFlight.get(inflightKey);
    if (existing) {
      return existing;
    }

    const promise = this.runGeocodeForGroup(batchId, initial);
    this.geocodeInFlight.set(inflightKey, promise);
    try {
      return await promise;
    } finally {
      this.geocodeInFlight.delete(inflightKey);
    }
  }

  private async runGeocodeForGroup(
    batchId: string,
    group: UploadGroupResolutionState,
  ): Promise<UploadGroupResolutionState> {
    const so = group.searchObject;
    const street = [so.street, so.houseNumber].filter(Boolean).join(' ').trim();
    const countryCode = so.country?.trim().toLowerCase();
    if (!street || !countryCode) {
      const partial: UploadGroupResolutionState = { ...group, status: 'partial' };
      this.orchestrator.patchGroupState(batchId, partial);
      uploadAddressDebug('geocode', 'skipped — missing street or country', {
        street,
        countryCode,
        searchObject: summarizeSearchObject(so),
      });
      return partial;
    }

    for (const jobId of group.jobIds) {
      this.jobState.setPhase(jobId, 'resolving_location');
    }

    const config = this.locationConfig.getConfig();
    const geocodeRequest = {
      street,
      city: so.city ?? undefined,
      postcode: so.postcode ?? undefined,
      countryCode,
    };
    uploadAddressDebug('geocode', 'edge invoke structured-forward', {
      batchId,
      groupingKey: group.groupingKey,
      request: geocodeRequest,
      limit: config.geocodeSearchDefaultLimit,
      note: 'Upstream photon vs nominatim is chosen in geocode edge (GEOCODER_FORWARD_URL); see edge logs / X-Feldpost-Geocoder-Upstream header',
    });

    const hits = await this.geocoding.searchStructuredForward(geocodeRequest, {
      limit: config.geocodeSearchDefaultLimit,
      countrycodes: [countryCode],
    });

    uploadAddressDebug('geocode', 'edge response', {
      hitCount: hits.length,
      hits: summarizeGeocodeHits(hits),
    });

    const sampleJob = this.jobState.findJob(group.jobIds[0]);
    const outcome = classifySearchHits(hits, config, sampleJob?.coords);

    uploadAddressDebug('geocode', 'classifySearchHits outcome', {
      kind: outcome.kind,
      candidateCount: outcome.kind === 'ambiguous' ? outcome.candidates.length : undefined,
    });

    if (outcome.kind === 'auto') {
      const resolved: UploadGroupResolutionState = {
        ...group,
        status: 'resolved',
        candidate: outcome.candidate,
      };
      this.orchestrator.patchGroupState(batchId, resolved);
      return resolved;
    }

    if (outcome.kind === 'ambiguous') {
      const ambiguous: UploadGroupResolutionState = {
        ...group,
        status: 'ambiguous',
        candidates: outcome.candidates,
      };
      this.orchestrator.patchGroupState(batchId, ambiguous);
      return ambiguous;
    }

    const partial: UploadGroupResolutionState = { ...group, status: 'partial' };
    this.orchestrator.patchGroupState(batchId, partial);
    return partial;
  }

  private applyPartialToJobs(group: UploadGroupResolutionState): void {
    for (const jobId of group.jobIds) {
      const job = this.jobState.findJob(jobId);
      if (!job) {
        continue;
      }
      const isDocument = job.file.type.startsWith('application/') || job.file.type === 'text/plain';
      this.jobState.setPhase(jobId, 'missing_data');
      this.jobState.updateJob(jobId, {
        resolutionStatus: 'failed',
        pendingPartialLocation: true,
        issueKind: isDocument ? 'document_unresolved' : 'missing_gps',
        disambiguationGroupId: undefined,
      });
    }
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
