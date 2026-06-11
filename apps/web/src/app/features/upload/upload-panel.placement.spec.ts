import { makeUploadJob, setupUploadPanel } from './upload-panel.test-utils.spec';

describe('UploadPanelComponent placement API interactions', () => {
  it('placeFile delegates to uploadManager.placeJob', async () => {
    const { component, fakeManager } = await setupUploadPanel();
    component.placeFile('job-1', { lat: 10, lng: 20 });
    expect(fakeManager.placeJob).toHaveBeenCalledWith('job-1', { lat: 10, lng: 20 });
  });

  it('placeFile calls uploadManager.placeJob with correct args', async () => {
    const { component, fakeManager } = await setupUploadPanel();
    component.placeFile('job-1', { lat: 48.2, lng: 16.37 });
    expect(fakeManager.placeJob).toHaveBeenCalledWith('job-1', { lat: 48.2, lng: 16.37 });
  });

  it('requestPlacement emits when job is missing_data', async () => {
    const job = makeUploadJob({ id: 'job-1', phase: 'missing_data' });
    const { component, fakeManager } = await setupUploadPanel({ initialJobs: [job] });
    const emitSpy = vi.spyOn(component.placementRequested, 'emit');
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();

    component.rowInteractionHandlers.requestPlacement('job-1', 'missing_data', {
      preventDefault,
      stopPropagation,
    } as unknown as MouseEvent);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith('job-1');
  });

  it('requestPlacement does not emit for non-missing_data phases', async () => {
    const { component } = await setupUploadPanel();
    const emitSpy = vi.spyOn(component.placementRequested, 'emit');

    component.rowInteractionHandlers.requestPlacement('job-1', 'uploading', {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent);

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('does not auto-emit placementRequested on missingData$ manager event', async () => {
    const { component, fakeManager } = await setupUploadPanel();
    const emitSpy = vi.spyOn(component.placementRequested, 'emit');

    fakeManager._missingData$.next({
      jobId: 'job-1',
      batchId: 'batch-1',
      fileName: 'x.jpg',
      reason: 'no_gps_no_address',
    });

    expect(emitSpy).not.toHaveBeenCalled();
  });
});

describe('UploadPanelComponent workspace detail click interactions', () => {
  it('emits detailRequested when clicking uploaded row with coordinates', async () => {
    const { component, fakeManager } = await setupUploadPanel();
    const detailSpy = vi.spyOn(component.detailRequested, 'emit');
    const job = makeUploadJob({
      phase: 'complete',
      mediaId: 'img-123',
      coords: { lat: 48.2082, lng: 16.3738 },
    });

    fakeManager._jobsSignal.set([job]);
    component.rowInteractionHandlers.onRowMainClick(job);

    expect(detailSpy).toHaveBeenCalledWith('img-123');
  });

  it('emits detailRequested when clicking the file name on an uploaded row', async () => {
    const { component, fakeManager } = await setupUploadPanel();
    const detailSpy = vi.spyOn(component.detailRequested, 'emit');
    const job = makeUploadJob({
      phase: 'complete',
      mediaId: 'img-456',
      coords: undefined,
    });

    fakeManager._jobsSignal.set([job]);
    component.rowInteractionHandlers.onRowMainClick(job);

    expect(detailSpy).toHaveBeenCalledWith('img-456');
  });

  it('emits detailRequested when clicking duplicate issue row with existing media', async () => {
    const { component, fakeManager } = await setupUploadPanel();
    const detailSpy = vi.spyOn(component.detailRequested, 'emit');
    const job = makeUploadJob({
      phase: 'skipped',
      existingMediaId: 'img-existing-99',
      statusLabel: 'Already uploaded',
    });

    fakeManager._jobsSignal.set([job]);
    component.rowInteractionHandlers.onRowMainClick(job);

    expect(detailSpy).toHaveBeenCalledWith('img-existing-99');
  });

  it('emits detailRequested when uploaded row has no coords but persisted media', async () => {
    const { component, fakeManager } = await setupUploadPanel();
    const detailSpy = vi.spyOn(component.detailRequested, 'emit');
    const job = makeUploadJob({
      phase: 'complete',
      mediaId: 'img-123',
      coords: undefined,
    });

    fakeManager._jobsSignal.set([job]);
    component.rowInteractionHandlers.onRowMainClick(job);

    expect(detailSpy).toHaveBeenCalledWith('img-123');
  });
});

describe('UploadPanelComponent workspace detail keyboard interactions', () => {
  it('supports keyboard open-detail request on uploaded row', async () => {
    const { component, fakeManager } = await setupUploadPanel();
    const detailSpy = vi.spyOn(component.detailRequested, 'emit');
    const job = makeUploadJob({
      phase: 'complete',
      mediaId: 'img-123',
      coords: { lat: 48.2082, lng: 16.3738 },
    });

    fakeManager._jobsSignal.set([job]);
    component.rowInteractionHandlers.onRowMainKeydown(
      job,
      new KeyboardEvent('keydown', { key: 'Enter' }),
    );

    expect(detailSpy).toHaveBeenCalledWith('img-123');
  });
});

describe('UploadPanelComponent row placement interactions', () => {
  it('emits placementRequested when clicking missing_data row main area', async () => {
    const { component, fakeManager } = await setupUploadPanel();
    const placementSpy = vi.spyOn(component.placementRequested, 'emit');
    const job = makeUploadJob({
      phase: 'missing_data',
      statusLabel: 'Missing location',
    });

    fakeManager._jobsSignal.set([job]);
    component.rowInteractionHandlers.onRowMainClick(job);

    expect(placementSpy).toHaveBeenCalledWith(job.id);
  });

  it('supports keyboard placement request on missing_data row', async () => {
    const { component, fakeManager } = await setupUploadPanel();
    const placementSpy = vi.spyOn(component.placementRequested, 'emit');
    const job = makeUploadJob({
      phase: 'missing_data',
      statusLabel: 'Missing location',
    });

    fakeManager._jobsSignal.set([job]);
    component.rowInteractionHandlers.onRowMainKeydown(
      job,
      new KeyboardEvent('keydown', { key: 'Enter' }),
    );

    expect(placementSpy).toHaveBeenCalledWith(job.id);
  });
});
