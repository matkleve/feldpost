/**
 * Opt-in debug logging for upload address resolution (Search Object + geocode + DB).
 *
 * Enable in the browser console (then reload or upload again):
 *   localStorage.setItem('feldpost:debug:upload-address', '1')
 *   localStorage.setItem('feldpost:debug:upload-process', '1')  // verbose fn/decision trace
 *
 * Filter DevTools console by `[upload-address` or `[upload-process` or `[upload-placement]`.
 * SO field mutations: `[upload-address:so-mutation]`; tray gates: `[upload-process:tray]`.
 * Disable:
 *   localStorage.removeItem('feldpost:debug:upload-address')
 *   localStorage.removeItem('feldpost:debug:upload-process')
 *
 * Placement trace uses console.info (`[upload-placement]`) so it stays visible when
 * the console filters out "Verbose"/debug. Detailed SO/geocode payloads use console.debug.
 * Process trace uses console.info (`[upload-process]`) for branch decisions.
 *
 * @see docs/specs/service/media-upload-service/upload-address-resolution-pipeline.md
 */

import type { GeocoderSearchResult } from '../../geocoding/geocoding.service';
import type {
  UploadGroupResolutionState,
  UploadSearchObject,
} from './upload-address-resolution.types';

const STORAGE_KEY = 'feldpost:debug:upload-address';
const PROCESS_STORAGE_KEY = 'feldpost:debug:upload-process';

export function isUploadAddressDebugEnabled(): boolean {
  try {
    return (
      localStorage.getItem(STORAGE_KEY) === '1' ||
      localStorage.getItem(PROCESS_STORAGE_KEY) === '1'
    );
  } catch {
    return false;
  }
}

/** Verbose function enter/decision/exit trace (upload-process flag or upload-address flag). */
export function isUploadProcessTraceEnabled(): boolean {
  return isUploadAddressDebugEnabled();
}

/** `-> functionName` with optional context values. */
export function uploadTraceEnter(
  scope: string,
  fn: string,
  detail?: Record<string, unknown>,
): void {
  if (!isUploadProcessTraceEnabled()) {
    return;
  }
  const label = `[upload-process:${scope}] -> ${fn}`;
  if (detail && Object.keys(detail).length > 0) {
    console.info(label, detail);
  } else {
    console.info(label);
  }
}

/** `decision: ... because ...` with structured fields. */
export function uploadTraceDecision(
  scope: string,
  because: string,
  detail?: Record<string, unknown>,
): void {
  if (!isUploadProcessTraceEnabled()) {
    return;
  }
  const label = `[upload-process:${scope}] decision: ${because}`;
  if (detail && Object.keys(detail).length > 0) {
    console.info(label, detail);
  } else {
    console.info(label);
  }
}

/** `<- functionName` with optional result summary. */
export function uploadTraceExit(
  scope: string,
  fn: string,
  result?: string,
  detail?: Record<string, unknown>,
): void {
  if (!isUploadProcessTraceEnabled()) {
    return;
  }
  const suffix = result ? ` -> ${result}` : '';
  const label = `[upload-process:${scope}] <- ${fn}${suffix}`;
  if (detail && Object.keys(detail).length > 0) {
    console.info(label, detail);
  } else {
    console.info(label);
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

/** High-signal placement decision line (phases P0-P6 per location-routing supplement). */
export function uploadPlacementLog(
  phase: string,
  jobId: string,
  fileName: string,
  message: string,
  detail?: Record<string, unknown>,
): void {
  if (!isUploadAddressDebugEnabled()) {
    return;
  }
  const shortId = jobId.length > 8 ? jobId.slice(0, 8) : jobId;
  console.info(`[upload-placement] ${phase} ${shortId} ${fileName} -- ${message}`, {
    ...(detail ?? {}),
  });
}

export function summarizeJobPlacement(job: {
  file: { name: string };
  titleAddress?: string;
  titleAddressSource?: string;
  titleAddressCoords?: { lat: number; lng: number };
  parsedExif?: { coords?: { lat: number; lng: number } };
  coords?: { lat: number; lng: number };
  locationSourceUsed?: string;
  groupingKey?: string;
  phase?: string;
}): Record<string, unknown> {
  return {
    phase: job.phase,
    titleAddress: job.titleAddress,
    titleAddressSource: job.titleAddressSource,
    titleAddressCoords: job.titleAddressCoords,
    exifMetadata: job.parsedExif?.coords,
    placementCoords: job.coords,
    locationSourceUsed: job.locationSourceUsed,
    groupingKey: job.groupingKey,
  };
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
    door: so.door,
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

/** Log SO snapshot when fields change during classify / geocode / tray apply. */
export function uploadSoMutation(
  scope: string,
  reason: string,
  detail: {
    jobId?: string;
    groupingKey?: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    patch?: Record<string, unknown>;
  },
): void {
  if (!isUploadAddressDebugEnabled()) {
    return;
  }
  console.debug(`[upload-address:so-mutation:${scope}] ${reason}`, detail);
}

/** Why a resolver tray question was opened (producer / ULR). */
export function uploadTrayGate(
  because: string,
  detail?: Record<string, unknown>,
): void {
  uploadTraceDecision('tray', because, detail);
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
