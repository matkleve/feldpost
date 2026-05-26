/**
 * Batch Search Object classification and resolution cache for upload intake.
 * @see docs/specs/service/media-upload-service/upload-address-resolution-pipeline.md
 */

import { Injectable, inject } from '@angular/core';
import { LocalGeoDataAdapter } from '../location-path-parser/local-geo-data.adapter';
import {
  buildSearchObjectFromRelativePath,
  expandPostcodeOnSearchObject,
} from '../location-path-parser/upload-search-object.builder';
import { UploadLocationLookupAdapter } from './adapters/upload-location-lookup.adapter';
import {
  buildGroupPresentation,
  evaluateLocalResolution,
  locationRowToCandidate,
} from './upload-location-resolution.helpers';
import { UploadJobStateService } from './upload-job-state.service';
import type {
  UploadGroupResolutionState,
  UploadSearchObject,
} from './upload-address-resolution.types';

@Injectable({ providedIn: 'root' })
export class UploadAddressResolutionOrchestrator {
  private readonly geoData = inject(LocalGeoDataAdapter);
  private readonly lookup = inject(UploadLocationLookupAdapter);
  private readonly jobState = inject(UploadJobStateService);

  private readonly batchCaches = new Map<string, Map<string, UploadGroupResolutionState>>();
  private geoLoaded: Promise<{
    states: Awaited<ReturnType<LocalGeoDataAdapter['getBundeslaender']>>;
    municipalities: Awaited<ReturnType<LocalGeoDataAdapter['getGemeinden']>>;
    postcodeMap: Awaited<ReturnType<LocalGeoDataAdapter['getPlzMap']>>;
  }> | null = null;

  clearBatch(batchId: string): void {
    this.batchCaches.delete(batchId);
  }

  getGroupState(batchId: string, groupingKey: string): UploadGroupResolutionState | undefined {
    return this.batchCaches.get(batchId)?.get(groupingKey);
  }

  getGroupingKeyForJob(jobId: string): string | undefined {
    return this.jobState.findJob(jobId)?.groupingKey;
  }

  async classifyBatch(batchId: string): Promise<void> {
    const jobs = this.jobState.jobs().filter((j) => j.batchId === batchId);
    if (!jobs.length) {
      return;
    }

    const geo = await this.loadGeo();
    const leafObjects: Array<{ jobId: string; so: UploadSearchObject }> = [];

    for (const job of jobs) {
      const relativePath = job.relativePath ?? job.file.name;
      let so = buildSearchObjectFromRelativePath(relativePath, job.file.name, {
        states: geo.states,
        municipalities: geo.municipalities,
      });
      so = expandPostcodeOnSearchObject(so, geo.postcodeMap);
      const { folderDisplayPath, titleAddressLabel } = buildGroupPresentation(so);

      this.jobState.updateJob(job.id, {
        groupingKey: so.groupingKey,
        folderDisplayPath,
        titleAddress: titleAddressLabel,
        titleAddressSource: job.titleAddressSource ?? 'folder',
      });

      leafObjects.push({ jobId: job.id, so });
    }

    const byKey = new Map<string, { so: UploadSearchObject; jobIds: string[] }>();
    for (const { jobId, so } of leafObjects) {
      const existing = byKey.get(so.groupingKey);
      if (existing) {
        existing.jobIds.push(jobId);
      } else {
        byKey.set(so.groupingKey, { so, jobIds: [jobId] });
      }
    }

    const cache = new Map<string, UploadGroupResolutionState>();

    for (const [groupingKey, { so, jobIds }] of byKey) {
      const { folderDisplayPath, titleAddressLabel } = buildGroupPresentation(so);
      const local = evaluateLocalResolution(so);

      if (local === 'incomplete' || local === 'postcode_blocked') {
        cache.set(groupingKey, {
          status: 'partial',
          groupingKey,
          jobIds,
          searchObject: so,
          folderDisplayPath,
          titleAddressLabel,
        });
        continue;
      }

      const row = await this.lookup.findBySearchObject(so);
      if (row) {
        cache.set(groupingKey, {
          status: 'resolved',
          groupingKey,
          jobIds,
          searchObject: so,
          folderDisplayPath,
          titleAddressLabel,
          candidate: locationRowToCandidate(row),
        });
        continue;
      }

      cache.set(groupingKey, {
        status: 'needsGeocode',
        groupingKey,
        jobIds,
        searchObject: so,
        folderDisplayPath,
        titleAddressLabel,
      });
    }

    this.batchCaches.set(batchId, cache);
  }

  patchGroupState(batchId: string, state: UploadGroupResolutionState): void {
    const cache = this.batchCaches.get(batchId);
    if (!cache) {
      return;
    }
    cache.set(state.groupingKey, state);
  }

  private loadGeo() {
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
}
