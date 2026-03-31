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
