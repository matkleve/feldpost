import { Injectable, computed, signal, type Signal, type WritableSignal } from '@angular/core';
import type { UploadJob } from '../../core/upload/upload-manager.service';
import type { SegmentedSwitchOption } from '../../shared/segmented-switch/segmented-switch.component';
import {
  buildLaneSwitchOptions,
  isRetryableJob,
  sortUploadedByPriority,
  type UploadLaneCounts,
} from './upload-panel-helpers';
import type { UploadLane } from './upload-phase.helpers';

export interface UploadPanelViewModelRegisterOptions {
  t: (key: string, fallback?: string) => string;
  laneCounts: Signal<UploadLaneCounts>;
  effectiveLane: Signal<UploadLane>;
  laneJobs: Signal<ReadonlyArray<UploadJob>>;
  issueAttentionPulse: Signal<boolean>;
  prioritizedUploadedJobIds: WritableSignal<Set<string>>;
  jobs: Signal<ReadonlyArray<UploadJob>>;
  selectedUploadJobIds: WritableSignal<Set<string>>;
  canZoomToJob: (job: UploadJob) => boolean;
}

@Injectable()
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
