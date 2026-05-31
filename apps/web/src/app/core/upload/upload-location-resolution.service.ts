/**
 * Pre-upload geocode disambiguation: grouping, search, gate (OD-3).
 * @see docs/specs/service/media-upload-service/upload-location-resolution.md
 */

import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';
import { GeocodingService } from '../geocoding/geocoding.service';
import { LocalGeoDataAdapter } from '../location-path-parser/local-geo-data.adapter';
import {
  detectPackageConflicts,
  formatPackageLabel,
  layerKeyToCandidateId,
  resolveLayersForJob,
  resolveSOWithChosenLayer,
} from '../location-path-parser/upload-search-object.layer-map';
import { OrgSearchTuningService } from '../search/org-search-tuning.service';
import { UploadAddressResolutionOrchestrator } from './upload-address-resolution.orchestrator';
import { UploadBatchService } from './upload-batch.service';
import { UploadJobStateService } from './upload-job-state.service';
import { UploadLocationConfigService } from './upload-location-config.service';
import { UploadProjectLocationsAdapter } from './adapters/upload-project-locations.adapter';
import type { UploadGroupResolutionState } from './upload-address-resolution.types';
import {
  applySourceConflictChoiceToJob,
  buildChosenPlacementPatch,
  buildGeocodeCandidatePatch,
  buildSourceConflictCandidates,
  buildSourceConflictQueryKey,
  clearDisambiguationJobFields,
  labelFromFolderDisplayPath,
  resolveFolderSourceOptionLabel,
  getExifMetadataCoords,
  haversineMeters,
  resolvePlacementAfterTextGeocode,
  resolvePlacementWithoutText,
  SOURCE_CONFLICT_BOTH_CANDIDATE_ID,
  SOURCE_CONFLICT_EXIF_CANDIDATE_ID,
  SOURCE_CONFLICT_NONE_CANDIDATE_ID,
  SOURCE_CONFLICT_TEXT_CANDIDATE_ID,
} from './upload-location-precedence.helpers';
import {
  buildDisambiguationQueryKey,
  buildGroupPresentation,
  buildSearchQuery,
  classifySearchHits,
  deriveFolderDisplayPath,
  deriveLocalityHint,
  isGroupBlocked,
  isJobBlocked,
  pickCollapseStage,
  pickDiscriminatingField,
  isExifAuthoritativeOverWeakFilenameStreet,
  shouldForceBranchCCityTray,
  shouldSplitGroupByPhotonUnitCoords,
  filterGeocodeHitsByContextDistance,
} from './upload-location-resolution.helpers';
import {
  summarizeGeocodeHits,
  summarizeGroupState,
  summarizeJobPlacement,
  summarizeSearchObject,
  uploadAddressDebug,
  uploadPlacementLog,
  uploadSoMutation,
  uploadTrayGate,
  uploadTraceDecision,
  uploadTraceEnter,
  uploadTraceExit,
} from './upload-address-resolution.debug';
import type { ExifCoords } from './upload.types';
import { UploadLocationTrayProducerAdapter } from '../upload-resolver-tray-orchestrator/adapters/upload-location-tray-producer.adapter';
import { UploadPreResolveWaveService } from './upload-pre-resolve-wave.service';
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
  private readonly geoData = inject(LocalGeoDataAdapter);
  private readonly orgSearchTuning = inject(OrgSearchTuningService);
  private readonly injector = inject(Injector);

  private geoLoaded: Promise<{
    states: Awaited<ReturnType<LocalGeoDataAdapter['getBundeslaender']>>;
    municipalities: Awaited<ReturnType<LocalGeoDataAdapter['getGemeinden']>>;
    postcodeMap: Awaited<ReturnType<LocalGeoDataAdapter['getPlzMap']>>;
  }> | null = null;

  private loadGeoData() {
    if (!this.geoLoaded) {
      this.geoLoaded = Promise.all([
        this.geoData.getBundeslaender(),
        this.geoData.getGemeinden(),
        this.geoData.getPlzMap(),
      ]).then(([states, municipalities, postcodeMap]) => ({
        states,
        municipalities,
        postcodeMap,
      }));
    }
    return this.geoLoaded;
  }

  private readonly batchProjectTrayRegistered = new Set<string>();

  private readonly geocodeInFlight = new Map<string, Promise<UploadGroupResolutionState>>();

  /**
   * Stored tray choice per `queryKey` (`source|{groupingKey}`) for late-job replay.
   * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md § Phase 3 — source-conflict resolution record
   */
  private readonly resolvedSourceChoices = new Map<string, Map<string, string>>();

  private readonly sourceConflictInflight = new Map<string, Promise<void>>();

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
    this.resolvedSourceChoices.delete(batchId);
    for (const key of [...this.sourceConflictInflight.keys()]) {
      if (key.startsWith(`${batchId}|`)) {
        this.sourceConflictInflight.delete(key);
      }
    }
    this.syncBatchDisambiguationAggregates(batchId);
  }

  /**
   * Whether the user already answered source-conflict for this folder grouping.
   * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md § Phase 3
   */
  isSourceConflictResolved(batchId: string, groupingKey: string | undefined | null): boolean {
    return this.getSourceConflictChoice(batchId, groupingKey) !== undefined;
  }

  /** Stored `selectedCandidateId` for replay when a late job hits Phase 3. */
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

  private markSourceConflictResolved(
    batchId: string,
    queryKey: string,
    candidateId: string,
  ): void {
    let byQuery = this.resolvedSourceChoices.get(batchId);
    if (!byQuery) {
      byQuery = new Map();
      this.resolvedSourceChoices.set(batchId, byQuery);
    }
    byQuery.set(queryKey, candidateId);
  }

  private sourceConflictInflightKey(batchId: string, queryKey: string): string {
    return `${batchId}|${queryKey}`;
  }

  /**
   * @deprecated Removed — project location is bias-only (Branch B), not an address fallback.
   * @see docs/specs/service/media-upload-service/address-resolution-model.md
   */
  async registerBatchProjectTrayIfNeeded(_batchId: string): Promise<void> {
    return;
  }

  /**
   * Register layer_package trays after classifyBatch — before Photon.
   * @see docs/specs/service/media-upload-service/upload-search-object.layer-map.md#tray-registration
   */
  registerLayerPackageGroupsAfterClassify(batchId: string): void {
    const states = this.orchestrator
      .listGroupStates(batchId)
      .filter((s) => s.status === 'needsLayerResolution');
    for (const state of states) {
      this.registerLayerPackageGroup(batchId, state);
    }
  }

  /**
   * Package conflict tray — one option per conflicting layer entry.
   * @see docs/specs/service/media-upload-service/upload-search-object.layer-map.md#package-conflict-detection
   */
  private registerLayerPackageGroup(
    batchId: string,
    state: UploadGroupResolutionState,
  ): void {
    const queryKey = state.layerConflictQueryKey ?? state.groupingKey;
    const layers = state.addressLayers ?? [];
    const conflict = detectPackageConflicts(layers, state.folderDisplayPath);
    const entries = conflict?.conflictingEntries ?? layers.filter((e) =>
      [e.parsed.street, e.parsed.houseNumber, e.parsed.staircase, e.parsed.door].some(
        (v) => !!v?.trim(),
      ),
    );
    const candidates: UploadAddressCandidate[] = entries.map((entry) => ({
      id: layerKeyToCandidateId(entry.layerKey),
      addressLabel: formatPackageLabel(entry),
      lat: 0,
      lng: 0,
    }));
    this.registerDisambiguationGroup({
      batchId,
      queryKey,
      folderDisplayPath: state.folderDisplayPath,
      titleAddress: state.titleAddressLabel,
      jobIds: state.jobIds,
      candidates,
      disambiguationKind: 'layer_package',
    });
  }

  /**
   * Apply orchestrator cache for a job (Search Object pipeline).
   */
  async applyPreResolveFromOrchestrator(
    jobId: string,
  ): Promise<'continue' | 'held' | 'partial'> {
    uploadTraceEnter('ulr', 'applyPreResolveFromOrchestrator', { jobId });
    const job = this.jobState.findJob(jobId);
    if (!job?.groupingKey) {
      uploadTraceDecision('ulr', 'continue — job has no groupingKey', { jobId });
      uploadTraceExit('ulr', 'applyPreResolveFromOrchestrator', 'continue');
      return 'continue';
    }

    let groupState = this.orchestrator.getGroupState(job.batchId, job.groupingKey);
    if (!groupState) {
      uploadAddressDebug('pre-resolve', 'no orchestrator cache for job', {
        jobId,
        batchId: job.batchId,
        groupingKey: job.groupingKey,
      });
      uploadTraceDecision('ulr', 'continue — no orchestrator cache', {
        batchId: job.batchId,
        groupingKey: job.groupingKey,
      });
      uploadTraceExit('ulr', 'applyPreResolveFromOrchestrator', 'continue');
      return 'continue';
    }

    uploadAddressDebug('pre-resolve', 'applyPreResolveFromOrchestrator', {
      jobId,
      initial: summarizeGroupState(groupState),
    });
    uploadTraceDecision('ulr', `orchestrator group status=${groupState.status}`, {
      ...summarizeGroupState(groupState),
    });

    if (groupState.status === 'needsLayerResolution') {
      uploadTraceDecision('ulr', 'held — layer_package tray before geocode', {
        layerConflictQueryKey: groupState.layerConflictQueryKey,
      });
      this.registerLayerPackageGroup(job.batchId, groupState);
      uploadTraceExit('ulr', 'applyPreResolveFromOrchestrator', 'held (layer_package)');
      return 'held';
    }

    if (groupState.status === 'needsGeocode') {
      uploadTraceDecision('ulr', 'ensureGeocodedGroup — group needs geocode first');
      groupState = await this.ensureGeocodedGroup(job.batchId, job.groupingKey, groupState);
      uploadTraceDecision('ulr', `after geocode status=${groupState.status}`, summarizeGroupState(groupState));
    }

    if (groupState.status === 'needsTray') {
      if (this.tryApplyExifPlacementForWeakBranchC(groupState)) {
        uploadTraceExit('ulr', 'applyPreResolveFromOrchestrator', 'continue (exif weak branch c)');
        return 'continue';
      }
      uploadTraceDecision('ulr', 'held — register tray step', {
        trayStep: groupState.trayStep,
        geocodeBranch: groupState.geocodeBranch,
      });
      this.registerTrayStepGroup(job.batchId, groupState);
      uploadTraceExit('ulr', 'applyPreResolveFromOrchestrator', 'held');
      return 'held';
    }

    if (groupState.status === 'resolved' && groupState.candidate) {
      uploadTraceDecision('ulr', 'resolved — apply candidate to jobs', {
        candidateId: groupState.candidate.id,
        addressLabel: groupState.candidate.addressLabel,
      });
      for (const id of groupState.jobIds) {
        const j = this.jobState.findJob(id);
        if (!j) {
          continue;
        }
        this.applyGeocodeCandidateToJob(id, j, groupState.candidate, groupState.folderDisplayPath);
        const held = this.finalizePlacementForJob(id);
        if (held) {
          uploadTraceExit('ulr', 'applyPreResolveFromOrchestrator', 'held (source conflict)');
          return 'held';
        }
      }
      uploadTraceExit('ulr', 'applyPreResolveFromOrchestrator', 'continue');
      return 'continue';
    }

    if (groupState.status === 'partial') {
      uploadTraceDecision('ulr', 'partial — markGroupPartial', { groupingKey: groupState.groupingKey });
      this.markGroupPartial(groupState);
      uploadTraceExit('ulr', 'applyPreResolveFromOrchestrator', 'partial');
      return 'partial';
    }

    if (groupState.status === 'ambiguous' && groupState.candidates?.length) {
      if (groupState.geocodeBranch === 'branch_c') {
        uploadTraceDecision('ulr', 'held — branch_c ambiguous → city_step tray 1a', {
          candidateCount: groupState.candidates.length,
          discriminatingField: groupState.discriminatingField,
        });
        const discriminatingField =
          groupState.discriminatingField ??
          pickDiscriminatingField(groupState.candidates) ??
          undefined;
        this.registerDisambiguationGroup({
          batchId: job.batchId,
          queryKey: buildDisambiguationQueryKey(job.groupingKey),
          folderDisplayPath: groupState.folderDisplayPath,
          titleAddress: groupState.titleAddressLabel,
          jobIds: groupState.jobIds,
          candidates: groupState.candidates,
          localityHint: deriveLocalityHint(job.relativePath),
          disambiguationKind: 'city_step',
          trayStep: '1a',
          discriminatingField,
          collapseStage: pickCollapseStage(groupState.candidates, groupState.jobIds.length),
        });
        uploadTraceExit('ulr', 'applyPreResolveFromOrchestrator', 'held');
        return 'held';
      }
      uploadTraceDecision('ulr', 'held — ambiguous geocode tray step 3', {
        candidateCount: groupState.candidates.length,
      });
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
      uploadTraceExit('ulr', 'applyPreResolveFromOrchestrator', 'held');
      return 'held';
    }

    uploadTraceDecision('ulr', 'partial — fallback markGroupPartial', summarizeGroupState(groupState));
    this.markGroupPartial(groupState);
    uploadTraceExit('ulr', 'applyPreResolveFromOrchestrator', 'partial');
    return 'partial';
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
        if (groupingKey && this.isSourceConflictResolved(job.batchId, groupingKey)) {
          const choice = this.getSourceConflictChoice(job.batchId, groupingKey)!;
          uploadTrayGate('replay stored source-conflict choice', {
            jobId,
            groupingKey,
            replayedChoice: choice,
          });
          this.applySourceConflictChoiceToJobId(jobId, choice);
          return false;
        }
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
    void this.registerSourceConflictGroupAsync(job, textCoords, exifCoords);
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

    const run = async (): Promise<void> => {
      if (this.isSourceConflictResolved(job.batchId, groupingKey)) {
        return;
      }

      const blocked = this._groups().find(
        (g) =>
          g.batchId === job.batchId &&
          g.queryKey === queryKey &&
          isGroupBlocked(g),
      );
      if (blocked) {
        const jobIds = this.jobState
          .jobs()
          .filter((j) => j.batchId === job.batchId && j.groupingKey === groupingKey)
          .map((j) => j.id);
        if (jobIds.length) {
          const mergeTitle =
            labelFromFolderDisplayPath(folderDisplayPath) ?? job.titleAddress?.trim() ?? '';
          this.registerDisambiguationGroup({
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
        return;
      }

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
      const jobIds = this.jobState
        .jobs()
        .filter((j) => j.batchId === job.batchId && j.groupingKey === groupingKey)
        .map((j) => j.id);
      this.registerDisambiguationGroup({
        batchId: job.batchId,
        queryKey,
        folderDisplayPath,
        titleAddress: trayTitleAddress,
        jobIds: jobIds.length ? jobIds : [job.id],
        candidates,
        localityHint: deriveLocalityHint(job.relativePath),
        disambiguationKind: 'source',
      });
    };

    const inflight = run().finally(() => {
      this.sourceConflictInflight.delete(inflightKey);
    });
    this.sourceConflictInflight.set(inflightKey, inflight);
    await inflight;
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
    const candidates = groupState.candidates ?? [];
    const discriminatingField =
      groupState.discriminatingField ??
      (candidates.length ? pickDiscriminatingField(candidates) ?? undefined : undefined);
    this.registerDisambiguationGroup({
      batchId,
      queryKey: buildDisambiguationQueryKey(groupState.groupingKey),
      folderDisplayPath: groupState.folderDisplayPath,
      titleAddress: groupState.titleAddressLabel,
      jobIds: groupState.jobIds,
      candidates,
      disambiguationKind: kind,
      trayStep: step,
      confirmedCity: groupState.confirmedCity ?? groupState.candidate?.city ?? null,
      step1bGate: step === '1b' ? 'active' : 'disabled',
      projectCentroid: groupState.projectCentroid,
      discriminatingField,
      collapseStage: candidates.length
        ? pickCollapseStage(candidates, groupState.jobIds.length)
        : undefined,
    });
    if (step === '1b' && groupState.confirmedCity) {
      void this.loadHouseNumbersForGroup(
        this._groups().find(
          (g) =>
            g.batchId === batchId &&
            g.queryKey === buildDisambiguationQueryKey(groupState.groupingKey),
        )?.id,
      );
    }
  }

  private async loadHouseNumbersForGroup(groupId: string | undefined): Promise<void> {
    if (!groupId) {
      return;
    }
    const group = this._groups().find((g) => g.id === groupId);
    if (!group?.confirmedCity?.trim()) {
      return;
    }
    await this.confirmTrayCity(groupId, group.confirmedCity);
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
      discriminatingField?: UploadDisambiguationGroup['discriminatingField'];
      collapseStage?: UploadDisambiguationGroup['collapseStage'];
    },
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
      collapseStage:
        input.collapseStage ??
        pickCollapseStage(
          input.candidates.length ? input.candidates : group.candidates,
          jobIds.length,
        ),
      discriminatingField: input.discriminatingField ?? group.discriminatingField,
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

    uploadTraceDecision('tray', existing ? 'merged into existing group' : 'created new group', {
      groupId: updated.id,
      jobCount: jobIds.length,
      disambiguationKind: updated.disambiguationKind,
      trayStep: updated.trayStep,
    });
    if (options?.activateTray !== false) {
      this._selectedGroupId.set(updated.id);
    }
    if (USE_TRAY_ORCHESTRATOR && isGroupBlocked(updated)) {
      this.injector
        .get(UploadLocationTrayProducerAdapter)
        .syncGroupToOrchestrator(updated);
      if (!existing) {
        this.injector.get(UploadPreResolveWaveService).notifyFirstTrayReady(input.batchId, {
          groupId: updated.id,
          queryKey: input.queryKey,
          disambiguationKind: updated.disambiguationKind,
        });
      }
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

  /**
   * Geocode a group via Branch A (street+city), B (project centroid bias), or C (street only).
   * @see docs/specs/service/media-upload-service/address-resolution-model.md § Step 5 (Photon + branches A/B/C)
   */
  private async runGeocodeForGroup(
    batchId: string,
    group: UploadGroupResolutionState,
  ): Promise<UploadGroupResolutionState> {
    uploadTraceEnter('geocode', 'runGeocodeForGroup', {
      batchId,
      groupingKey: group.groupingKey,
      geocodeBranch: group.geocodeBranch,
      jobIds: group.jobIds,
      searchObject: summarizeSearchObject(group.searchObject),
    });
    const so = group.searchObject;
    const config = this.locationConfig.getConfig();
    const street = so.street?.trim() ?? '';
    const countryCode = (
      so.country?.trim() ||
      config.defaultGeocodeCountry ||
      'AT'
    ).toLowerCase();
    if (!street || !countryCode) {
      const partial: UploadGroupResolutionState = { ...group, status: 'partial' };
      this.orchestrator.patchGroupState(batchId, partial);
      uploadTraceDecision('geocode', 'partial — missing street or country', { street, countryCode });
      uploadAddressDebug('geocode', 'skipped — missing street or country', {
        street,
        countryCode,
        searchObject: summarizeSearchObject(so),
      });
      uploadTraceExit('geocode', 'runGeocodeForGroup', 'partial');
      return partial;
    }

    for (const jobId of group.jobIds) {
      this.jobState.setPhase(jobId, 'resolving_location');
    }

    const geocodeRequest =
      group.geocodeBranch === 'branch_c'
        ? {
            street,
            countryCode,
          }
        : {
            street: [so.street, so.houseNumber].filter(Boolean).join(' ').trim(),
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
    const exifCoords = sampleJob ? getExifMetadataCoords(sampleJob) : undefined;
    const contextDistanceMaxMeters =
      this.orgSearchTuning.orgSearchConfig().resolver.contextDistanceMaxMeters;
    const filteredHits = filterGeocodeHitsByContextDistance(
      hits,
      exifCoords,
      group.projectCentroid ?? undefined,
      contextDistanceMaxMeters,
    );
    if (filteredHits.length !== hits.length) {
      uploadTraceDecision('geocode', 'filtered hits by contextDistanceMaxMeters', {
        before: hits.length,
        after: filteredHits.length,
        contextDistanceMaxMeters,
      });
    }

    let outcome = classifySearchHits(filteredHits, config, exifCoords);

    if (
      outcome.kind === 'auto' &&
      shouldForceBranchCCityTray(group, outcome, exifCoords, config.sourceAgreementRadiusMeters)
    ) {
      uploadTraceDecision('geocode', 'branch_c CITY-01 — EXIF far from auto, force city_step', {
        distanceM: exifCoords
          ? Math.round(
              haversineMeters(exifCoords, {
                lat: outcome.candidate.lat,
                lng: outcome.candidate.lng,
              }),
            )
          : undefined,
      });
      outcome = { kind: 'ambiguous', candidates: [outcome.candidate] };
    }

    uploadAddressDebug('geocode', 'classifySearchHits outcome', {
      kind: outcome.kind,
      candidateCount: outcome.kind === 'ambiguous' ? outcome.candidates.length : undefined,
    });

    if (outcome.kind === 'auto') {
      const autoCandidate = outcome.candidate;
      if (group.geocodeBranch === 'branch_c' && !so.houseNumber?.trim()) {
        uploadTraceDecision('geocode', 'needsTray 1b — branch_c auto hit but no houseNumber on SO', {
          street: so.street,
          autoCity: autoCandidate.city,
          autoLabel: autoCandidate.addressLabel,
        });
        const needsHouse: UploadGroupResolutionState = {
          ...group,
          status: 'needsTray',
          trayStep: '1b',
          candidate: autoCandidate,
          confirmedCity: autoCandidate.city ?? null,
          candidates: [autoCandidate],
        };
        this.orchestrator.patchGroupState(batchId, needsHouse);
        uploadTraceExit('geocode', 'runGeocodeForGroup', 'needsTray/1b');
        return needsHouse;
      }
      uploadTraceDecision('geocode', 'resolved — auto candidate', {
        candidateId: autoCandidate.id,
        addressLabel: autoCandidate.addressLabel,
      });
      const resolved: UploadGroupResolutionState = {
        ...group,
        status: 'resolved',
        candidate: autoCandidate,
      };
      this.orchestrator.patchGroupState(batchId, resolved);
      uploadTraceExit('geocode', 'runGeocodeForGroup', 'resolved');
      return resolved;
    }

    if (outcome.kind === 'ambiguous') {
      const unitSplit = shouldSplitGroupByPhotonUnitCoords(
        group.searchObject,
        outcome.candidates,
        config.unitGeocodeSplitMinMeters,
      );
      uploadTraceDecision('geocode', 'ambiguous — register tray', {
        trayStep: group.geocodeBranch === 'branch_c' ? '1a' : '3',
        candidateCount: outcome.candidates.length,
        unitPhotonSplit: unitSplit,
      });
      const discriminatingField = pickDiscriminatingField(outcome.candidates);
      const ambiguous: UploadGroupResolutionState = {
        ...group,
        status: 'ambiguous',
        candidates: outcome.candidates,
        trayStep: group.geocodeBranch === 'branch_c' ? '1a' : '3',
        discriminatingField: discriminatingField ?? undefined,
      };
      this.orchestrator.patchGroupState(batchId, ambiguous);
      uploadTraceExit('geocode', 'runGeocodeForGroup', 'ambiguous');
      return ambiguous;
    }

    if (group.geocodeBranch === 'branch_c' || group.geocodeBranch === 'branch_b') {
      uploadTraceDecision('geocode', 'needsTray 1a — geocode failed, branch b/c fallback', {
        geocodeBranch: group.geocodeBranch,
      });
      const fallbackTray: UploadGroupResolutionState = {
        ...group,
        status: 'needsTray',
        trayStep: '1a',
        geocodeBranch: group.geocodeBranch,
        candidates: [],
      };
      this.orchestrator.patchGroupState(batchId, fallbackTray);
      uploadTraceExit('geocode', 'runGeocodeForGroup', 'needsTray/1a');
      return fallbackTray;
    }

    uploadTraceDecision('geocode', 'partial — classify failed, not branch b/c');
    const partial: UploadGroupResolutionState = { ...group, status: 'partial' };
    this.orchestrator.patchGroupState(batchId, partial);
    uploadTraceExit('geocode', 'runGeocodeForGroup', 'partial');
    return partial;
  }

  /**
   * Collapse layer packages to flat SO and re-enter orchestrator as needsGeocode groups.
   * @see docs/specs/service/media-upload-service/upload-search-object.layer-map.md#resolveSOWithChosenLayer
   */
  private async applyLayerPackageChoice(
    group: UploadDisambiguationGroup,
    candidateId: string,
  ): Promise<void> {
    const prefix = 'layer-pkg|';
    const chosenLayerKey = candidateId.startsWith(prefix)
      ? candidateId.slice(prefix.length)
      : candidateId;
    const geo = await this.loadGeoData();
    const geoFull = { ...geo, postcodeMap: geo.postcodeMap };
    const oldKey = group.queryKey;

    const resolvedJobs: Array<{
      jobId: string;
      searchObject: UploadGroupResolutionState['searchObject'];
      folderDisplayPath: string;
      titleAddressLabel: string;
    }> = [];

    for (const jobId of group.jobIds) {
      const job = this.jobState.findJob(jobId);
      if (!job) {
        continue;
      }
      const relativePath = job.relativePath ?? job.file.name;
      const folderDisplayPath = job.folderDisplayPath ?? deriveFolderDisplayPath(relativePath);
      const layerResult = resolveLayersForJob(
        relativePath,
        job.file.name,
        geoFull,
        folderDisplayPath,
      );
      const searchObject = resolveSOWithChosenLayer(
        layerResult.layers,
        chosenLayerKey,
        relativePath,
        job.file.name,
        geoFull,
      );
      const { titleAddressLabel } = buildGroupPresentation(searchObject);
      this.jobState.updateJob(jobId, {
        groupingKey: searchObject.groupingKey,
        folderDisplayPath,
        titleAddress: titleAddressLabel,
        titleAddressSource: job.titleAddressSource ?? 'folder',
        disambiguationGroupId: undefined,
        resolutionStatus: 'pending',
      });
      resolvedJobs.push({ jobId, searchObject, folderDisplayPath, titleAddressLabel });
    }

    const byKey = new Map<
      string,
      {
        jobIds: string[];
        searchObject: UploadGroupResolutionState['searchObject'];
        folderDisplayPath: string;
        titleAddressLabel: string;
      }
    >();
    for (const row of resolvedJobs) {
      const key = row.searchObject.groupingKey;
      const existing = byKey.get(key);
      if (existing) {
        existing.jobIds.push(row.jobId);
      } else {
        byKey.set(key, {
          jobIds: [row.jobId],
          searchObject: row.searchObject,
          folderDisplayPath: row.folderDisplayPath,
          titleAddressLabel: row.titleAddressLabel,
        });
      }
    }

    await this.orchestrator.integrateResolvedLayerGroups(
      group.batchId,
      oldKey,
      [...byKey.entries()].map(([groupingKey, value]) => ({
        groupingKey,
        ...value,
      })),
    );

    this.patchGroup({
      ...group,
      resolutionStatus: 'resolved',
      resolutionGateOpen: false,
      selectedCandidateId: candidateId,
    });

    this._disambiguationResolved$.next({
      batchId: group.batchId,
      groupId: group.id,
      jobIds: [...group.jobIds],
      selectedCandidateId: candidateId,
    });

    for (const jobId of group.jobIds) {
      this.jobState.setPhase(jobId, 'resolving_location');
      void this.applyPreResolveFromOrchestrator(jobId);
    }

    this.syncBatchDisambiguationAggregates(group.batchId);
    this.pickNextActiveGroup(group.batchId);
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

  /**
   * Applies a stored or fresh source-conflict choice to one job (placement, Issues, or queue).
   * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md § Phase 3 — source-conflict resolution record
   */
  private applySourceConflictChoiceToJobId(
    jobId: string,
    candidateId: string,
    candidate?: UploadAddressCandidate,
  ): void {
    const job = this.jobState.findJob(jobId);
    if (!job) {
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

  applyCandidateToGroup(groupId: string, candidateId: string): void {
    const group = this._groups().find((g) => g.id === groupId);
    if (!group) {
      return;
    }
    const candidate = group.candidates.find((c) => c.id === candidateId);
    if (!candidate) {
      return;
    }
    if (group.disambiguationKind === 'layer_package') {
      void this.applyLayerPackageChoice(group, candidateId);
      return;
    }
    if (
      group.disambiguationKind === 'source' &&
      candidateId === SOURCE_CONFLICT_NONE_CANDIDATE_ID
    ) {
      this.markSourceConflictResolved(group.batchId, group.queryKey, candidateId);
      this.deferGroup(groupId);
      return;
    }

    const resolvedGroup: UploadDisambiguationGroup = {
      ...group,
      resolutionStatus: 'resolved',
      resolutionGateOpen: false,
      selectedCandidateId: candidateId,
    };
    this.patchGroup(resolvedGroup);

    if (group.disambiguationKind === 'source') {
      this.markSourceConflictResolved(group.batchId, group.queryKey, candidateId);
    }

    for (const jobId of group.jobIds) {
      const job = this.jobState.findJob(jobId);
      if (!job) {
        continue;
      }
      if (group.disambiguationKind === 'source') {
        this.applySourceConflictChoiceToJobId(jobId, candidateId, candidate);
      } else {
        this.applyGeocodeCandidateToJob(jobId, job, candidate, group.folderDisplayPath);
        const j = this.jobState.findJob(jobId)!;
        this.jobState.updateJob(jobId, {
          ...buildChosenPlacementPatch(j, 'text', {
            lat: candidate.lat,
            lng: candidate.lng,
          }),
          ...clearDisambiguationJobFields(),
        });
        this.jobState.setPhase(jobId, 'queued');
      }
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
