import { computed, Injectable, signal } from '@angular/core';
import type { UploadJob } from '../../core/upload/upload-manager.service';
import type { SegmentedSwitchOption } from '../../shared/segmented-switch/segmented-switch.component';
import {
  buildLaneSwitchOptions,
  sortUploadedByPriority,
  isRetryableJob,
} from './upload-panel-helpers';
import type { UploadLaneCounts } from './upload-panel-helpers';
import type { UploadLane } from './upload-phase.helpers';

export interface UploadPanelViewModelRegisterOptions {
  t: (key: string, fallback?: string) => string;
  laneCounts: () => UploadLaneCounts;
  issueAttentionPulse: () => boolean;
  effectiveLane: () => UploadLane;
  laneJobs: () => ReadonlyArray<UploadJob>;
  prioritizedUploadedJobIds: () => ReadonlySet<string>;
  selectedUploadJobIds: () => ReadonlySet<string>;
  jobs: () => ReadonlyArray<UploadJob>;
  canZoomToJob: (job: UploadJob) => boolean;
}

/**
 * UploadPanelViewModelService — Presentation logic and UI helper functions.
 *
 * Purpose: Provide computed UI state for template rendering:
 *  - Lane switch options (labels, badge counts)
 *  - File list sorting (uploaded by priority, issues by phase)
 *  - Retry eligibility (which jobs can be retried)
 *  - Selection state and bulk action filtering
 *  - Zoom capability checking (can zoom to job on map)
 *
 * Delegates to:
 *  - upload-panel-helpers: buildLaneSwitchOptions, sortUploadedByPriority, isRetryableJob
 *  - UploadPanelRegistration: Static factory for view model registration
 *
 * Lifecycle: Created once at panel initialization; survives component rebuild.
 */
@Injectable({ providedIn: 'root' })
export class UploadPanelViewModelService {
  private readonly options = signal<UploadPanelViewModelRegisterOptions | null>(null);

  register(options: UploadPanelViewModelRegisterOptions): void {
    this.options.set(options);
  }

  readonly laneSwitchOptions = computed<SegmentedSwitchOption[]>(() => {
    const options = this.options();
    if (!options) {
      return [];
    }

    return buildLaneSwitchOptions(
      options.t,
      options.laneCounts(),
      options.issueAttentionPulse(),
      options.effectiveLane(),
    );
  });

  readonly visibleLaneJobs = computed<ReadonlyArray<UploadJob>>(() => {
    const options = this.options();
    if (!options) {
      return [];
    }

    const jobs = options.laneJobs();
    if (options.effectiveLane() !== 'uploaded') {
      return jobs;
    }

    const prioritizedIds = options.prioritizedUploadedJobIds();
    if (prioritizedIds.size === 0) {
      return jobs;
    }

    return sortUploadedByPriority(jobs, prioritizedIds);
  });

  readonly selectedUploadJobs = computed(() => {
    const options = this.options();
    if (!options) {
      return [] as UploadJob[];
    }

    const selected = options.selectedUploadJobIds();
    if (selected.size === 0) {
      return [] as UploadJob[];
    }

    return options.jobs().filter((job) => selected.has(job.id));
  });

  readonly hasSelectedUploadJobs = computed(() => this.selectedUploadJobs().length > 0);

  readonly hasRetryableSelection = computed(() =>
    this.selectedUploadJobs().some((job) => isRetryableJob(job)),
  );

  readonly canDownloadSelectedUploads = computed(() => {
    const options = this.options();
    if (!options) {
      return false;
    }

    const jobs = this.selectedUploadJobs();
    if (jobs.length === 0) {
      return false;
    }

    return jobs.every((job) => !!job.imageId && !!job.storagePath && options.canZoomToJob(job));
  });
}
