/**
 * Opt-in debug logging for upload address resolution (Search Object + geocode + DB).
 *
 * Enable in the browser console:
 *   localStorage.setItem('feldpost:debug:upload-address', '1')
 * Disable:
 *   localStorage.removeItem('feldpost:debug:upload-address')
 *
 * @see docs/specs/service/media-upload-service/upload-address-resolution-pipeline.md
 */

import type { GeocoderSearchResult } from '../geocoding/geocoding.service';
import type {
  UploadGroupResolutionState,
  UploadSearchObject,
} from './upload-address-resolution.types';

const STORAGE_KEY = 'feldpost:debug:upload-address';

export function isUploadAddressDebugEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function uploadAddressDebug(
  scope: string,
  message: string,
  payload?: Record<string, unknown>,
): void {
  if (!isUploadAddressDebugEnabled()) {
    return;
  }
  const label = `[upload-address:${scope}] ${message}`;
  if (payload && Object.keys(payload).length > 0) {
    console.debug(label, payload);
  } else {
    console.debug(label);
  }
}

/** Compact SO snapshot for logs (avoids huge sources arrays). */
export function summarizeSearchObject(so: UploadSearchObject): Record<string, unknown> {
  return {
    country: so.country,
    state: so.state,
    postcode: so.postcode,
    city: so.city,
    street: so.street,
    houseNumber: so.houseNumber,
    staircase: so.staircase,
    project: so.project,
    groupingKey: so.groupingKey,
    postcodeCandidates: so.postcodeCandidates,
    uncertainFields: so.uncertainFields,
    sourceCount: so.sources.length,
    deviationCount: so.sourceDeviations.length,
    relativePath: so.relativePath,
    fileName: so.fileName,
  };
}

export function summarizeGroupState(
  state: UploadGroupResolutionState,
): Record<string, unknown> {
  return {
    status: state.status,
    groupingKey: state.groupingKey,
    jobIds: state.jobIds,
    folderDisplayPath: state.folderDisplayPath,
    titleAddressLabel: state.titleAddressLabel,
    searchObject: summarizeSearchObject(state.searchObject),
    candidate: state.candidate
      ? {
          id: state.candidate.id,
          addressLabel: state.candidate.addressLabel,
          lat: state.candidate.lat,
          lng: state.candidate.lng,
        }
      : undefined,
    candidateCount: state.candidates?.length ?? 0,
  };
}

export function summarizeGeocodeHits(hits: GeocoderSearchResult[]): Record<string, unknown>[] {
  return hits.slice(0, 8).map((h) => {
    const addr = h.address;
    return {
      displayName: h.displayName,
      lat: h.lat,
      lng: h.lng,
      importance: h.importance,
      city: addr?.city ?? addr?.town ?? addr?.village,
      postcode: addr?.postcode,
    };
  });
}
