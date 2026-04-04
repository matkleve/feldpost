/**
 * UploadPanel Pure Helper Functions
 *
 * Contains utilities for job status checks, zone filtering, and search result mapping.
 * All functions here are side-effect-free and can be tested independently.
 */

import type { ForwardGeocodeResult, GeocoderSearchResult } from '../../core/geocoding/geocoding.service';
import type { UploadJob, UploadPhase } from '../../core/upload/upload-manager.service';
import type { SegmentedSwitchOption } from '../../shared/segmented-switch/segmented-switch.component';
import { UPLOAD_LANES } from './upload-panel.constants';
import type { UploadLane } from './upload-phase.helpers';

export interface UploadLaneCounts {
  uploading: number;
  uploaded: number;
  issues: number;
}

/**
 * Checks if a job can be retried (failed, missing data, or skipped).
 */
export function isRetryableJob(job: UploadJob): boolean {
  return job.phase === 'error' || job.phase === 'missing_data' || job.phase === 'skipped';
}

/**
 * Checks if a phase is a terminal state (won't change without user action).
 */
export function isTerminalJob(phase: UploadPhase): boolean {
  return (
    phase === 'complete' || phase === 'error' || phase === 'missing_data' || phase === 'skipped'
  );
}

/**
 * Type guard: checks if a string is a valid UploadLane.
 */
export function isUploadLane(value: string): value is UploadLane {
  return (UPLOAD_LANES as readonly string[]).includes(value);
}

export function dropzoneLabelText(t: (key: string, fallback?: string) => string): string {
  const localized = t('upload.dropzone.label.dragAndDrop', 'Drag & drop files here');
  const trimmed = typeof localized === 'string' ? localized.trim() : '';
  return trimmed.length > 0 ? trimmed : 'Drag & drop files here';
}

export function buildLaneSwitchOptions(
  t: (key: string, fallback?: string) => string,
  counts: UploadLaneCounts,
  issueAttentionPulse: boolean,
  effectiveLane: UploadLane,
): SegmentedSwitchOption[] {
  return [
    {
      id: 'uploading',
      label: t('upload.panel.lane.uploading', 'Queue'),
      icon: 'cloud_upload',
      type: 'icon-with-text',
      ariaLabel: `${t('upload.panel.lane.uploading', 'Queue')} (${counts.uploading})`,
      title: t('upload.panel.lane.uploading', 'Queue'),
    },
    {
      id: 'uploaded',
      label: t('upload.panel.lane.uploaded', 'Uploaded'),
      icon: 'check_circle',
      type: 'icon-with-text',
      ariaLabel: `${t('upload.panel.lane.uploaded', 'Uploaded')} (${counts.uploaded})`,
      title: t('upload.panel.lane.uploaded', 'Uploaded'),
    },
    {
      id: 'issues',
      label: t('upload.panel.lane.issues', 'Issues'),
      icon: 'warning_amber',
      type: 'icon-with-text',
      ariaLabel: `${t('upload.panel.lane.issues', 'Issues')} (${counts.issues})`,
      attention: issueAttentionPulse && counts.issues > 0 && effectiveLane !== 'issues',
    },
  ];
}

export function sortUploadedByPriority(
  jobs: readonly UploadJob[],
  prioritizedIds: ReadonlySet<string>,
): UploadJob[] {
  if (prioritizedIds.size === 0) {
    return [...jobs];
  }
  return [...jobs].sort((a, b) => {
    const aPrio = prioritizedIds.has(a.id) ? 1 : 0;
    const bPrio = prioritizedIds.has(b.id) ? 1 : 0;
    return bPrio - aPrio;
  });
}

/**
 * Converts geocoder search results to structured ForwardGeocodeResult format.
 * Filters out invalid entries (missing lat/lng).
 */
export function mapSearchResultsToForwardSuggestions(
  results: readonly GeocoderSearchResult[],
): ForwardGeocodeResult[] {
  return results
    .map((result) => {
      if (!Number.isFinite(result.lat) || !Number.isFinite(result.lng)) {
        return null;
      }

      const address = result.address;
      return {
        lat: result.lat,
        lng: result.lng,
        addressLabel: result.displayName,
        city: address?.city ?? address?.town ?? address?.village ?? address?.municipality ?? null,
        district: null,
        street: address?.road ?? null,
        streetNumber: address?.house_number ?? null,
        zip: address?.postcode ?? null,
        country: address?.country ?? null,
      } as ForwardGeocodeResult;
    })
    .filter((entry): entry is ForwardGeocodeResult => entry !== null);
}
