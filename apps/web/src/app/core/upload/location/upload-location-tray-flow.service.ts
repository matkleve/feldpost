/**
 * Tray registration and Step 1A/1B / layer-package flows.
 * @see docs/specs/component/upload/upload-resolver-tray.md
 */

import { Injectable, Injector, inject } from '@angular/core';
import { GeocodingService } from '../../geocoding/geocoding.service';
import { LocalGeoDataAdapter } from '../../location-path-parser/local-geo-data.adapter';
import {
  detectPackageConflicts,
  formatPackageLabel,
  layerKeyToCandidateId,
} from '../../location-path-parser/upload-search-object.layer-map';
import { UploadAddressResolutionOrchestrator } from '../address-resolution/upload-address-resolution.orchestrator';
import { UploadJobStateService } from '../support/upload-job-state.service';
import { UploadLocationDisambiguationStoreService } from './upload-location-disambiguation-store.service';
import { UploadLocationResolutionService } from './upload-location-resolution.service';
import type { UploadGroupResolutionState } from '../address-resolution/upload-address-resolution.types';
import {
  buildDisambiguationQueryKey,
  pickCollapseStage,
  pickDiscriminatingField,
} from './upload-location-resolution.helpers';
import {
  bucketLayerPackageJobsByGroupingKey,
  resolveLayerPackageJobs,
} from './upload-location-layer-package-choice.util';
import type {
  DisambiguationResolvedEvent,
  UploadAddressCandidate,
  UploadDisambiguationGroup,
} from '../upload-manager.types';

@Injectable({ providedIn: 'root' })
export class UploadLocationTrayFlowService {
  private readonly geocoding = inject(GeocodingService);
  private readonly orchestrator = inject(UploadAddressResolutionOrchestrator);
  private readonly jobState = inject(UploadJobStateService);
  private readonly geoData = inject(LocalGeoDataAdapter);
  private readonly disambiguationStore = inject(UploadLocationDisambiguationStoreService);
  private readonly injector = inject(Injector);

  private geoLoaded: Promise<{
    states: Awaited<ReturnType<LocalGeoDataAdapter['getBundeslaender']>>;
    municipalities: Awaited<ReturnType<LocalGeoDataAdapter['getGemeinden']>>;
    postcodeMap: Awaited<ReturnType<LocalGeoDataAdapter['getPlzMap']>>;
  }> | null = null;

  private resolution(): UploadLocationResolutionService {
    return this.injector.get(UploadLocationResolutionService);
  }

  private loadGeoData(): Promise<{
    states: Awaited<ReturnType<LocalGeoDataAdapter['getBundeslaender']>>;
    municipalities: Awaited<ReturnType<LocalGeoDataAdapter['getGemeinden']>>;
    postcodeMap: Awaited<ReturnType<LocalGeoDataAdapter['getPlzMap']>>;
  }> {
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

  /**
   * @deprecated Removed — project location is bias-only (Branch B), not an address fallback.
   * @see docs/specs/service/media-upload-service/address-resolution-model.md
   */
  async registerBatchProjectTrayIfNeeded(_batchId: string): Promise<void> {
    void _batchId;
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

  registerLayerPackageGroup(batchId: string, state: UploadGroupResolutionState): void {
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
    this.resolution().registerDisambiguationGroup({
      batchId,
      queryKey,
      folderDisplayPath: state.folderDisplayPath,
      titleAddress: state.titleAddressLabel,
      jobIds: state.jobIds,
      candidates,
      disambiguationKind: 'layer_package',
    });
  }

  registerTrayStepGroup(batchId: string, groupState: UploadGroupResolutionState): void {
    const step = groupState.trayStep ?? '1a';
    const kind = step === '1b' ? 'house_step' : 'city_step';
    const candidates = groupState.candidates ?? [];
    const discriminatingField =
      groupState.discriminatingField ??
      (candidates.length ? pickDiscriminatingField(candidates) ?? undefined : undefined);
    this.resolution().registerDisambiguationGroup({
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
        this.disambiguationStore.groups().find(
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
    const group = this.disambiguationStore.groups().find((g) => g.id === groupId);
    if (!group?.confirmedCity?.trim()) {
      return;
    }
    await this.confirmTrayCity(groupId, group.confirmedCity);
  }

  /** Step 1A: user confirmed city → unlock 1B and load house numbers. */
  async confirmTrayCity(groupId: string, city: string): Promise<void> {
    const group = this.disambiguationStore.groups().find((g) => g.id === groupId);
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
    this.disambiguationStore.patchGroup({
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
    const group = this.disambiguationStore.groups().find((g) => g.id === groupId);
    if (!group) {
      return;
    }
    if (streetCentroid) {
      this.resolution().deferGroup(groupId);
      return;
    }
    if (candidateId) {
      this.resolution().applyCandidateToGroup(groupId, candidateId);
    }
  }

  async applyLayerPackageChoice(
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

    const resolvedJobs = resolveLayerPackageJobs(
      group.jobIds,
      chosenLayerKey,
      geoFull,
      (jobId) => this.jobState.findJob(jobId),
      (jobId, patch) => this.jobState.updateJob(jobId, patch),
    );
    const byKey = bucketLayerPackageJobsByGroupingKey(resolvedJobs);

    await this.orchestrator.integrateResolvedLayerGroups(
      group.batchId,
      oldKey,
      [...byKey.entries()].map(([groupingKey, value]) => ({
        groupingKey,
        ...value,
      })),
    );

    this.disambiguationStore.patchGroup({
      ...group,
      resolutionStatus: 'resolved',
      resolutionGateOpen: false,
      selectedCandidateId: candidateId,
    });

    const resolvedEvent: DisambiguationResolvedEvent = {
      batchId: group.batchId,
      groupId: group.id,
      jobIds: [...group.jobIds],
      selectedCandidateId: candidateId,
    };
    this.resolution().notifyDisambiguationResolved(resolvedEvent);

    for (const jobId of group.jobIds) {
      this.jobState.setPhase(jobId, 'resolving_location');
      void this.resolution().applyPreResolveFromOrchestrator(jobId);
    }

    this.disambiguationStore.syncBatchDisambiguationAggregates(group.batchId);
    this.disambiguationStore.pickNextActiveGroup(group.batchId);
  }
}
