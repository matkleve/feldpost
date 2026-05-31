/**
 * Layer-package tray choice: resolve jobs and bucket by grouping key.
 * @see upload-location-tray-flow.service.ts applyLayerPackageChoice
 */

import type { UploadGroupResolutionState } from './upload-address-resolution.types';
import {
  resolveLayersForJob,
  resolveSOWithChosenLayer,
} from '../location-path-parser/upload-search-object.layer-map';
import {
  buildGroupPresentation,
  deriveFolderDisplayPath,
} from './upload-location-resolution.helpers';
import type { UploadJob } from './upload-manager.types';

export type LayerPackageGeoData = Parameters<typeof resolveLayersForJob>[2];

export interface LayerPackageResolvedJobRow {
  jobId: string;
  searchObject: UploadGroupResolutionState['searchObject'];
  folderDisplayPath: string;
  titleAddressLabel: string;
}

export function resolveLayerPackageJobs(
  jobIds: readonly string[],
  chosenLayerKey: string,
  geoFull: LayerPackageGeoData,
  findJob: (jobId: string) => UploadJob | undefined,
  updateJob: (jobId: string, patch: Partial<UploadJob>) => void,
): LayerPackageResolvedJobRow[] {
  const resolvedJobs: LayerPackageResolvedJobRow[] = [];

  for (const jobId of jobIds) {
    const job = findJob(jobId);
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
    updateJob(jobId, {
      groupingKey: searchObject.groupingKey,
      folderDisplayPath,
      titleAddress: titleAddressLabel,
      titleAddressSource: job.titleAddressSource ?? 'folder',
      disambiguationGroupId: undefined,
      resolutionStatus: 'pending',
    });
    resolvedJobs.push({ jobId, searchObject, folderDisplayPath, titleAddressLabel });
  }

  return resolvedJobs;
}

export function bucketLayerPackageJobsByGroupingKey(
  resolvedJobs: readonly LayerPackageResolvedJobRow[],
): Map<
  string,
  {
    jobIds: string[];
    searchObject: UploadGroupResolutionState['searchObject'];
    folderDisplayPath: string;
    titleAddressLabel: string;
  }
> {
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
  return byKey;
}
