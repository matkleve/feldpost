/**
 * Pre-upload geocode disambiguation: grouping, search, gate (OD-3).
 * @see docs/specs/service/media-upload-service/upload-location-resolution.md
 */

import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';
import { GeocodingService } from '../geocoding/geocoding.service';
import { UploadAddressResolutionOrchestrator } from './upload-address-resolution.orchestrator';
import { UploadBatchService } from './upload-batch.service';
import { UploadJobStateService } from './upload-job-state.service';
import { UploadLocationConfigService } from './upload-location-config.service';
import { UploadProjectLocationsAdapter } from './adapters/upload-project-locations.adapter';
import { detectProjectAddressTrayScenario } from './upload-batch-project-tray.helpers';
import type { UploadGroupResolutionState } from './upload-address-resolution.types';
import {
  buildChosenPlacementPatch,
  buildGeocodeCandidatePatch,
  buildSourceConflictCandidates,
  getExifMetadataCoords,
  haversineMeters,
  resolvePlacementAfterTextGeocode,
  resolvePlacementWithoutText,
  SOURCE_CONFLICT_EXIF_CANDIDATE_ID,
  SOURCE_CONFLICT_TEXT_CANDIDATE_ID,
} from './upload-location-precedence.helpers';
import {
  buildDisambiguationQueryKey,
  buildSearchQuery,
  classifySearchHits,
  deriveFolderDisplayPath,
  deriveLocalityHint,
  isGroupBlocked,
  isJobBlocked,
  pickCollapseStage,
  isExifAuthoritativeOverWeakFilenameStreet,
} from './upload-location-resolution.helpers';
import {
  summarizeGeocodeHits,
  summarizeGroupState,
  summarizeJobPlacement,
  summarizeSearchObject,
  uploadAddressDebug,
  uploadPlacementLog,
} from './upload-address-resolution.debug';
import type { ExifCoords } from './upload.types';
import { UploadLocationTrayProducerAdapter } from '../upload-resolver-tray-orchestrator/adapters/upload-location-tray-producer.adapter';
import { USE_TRAY_ORCHESTRATOR } from '../upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.types';
import type {
  DisambiguationRequiredEvent,
  DisambiguationResolvedEvent,
  UploadAddressCandidate,
  UploadDisambiguationGroup,
  UploadJob,
} from './upload-manager.types';

@Injectable({ providedIn: 'root' })
export class UploadLocationResolutionService {
  private readonly geocoding = inject(GeocodingService);
  private readonly orchestrator = inject(UploadAddressResolutionOrchestrator);
  private readonly jobState = inject(UploadJobStateService);
  private readonly batchService = inject(UploadBatchService);
  private readonly locationConfig = inject(UploadLocationConfigService);
  private readonly projectLocations = inject(UploadProjectLocationsAdapter);
  private readonly injector = inject(Injector);

  private readonly batchProjectTrayRegistered = new Set<string>();

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
    this.batchProjectTrayRegistered.delete(batchId);
    this.syncBatchDisambiguationAggregates(batchId);
  }

  /** Step 2 — project address precedence once per batch. */
  async registerBatchProjectTrayIfNeeded(batchId: string): Promise<void> {
    if (this.batchProjectTrayRegistered.has(batchId)) {
      return;
    }
    const jobs = this.jobState.jobs().filter((j) => j.batchId === batchId);
    const projectId = jobs[0]?.projectId;
    if (!projectId) {
      return;
    }
    const rows = await this.projectLocations.listProjectLocations(projectId);
    const scenario = detectProjectAddressTrayScenario(jobs, rows);
    if (!scenario) {
      return;
    }
    this.batchProjectTrayRegistered.add(batchId);
    const kind = scenario === 'a' ? 'project_address_a' : 'project_address_b';
    const candidates: UploadAddressCandidate[] = rows
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => ({
        id: `proj-loc-${r.locationId}`,
        addressLabel: r.addressLabel ?? [r.street, r.city].filter(Boolean).join(', '),
        lat: r.latitude!,
        lng: r.longitude!,
        city: r.city,
        score: 1,
      }));
    this.registerDisambiguationGroup({
      batchId,
      queryKey: `project-address|${projectId}|${scenario}`,
      folderDisplayPath: '',
      titleAddress: candidates[0]?.addressLabel ?? 'Project location',
      jobIds: jobs.map((j) => j.id),
      candidates,
      disambiguationKind: kind,
      trayStep: '2',
    });
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

    if (groupState.status === 'needsTray') {
      if (this.tryApplyExifPlacementForWeakBranchC(groupState)) {
        return 'continue';
      }
      this.registerTrayStepGroup(job.batchId, groupState);
      return 'held';
    }

    if (groupState.status === 'resolved' && groupState.candidate) {
      for (const id of groupState.jobIds) {
        const j = this.jobState.findJob(id);
        if (!j) {
          continue;
        }
        this.applyGeocodeCandidateToJob(id, j, groupState.candidate, groupState.folderDisplayPath);
        const held = this.finalizePlacementForJob(id);
        if (held) {
          return 'held';
        }
      }
      return 'continue';
    }

    if (groupState.status === 'partial') {
      this.markGroupPartial(groupState);
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
        disambiguationKind: 'geocode',
        trayStep: '3',
      });
      return 'held';
    }

    this.markGroupPartial(groupState);
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

    if (!job.titleAddress?.trim()) {
      return 'continue';
    }

    if (job.groupingKey && !job.titleAddressCoords) {
      const orchestrated = await this.applyPreResolveFromOrchestrator(jobId);
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
      this.registerDisambiguationGroup({
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

  private finalizePlacementForJobSync(jobId: string): boolean {
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
        const textCoords = job.titleAddressCoords;
        this.registerSourceConflictGroup(job, textCoords, exifCoords!);
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

  registerSourceConflictGroup(job: UploadJob, textCoords: ExifCoords, exifCoords: ExifCoords): void {
    const folderDisplayPath =
      job.folderDisplayPath ?? deriveFolderDisplayPath(job.relativePath);
    const candidates = buildSourceConflictCandidates(job, textCoords, exifCoords);
    const queryKey = `source|${buildDisambiguationQueryKey(job.titleAddress ?? '', folderDisplayPath)}`;
    this.registerDisambiguationGroup({
      batchId: job.batchId,
      queryKey,
      folderDisplayPath,
      titleAddress: job.titleAddress ?? '',
      jobIds: [job.id],
      candidates,
      localityHint: deriveLocalityHint(job.relativePath),
      disambiguationKind: 'source',
    });
  }

  /**
   * Branch C from filename-only street (e.g. IMG_1121 → "IMG") must not open city tray when EXIF exists.
   * @see upload-manager-pipeline.location-routing.supplement.md — EXIF before weak text
   */
  private tryApplyExifPlacementForWeakBranchC(
    groupState: UploadGroupResolutionState,
  ): boolean {
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

  /** Register Step 1A/1B tray for Branch C or B→C fallback. */
  private registerTrayStepGroup(batchId: string, groupState: UploadGroupResolutionState): void {
    const step = groupState.trayStep ?? '1a';
    const kind = step === '1b' ? 'house_step' : 'city_step';
    this.registerDisambiguationGroup({
      batchId,
      queryKey: buildDisambiguationQueryKey(groupState.groupingKey),
      folderDisplayPath: groupState.folderDisplayPath,
      titleAddress: groupState.titleAddressLabel,
      jobIds: groupState.jobIds,
      candidates: [],
      disambiguationKind: kind,
      trayStep: step,
      confirmedCity: groupState.confirmedCity ?? null,
      step1bGate: step === '1b' ? 'active' : 'disabled',
      projectCentroid: groupState.projectCentroid,
    });
  }

  /** Step 1A: user confirmed city → unlock 1B and load house numbers. */
  async confirmTrayCity(groupId: string, city: string): Promise<void> {
    const group = this._groups().find((g) => g.id === groupId);
    if (!group) {
      return;
    }
    const trimmed = city.trim();
    if (!trimmed) {
      return;
    }
    const job = this.jobState.findJob(group.jobIds[0]);
    const so = job?.groupingKey
      ? this.orchestrator.getGroupState(group.batchId, job.groupingKey)?.searchObject
      : undefined;
    const street = so?.street?.trim() ?? group.titleAddress.split(/\s+/)[0] ?? '';
    const countryCode = so?.country?.trim().toLowerCase() ?? 'at';
    const hits = await this.geocoding.searchStreetHouseNumbers(
      { street, city: trimmed, countryCode },
      { limit: 50, countrycodes: [countryCode] },
    );
    const houseCandidates: UploadAddressCandidate[] = hits.map((h, i) => ({
      id: `hn-${i}-${h.address?.house_number ?? i}`,
      addressLabel: h.displayName,
      lat: h.lat,
      lng: h.lng,
      city: trimmed,
      score: h.importance,
    }));
    this.patchGroup({
      ...group,
      trayStep: '1b',
      confirmedCity: trimmed,
      step1bGate: 'active',
      disambiguationKind: 'house_step',
      houseNumberCandidates: houseCandidates,
      candidates: houseCandidates,
    });
  }

  /** Step 1B: apply selected house number or street centroid. */
  applyTrayHouseSelection(groupId: string, candidateId: string | null, streetCentroid = false): void {
    const group = this._groups().find((g) => g.id === groupId);
    if (!group) {
      return;
    }
    if (streetCentroid) {
      this.deferGroup(groupId);
      return;
    }
    if (candidateId) {
      this.applyCandidateToGroup(groupId, candidateId);
    }
  }

  registerDisambiguationGroup(
    input: {
      batchId: string;
      queryKey: string;
      folderDisplayPath: string;
      titleAddress: string;
      jobIds: string[];
      candidates: UploadAddressCandidate[];
      localityHint?: string;
      disambiguationKind?: UploadDisambiguationGroup['disambiguationKind'];
      trayStep?: UploadDisambiguationGroup['trayStep'];
      confirmedCity?: string | null;
      step1bGate?: UploadDisambiguationGroup['step1bGate'];
      projectCentroid?: UploadDisambiguationGroup['projectCentroid'];
      citySuggestions?: string[];
      houseNumberCandidates?: UploadAddressCandidate[];
    },
    options?: { activateTray?: boolean },
  ): void {
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
        disambiguationKind: input.disambiguationKind ?? 'geocode',
        trayStep: input.trayStep,
        confirmedCity: input.confirmedCity,
        step1bGate: input.step1bGate,
        projectCentroid: input.projectCentroid,
        citySuggestions: input.citySuggestions,
        houseNumberCandidates: input.houseNumberCandidates,
      });

    const jobIds = [...new Set([...group.jobIds, ...input.jobIds])];
    const updated: UploadDisambiguationGroup = {
      ...group,
      jobIds,
      candidates: input.candidates.length ? input.candidates : group.candidates,
      collapseStage: pickCollapseStage(
        input.candidates.length ? input.candidates : group.candidates,
        jobIds.length,
      ),
      disambiguationKind: input.disambiguationKind ?? group.disambiguationKind ?? 'geocode',
      trayStep: input.trayStep ?? group.trayStep,
      confirmedCity: input.confirmedCity ?? group.confirmedCity,
      step1bGate: input.step1bGate ?? group.step1bGate,
      projectCentroid: input.projectCentroid ?? group.projectCentroid,
      citySuggestions: input.citySuggestions ?? group.citySuggestions,
      houseNumberCandidates: input.houseNumberCandidates ?? group.houseNumberCandidates,
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

    if (options?.activateTray !== false) {
      this._selectedGroupId.set(updated.id);
    }
    if (USE_TRAY_ORCHESTRATOR && isGroupBlocked(updated)) {
      this.injector
        .get(UploadLocationTrayProducerAdapter)
        .syncGroupToOrchestrator(updated);
    }
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
      city: so.city ?? group.projectCentroid?.city ?? undefined,
      postcode: so.postcode ?? undefined,
      countryCode,
    };

    let hits;
    if (group.geocodeBranch === 'branch_b' && group.projectCentroid) {
      uploadAddressDebug('geocode', 'edge invoke structured-forward-bias', {
        batchId,
        groupingKey: group.groupingKey,
        request: geocodeRequest,
        bias: group.projectCentroid,
      });
      hits = await this.geocoding.searchStructuredForwardBias(
        {
          ...geocodeRequest,
          lat: group.projectCentroid.lat,
          lng: group.projectCentroid.lng,
          zoom: group.projectCentroid.zoom,
        },
        {
          limit: config.geocodeSearchDefaultLimit,
          countrycodes: [countryCode],
        },
      );
    } else {
      uploadAddressDebug('geocode', 'edge invoke structured-forward', {
        batchId,
        groupingKey: group.groupingKey,
        request: geocodeRequest,
        limit: config.geocodeSearchDefaultLimit,
      });
      hits = await this.geocoding.searchStructuredForward(geocodeRequest, {
        limit: config.geocodeSearchDefaultLimit,
        countrycodes: [countryCode],
      });
    }

    uploadAddressDebug('geocode', 'edge response', {
      hitCount: hits.length,
      hits: summarizeGeocodeHits(hits),
    });

    const sampleJob = this.jobState.findJob(group.jobIds[0]);
    const outcome = classifySearchHits(
      hits,
      config,
      sampleJob ? getExifMetadataCoords(sampleJob) : undefined,
    );

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
        trayStep: '3',
      };
      this.orchestrator.patchGroupState(batchId, ambiguous);
      return ambiguous;
    }

    if (group.geocodeBranch === 'branch_b') {
      const fallbackTray: UploadGroupResolutionState = {
        ...group,
        status: 'needsTray',
        trayStep: '1a',
        geocodeBranch: 'branch_c',
      };
      this.orchestrator.patchGroupState(batchId, fallbackTray);
      return fallbackTray;
    }

    const partial: UploadGroupResolutionState = { ...group, status: 'partial' };
    this.orchestrator.patchGroupState(batchId, partial);
    return partial;
  }

  /** SO/geocode incomplete — do not send to Issues until EXIF / free-text fallback runs (Branch A/B). */
  private markGroupPartial(group: UploadGroupResolutionState): void {
    for (const jobId of group.jobIds) {
      this.jobState.updateJob(jobId, {
        resolutionStatus: 'failed',
        pendingPartialLocation: true,
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
      if (group.disambiguationKind === 'source') {
        if (candidateId === SOURCE_CONFLICT_EXIF_CANDIDATE_ID) {
          const exifCoords = getExifMetadataCoords(job);
          if (exifCoords) {
            this.jobState.updateJob(
              jobId,
              buildChosenPlacementPatch(job, 'exif', exifCoords),
            );
          }
        } else if (candidateId === SOURCE_CONFLICT_TEXT_CANDIDATE_ID && job.titleAddressCoords) {
          this.jobState.updateJob(
            jobId,
            buildChosenPlacementPatch(job, 'text', job.titleAddressCoords),
          );
        }
      } else {
        this.applyGeocodeCandidateToJob(jobId, job, candidate, group.folderDisplayPath);
        const j = this.jobState.findJob(jobId)!;
        this.jobState.updateJob(
          jobId,
          buildChosenPlacementPatch(j, 'text', {
            lat: candidate.lat,
            lng: candidate.lng,
          }),
        );
      }
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

  /**
   * Remove one job from a group and open a dedicated tray card for it (ask later).
   * @see docs/specs/component/upload/upload-resolver-tray.md#affected-media-chip
   */
  isolateJobFromGroup(groupId: string, jobId: string): void {
    const group = this._groups().find((g) => g.id === groupId);
    if (!group?.jobIds.includes(jobId)) {
      return;
    }
    const openBefore = this._groups().filter((g) => isGroupBlocked(g));
    const stayIndex = Math.max(0, openBefore.findIndex((g) => g.id === groupId));
    const remaining = group.jobIds.filter((id) => id !== jobId);
    if (remaining.length > 0) {
      this.patchGroup({
        ...group,
        jobIds: remaining,
        collapseStage: pickCollapseStage(group.candidates, remaining.length),
      });
    } else {
      this._groups.update((prev) => prev.filter((g) => g.id !== groupId));
    }

    this.registerDisambiguationGroup(
      {
        batchId: group.batchId,
        queryKey: `${group.queryKey}::isolate:${jobId}`,
        folderDisplayPath: group.folderDisplayPath,
        titleAddress: group.titleAddress,
        jobIds: [jobId],
        candidates: [...group.candidates],
        localityHint: group.localityHint,
        disambiguationKind: group.disambiguationKind,
      },
      { activateTray: false },
    );

    if (remaining.length > 0) {
      this._selectedGroupId.set(groupId);
      return;
    }

    const open = this._groups().filter((g) => isGroupBlocked(g));
    const isolated = open.find((g) => g.jobIds.length === 1 && g.jobIds[0] === jobId);
    const withoutIsolated = open.filter((g) => g.id !== isolated?.id);
    const nextIndex = Math.min(stayIndex, Math.max(0, withoutIsolated.length - 1));
    this._selectedGroupId.set(withoutIsolated[nextIndex]?.id ?? null);
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
    disambiguationKind?: UploadDisambiguationGroup['disambiguationKind'];
    trayStep?: UploadDisambiguationGroup['trayStep'];
    confirmedCity?: string | null;
    step1bGate?: UploadDisambiguationGroup['step1bGate'];
    projectCentroid?: UploadDisambiguationGroup['projectCentroid'];
    citySuggestions?: string[];
    houseNumberCandidates?: UploadAddressCandidate[];
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
      disambiguationKind: input.disambiguationKind ?? 'geocode',
      trayStep: input.trayStep,
      confirmedCity: input.confirmedCity,
      step1bGate: input.step1bGate,
      projectCentroid: input.projectCentroid,
      citySuggestions: input.citySuggestions,
      houseNumberCandidates: input.houseNumberCandidates,
    };
  }

  private applyGeocodeCandidateToJob(
    jobId: string,
    job: UploadJob,
    candidate: UploadAddressCandidate,
    folderDisplayPath: string,
  ): void {
    this.jobState.updateJob(jobId, buildGeocodeCandidatePatch(candidate, folderDisplayPath));
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
