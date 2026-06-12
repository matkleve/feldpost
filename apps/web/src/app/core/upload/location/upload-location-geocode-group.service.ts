/**
 * Group-level Photon geocode (branches A/B/C) with in-flight dedupe.
 * @see docs/specs/service/media-upload-service/address-resolution-model.md § Step 5
 */

import { Injectable, inject } from '@angular/core';
import { GeocodingService } from '../../geocoding/geocoding.service';
import { OrgSearchTuningService } from '../../search/org-search-tuning.service';
import { UploadAddressResolutionOrchestrator } from '../address-resolution/upload-address-resolution.orchestrator';
import { UploadJobStateService } from '../support/upload-job-state.service';
import { UploadLocationConfigService } from './upload-location-config.service';
import { getExifMetadataCoords, haversineMeters } from './upload-location-precedence.helpers';
import {
  classifySearchHits,
  filterGeocodeHitsByContextDistance,
  shouldForceBranchCCityTray,
} from './upload-location-resolution.helpers';
import {
  patchAmbiguousGeocodeOutcome,
  patchFallbackTrayGeocodeOutcome,
  patchPartialClassifyFailedGeocode,
} from './upload-location-geocode-outcome.util';
import {
  summarizeGeocodeHits,
  summarizeSearchObject,
  uploadAddressDebug,
  uploadTraceDecision,
  uploadTraceEnter,
  uploadTraceExit,
} from '../address-resolution/upload-address-resolution.debug';
import type { UploadGroupResolutionState } from '../address-resolution/upload-address-resolution.types';
import type { UploadAddressCandidate } from '../upload-manager.types';

@Injectable({ providedIn: 'root' })
export class UploadLocationGeocodeGroupService {
  private readonly geocoding = inject(GeocodingService);
  private readonly orchestrator = inject(UploadAddressResolutionOrchestrator);
  private readonly jobState = inject(UploadJobStateService);
  private readonly locationConfig = inject(UploadLocationConfigService);
  private readonly orgSearchTuning = inject(OrgSearchTuningService);

  private readonly geocodeInFlight = new Map<string, Promise<UploadGroupResolutionState>>();

  async ensureGeocodedGroup(
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
    const config = this.locationConfig.getConfig();
    const streetCountry = this.streetAndCountryCode(group, config);
    if (!streetCountry) {
      return this.patchPartialMissingStreet(batchId, group, '', '');
    }
    const { street, countryCode } = streetCountry;
    const hits = await this.fetchStructuredGeocodeHits(batchId, group, street, countryCode, config);
    const outcome = this.classifyGeocodeHitsForGroup(group, hits, config);
    return this.resolveGeocodeClassifyOutcome(batchId, group, outcome, config);
  }

  private streetAndCountryCode(
    group: UploadGroupResolutionState,
    config: ReturnType<UploadLocationConfigService['getConfig']>,
  ): { street: string; countryCode: string } | null {
    const street = group.searchObject.street?.trim() ?? '';
    const countryCode = (
      group.searchObject.country?.trim() ||
      config.defaultGeocodeCountry ||
      'AT'
    ).toLowerCase();
    if (!street || !countryCode) {
      return null;
    }
    return { street, countryCode };
  }

  private patchPartialMissingStreet(
    batchId: string,
    group: UploadGroupResolutionState,
    street: string,
    countryCode: string,
  ): UploadGroupResolutionState {
    const partial: UploadGroupResolutionState = { ...group, status: 'partial' };
    this.orchestrator.patchGroupState(batchId, partial);
    uploadTraceDecision('geocode', 'partial — missing street or country', { street, countryCode });
    uploadAddressDebug('geocode', 'skipped — missing street or country', {
      street,
      countryCode,
      searchObject: summarizeSearchObject(group.searchObject),
    });
    uploadTraceExit('geocode', 'runGeocodeForGroup', 'partial');
    return partial;
  }

  private async fetchStructuredGeocodeHits(
    batchId: string,
    group: UploadGroupResolutionState,
    street: string,
    countryCode: string,
    config: ReturnType<UploadLocationConfigService['getConfig']>,
  ): Promise<Awaited<ReturnType<GeocodingService['searchStructuredForward']>>> {
    const so = group.searchObject;
    const geocodeRequest =
      group.geocodeBranch === 'branch_c'
        ? { street, countryCode }
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
        { limit: config.geocodeSearchDefaultLimit, countrycodes: [countryCode] },
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
    return hits;
  }

  private classifyGeocodeHitsForGroup(
    group: UploadGroupResolutionState,
    hits: Awaited<ReturnType<GeocodingService['searchStructuredForward']>>,
    config: ReturnType<UploadLocationConfigService['getConfig']>,
  ): ReturnType<typeof classifySearchHits> {
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
    return outcome;
  }

  private resolveGeocodeClassifyOutcome(
    batchId: string,
    group: UploadGroupResolutionState,
    outcome: ReturnType<typeof classifySearchHits>,
    config: ReturnType<UploadLocationConfigService['getConfig']>,
  ): UploadGroupResolutionState {
    if (outcome.kind === 'auto') {
      return this.resolveAutoGeocodeOutcome(batchId, group, outcome.candidate);
    }
    if (outcome.kind === 'ambiguous') {
      return patchAmbiguousGeocodeOutcome(
        this.orchestrator,
        batchId,
        group,
        outcome.candidates,
        config,
      );
    }
    if (group.geocodeBranch === 'branch_c' || group.geocodeBranch === 'branch_b') {
      return patchFallbackTrayGeocodeOutcome(this.orchestrator, batchId, group);
    }
    return patchPartialClassifyFailedGeocode(this.orchestrator, batchId, group);
  }

  private resolveAutoGeocodeOutcome(
    batchId: string,
    group: UploadGroupResolutionState,
    autoCandidate: UploadAddressCandidate,
  ): UploadGroupResolutionState {
    const so = group.searchObject;
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

}
