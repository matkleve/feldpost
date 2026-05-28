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
import { UploadProjectLocationsAdapter } from './adapters/upload-project-locations.adapter';
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
import {
  summarizeGroupState,
  summarizeSearchObject,
  uploadAddressDebug,
  uploadTraceDecision,
  uploadTraceEnter,
  uploadTraceExit,
} from './upload-address-resolution.debug';

@Injectable({ providedIn: 'root' })
export class UploadAddressResolutionOrchestrator {
  private readonly geoData = inject(LocalGeoDataAdapter);
  private readonly lookup = inject(UploadLocationLookupAdapter);
  private readonly projectLocations = inject(UploadProjectLocationsAdapter);
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
    uploadTraceEnter('orchestrator', 'classifyBatch', { batchId });
    const jobs = this.jobState.jobs().filter((j) => j.batchId === batchId);
    if (!jobs.length) {
      uploadTraceDecision('orchestrator', 'classifyBatch — no jobs in batch');
      uploadTraceExit('orchestrator', 'classifyBatch', 'empty');
      return;
    }

    uploadAddressDebug('orchestrator', 'classifyBatch start', {
      batchId,
      jobCount: jobs.length,
    });

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

      uploadAddressDebug('orchestrator', 'search object built', {
        jobId: job.id,
        ...summarizeSearchObject(so),
        folderDisplayPath,
        titleAddressLabel,
      });

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
    const sampleJob = jobs[0];
    const projectId = sampleJob?.projectId;
    let projectCentroid = null as ReturnType<UploadProjectLocationsAdapter['pickCentroid']>;
    if (projectId) {
      const rows = await this.projectLocations.listProjectLocations(projectId);
      projectCentroid = this.projectLocations.pickCentroid(rows);
    }

    for (const [groupingKey, { so, jobIds }] of byKey) {
      const { folderDisplayPath, titleAddressLabel } = buildGroupPresentation(so);
      const local = evaluateLocalResolution(so, projectCentroid);

      uploadAddressDebug('orchestrator', 'group evaluate', {
        groupingKey,
        jobIds,
        localGate: local,
        projectCentroid,
        searchObject: summarizeSearchObject(so),
      });

      if (local === 'postcode_blocked' || local === 'incomplete') {
        uploadTraceDecision('orchestrator', `group partial — local gate ${local}`, {
          groupingKey,
          jobIds,
        });
        const partialState: UploadGroupResolutionState = {
          status: 'partial',
          groupingKey,
          jobIds,
          searchObject: so,
          folderDisplayPath,
          titleAddressLabel,
          geocodeBranch: local === 'incomplete' ? undefined : undefined,
        };
        cache.set(groupingKey, partialState);
        uploadAddressDebug('orchestrator', 'group → partial (local gate)', summarizeGroupState(partialState));
        continue;
      }

      if (local === 'branch_c') {
        uploadTraceDecision('orchestrator', 'group needsGeocode — branch_c (street only, no locality)', {
          groupingKey,
          street: so.street,
          jobIds,
        });
        const branchCState: UploadGroupResolutionState = {
          status: 'needsGeocode',
          groupingKey,
          jobIds,
          searchObject: {
            ...so,
            country: so.country ?? 'AT',
          },
          folderDisplayPath,
          titleAddressLabel,
          geocodeBranch: 'branch_c',
        };
        cache.set(groupingKey, branchCState);
        uploadAddressDebug('orchestrator', 'group → needsGeocode (branch C)', summarizeGroupState(branchCState));
        continue;
      }

      if (local === 'metadata_only') {
        uploadTraceDecision('orchestrator', 'group partial — metadata_only', { groupingKey, jobIds });
        const metaState: UploadGroupResolutionState = {
          status: 'partial',
          groupingKey,
          jobIds,
          searchObject: so,
          folderDisplayPath,
          titleAddressLabel,
          geocodeBranch: 'metadata_only',
        };
        cache.set(groupingKey, metaState);
        continue;
      }

      const row = await this.lookup.findBySearchObject(so);
      if (row) {
        uploadTraceDecision('orchestrator', 'group resolved — DB location hit', {
          groupingKey,
          locationId: row['id'],
          geocodeBranch: local,
        });
        const resolvedState: UploadGroupResolutionState = {
          status: 'resolved',
          groupingKey,
          jobIds,
          searchObject: so,
          folderDisplayPath,
          titleAddressLabel,
          geocodeBranch: local === 'branch_b' ? 'branch_b' : 'branch_a',
          candidate: locationRowToCandidate(row),
        };
        cache.set(groupingKey, resolvedState);
        uploadAddressDebug('orchestrator', 'group → resolved (db)', summarizeGroupState(resolvedState));
        continue;
      }

      const needsGeocodeState: UploadGroupResolutionState = {
        status: 'needsGeocode',
        groupingKey,
        jobIds,
        searchObject: so,
        folderDisplayPath,
        titleAddressLabel,
        geocodeBranch:
          local === 'branch_b' ? 'branch_b' : local === 'branch_a' ? 'branch_a' : 'branch_a',
        projectCentroid: local === 'branch_b' ? (projectCentroid ?? undefined) : undefined,
      };
      cache.set(groupingKey, needsGeocodeState);
      uploadTraceDecision('orchestrator', 'group needsGeocode — no DB row', {
        groupingKey,
        geocodeBranch: needsGeocodeState.geocodeBranch,
        jobIds,
      });
      uploadAddressDebug('orchestrator', 'group → needsGeocode', summarizeGroupState(needsGeocodeState));
    }

    this.batchCaches.set(batchId, cache);
    uploadTraceExit('orchestrator', 'classifyBatch', `groups=${cache.size}`);
    uploadAddressDebug('orchestrator', 'classifyBatch done', {
      batchId,
      groupCount: cache.size,
      groups: [...cache.entries()].map(([key, state]) => ({
        groupingKey: key,
        status: state.status,
        jobCount: state.jobIds.length,
      })),
    });
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
