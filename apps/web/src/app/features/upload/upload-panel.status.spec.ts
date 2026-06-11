import { makeUploadJob, setupUploadPanel } from './upload-panel.test-utils.spec';

describe('UploadPanelComponent missing_data prompt', () => {
  it('renders compact missing_data status text for missing_data jobs', async () => {
    const { component } = await setupUploadPanel({
      initialJobs: [makeUploadJob({ phase: 'missing_data', statusLabel: 'Missing location' })],
    });
    component.laneHandlers.setSelectedLane('issues');

    expect(component.visibleLaneJobs()[0]?.statusLabel).toBe('Missing location');
  });

  it('enables row interaction for missing_data jobs', async () => {
    const job = makeUploadJob({ phase: 'missing_data', statusLabel: 'Missing location' });
    const { component } = await setupUploadPanel({ initialJobs: [job] });
    component.laneHandlers.setSelectedLane('issues');

    expect(component.rowHandlers.isRowInteractive(job)).toBe(true);
  });

  it('disables row interaction for non-missing_data rows', async () => {
    const job = makeUploadJob({ phase: 'uploading', statusLabel: 'Uploading' });
    const { component } = await setupUploadPanel({ initialJobs: [job] });

    expect(component.rowHandlers.isRowInteractive(job)).toBe(false);
  });

  it('does not render missing_data status text for completed jobs', async () => {
    const { component } = await setupUploadPanel({
      initialJobs: [makeUploadJob({ phase: 'complete', statusLabel: 'Uploaded' })],
    });
    component.laneHandlers.setSelectedLane('uploaded');

    expect(component.visibleLaneJobs()[0]?.statusLabel).toBe('Uploaded');
    expect(component.visibleLaneJobs()[0]?.statusLabel).not.toContain('Missing location');
  });
});

describe('UploadPanelComponent error display', () => {
  it('renders error text in compact status line for error-phase jobs', async () => {
    const { component } = await setupUploadPanel({
      initialJobs: [
        makeUploadJob({ phase: 'error', statusLabel: 'Failed', error: 'File too large' }),
      ],
    });
    component.laneHandlers.setSelectedLane('issues');

    expect(component.visibleLaneJobs()[0]?.error).toBe('File too large');
  });

  it('does not render retry button in compact row mode', async () => {
    const { fixture, component } = await setupUploadPanel({
      initialJobs: [makeUploadJob({ phase: 'error', statusLabel: 'Failed', error: 'Failed' })],
    });
    component.laneHandlers.setSelectedLane('uploaded');

    expect(fixture.nativeElement.querySelector('.upload-panel__retry')).toBeNull();
    expect(component.visibleLaneJobs().length).toBe(0);
  });
});

describe('UploadPanelComponent trackByJobId()', () => {
  it('returns the job id', async () => {
    const { component } = await setupUploadPanel();
    const job = makeUploadJob({ id: 'job-track-1' });
    expect(component.trackByJobId(0, job)).toBe('job-track-1');
  });
});
