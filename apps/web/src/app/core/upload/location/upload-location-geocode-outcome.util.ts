/**
 * Geocode run outcome patches (ambiguous / fallback tray / partial).
 * @see upload-location-geocode-group.service.ts
 */

import type { UploadAddressResolutionOrchestrator } from '../address-resolution/upload-address-resolution.orchestrator';
import type { UploadGroupResolutionState } from '../address-resolution/upload-address-resolution.types';
import type { UploadLocationConfig } from './upload-location-config';
import {
  pickDiscriminatingField,
  shouldSplitGroupByPhotonUnitCoords,
} from './upload-location-resolution.helpers';
import {
  uploadTraceDecision,
  uploadTraceExit,
} from '../address-resolution/upload-address-resolution.debug';
import type { UploadAddressCandidate } from '../upload-manager.types';

export function patchAmbiguousGeocodeOutcome(
  orchestrator: UploadAddressResolutionOrchestrator,
  batchId: string,
  group: UploadGroupResolutionState,
  candidates: UploadAddressCandidate[],
  config: UploadLocationConfig,
): UploadGroupResolutionState {
  const unitSplit = shouldSplitGroupByPhotonUnitCoords(
    group.searchObject,
    candidates,
    config.unitGeocodeSplitMinMeters,
  );
  uploadTraceDecision('geocode', 'ambiguous — register tray', {
    trayStep: group.geocodeBranch === 'branch_c' ? '1a' : '3',
    candidateCount: candidates.length,
    unitPhotonSplit: unitSplit,
  });
  const discriminatingField = pickDiscriminatingField(candidates);
  const ambiguous: UploadGroupResolutionState = {
    ...group,
    status: 'ambiguous',
    candidates,
    trayStep: group.geocodeBranch === 'branch_c' ? '1a' : '3',
    discriminatingField: discriminatingField ?? undefined,
  };
  orchestrator.patchGroupState(batchId, ambiguous);
  uploadTraceExit('geocode', 'runGeocodeForGroup', 'ambiguous');
  return ambiguous;
}

export function patchFallbackTrayGeocodeOutcome(
  orchestrator: UploadAddressResolutionOrchestrator,
  batchId: string,
  group: UploadGroupResolutionState,
): UploadGroupResolutionState {
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
  orchestrator.patchGroupState(batchId, fallbackTray);
  uploadTraceExit('geocode', 'runGeocodeForGroup', 'needsTray/1a');
  return fallbackTray;
}

export function patchPartialClassifyFailedGeocode(
  orchestrator: UploadAddressResolutionOrchestrator,
  batchId: string,
  group: UploadGroupResolutionState,
): UploadGroupResolutionState {
  uploadTraceDecision('geocode', 'partial — classify failed, not branch b/c');
  const partial: UploadGroupResolutionState = { ...group, status: 'partial' };
  orchestrator.patchGroupState(batchId, partial);
  uploadTraceExit('geocode', 'runGeocodeForGroup', 'partial');
  return partial;
}

export function patchContainmentCheckOutcome(
  orchestrator: UploadAddressResolutionOrchestrator,
  batchId: string,
  group: UploadGroupResolutionState,
): UploadGroupResolutionState {
  const street = group.searchObject.street?.trim() ?? '';
  const city = group.searchObject.city?.trim() ?? '';
  uploadTraceDecision('geocode', 'containment_check — Branch A 0-hit after admin resolution', {
    street,
    city,
  });
  const containmentCheck: UploadGroupResolutionState = {
    ...group,
    status: 'needsTray',
    trayStep: '3',
    containmentCheck: true,
    candidates: [
      {
        id: 'keep-address',
        addressLabel: `Keep: ${street}, ${city}`.trim(),
        lat: 0,
        lng: 0,
      },
      {
        id: 'enter-different',
        addressLabel: 'Enter a different address',
        lat: 0,
        lng: 0,
      },
    ],
  };
  orchestrator.patchGroupState(batchId, containmentCheck);
  uploadTraceExit('geocode', 'runGeocodeForGroup', 'needsTray/containment_check');
  return containmentCheck;
}
