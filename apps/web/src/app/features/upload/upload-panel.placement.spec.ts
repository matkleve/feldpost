import { By } from '@angular/platform-browser';
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
    const { component } = await setupUploadPanel();
    const emitSpy = vi.spyOn(component.placementRequested, 'emit');
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();

    component.requestPlacement('job-1', 'missing_data', {
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

    component.requestPlacement('job-1', 'uploading', {
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

describe('UploadPanelComponent zoom click interactions', () => {
  it('emits zoomToLocationRequested when clicking uploaded row with coordinates', async () => {
    const { fixture, component, fakeManager } = await setupUploadPanel();
    const zoomSpy = vi.spyOn(component.zoomToLocationRequested, 'emit');
    const job = makeUploadJob({
      phase: 'complete',
      imageId: 'img-123',
      coords: { lat: 48.2082, lng: 16.3738 },
    });

    fakeManager._jobsSignal.set([job]);
    fixture.detectChanges();

    const rowMain = fixture.debugElement.query(By.css('.upload-panel__file-main'));
    (rowMain.nativeElement as HTMLElement).click();

    expect(zoomSpy).toHaveBeenCalledWith({
      imageId: 'img-123',
      lat: 48.2082,
      lng: 16.3738,
    });
  });

  it('does not emit zoomToLocationRequested when uploaded row has no coords', async () => {
    const { fixture, component, fakeManager } = await setupUploadPanel();
    const zoomSpy = vi.spyOn(component.zoomToLocationRequested, 'emit');

    fakeManager._jobsSignal.set([
      makeUploadJob({
        phase: 'complete',
        imageId: 'img-123',
        coords: undefined,
      }),
    ]);
    fixture.detectChanges();

    const rowMain = fixture.debugElement.query(By.css('.upload-panel__file-main'));
    (rowMain.nativeElement as HTMLElement).click();

    expect(zoomSpy).not.toHaveBeenCalled();
  });
});

describe('UploadPanelComponent zoom keyboard interactions', () => {
  it('supports keyboard zoom request on uploaded row', async () => {
    const { fixture, component, fakeManager } = await setupUploadPanel();
    const zoomSpy = vi.spyOn(component.zoomToLocationRequested, 'emit');

    fakeManager._jobsSignal.set([
      makeUploadJob({
        phase: 'complete',
        imageId: 'img-123',
        coords: { lat: 48.2082, lng: 16.3738 },
      }),
    ]);
    fixture.detectChanges();

    const rowMain = fixture.debugElement.query(By.css('.upload-panel__file-main'));
    (rowMain.nativeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter' }),
    );

    expect(zoomSpy).toHaveBeenCalledWith({
      imageId: 'img-123',
      lat: 48.2082,
      lng: 16.3738,
    });
  });
});

describe('UploadPanelComponent row placement interactions', () => {
  it('emits placementRequested when clicking missing_data row main area', async () => {
    const { fixture, component, fakeManager } = await setupUploadPanel();
    const placementSpy = vi.spyOn(component.placementRequested, 'emit');

    fakeManager._jobsSignal.set([
      makeUploadJob({
        phase: 'missing_data',
        statusLabel: 'Missing location',
      }),
    ]);
    component.setSelectedLane('issues');
    fixture.detectChanges();

    const rowMain = fixture.debugElement.query(By.css('.upload-panel__file-main'));
    (rowMain.nativeElement as HTMLElement).click();

    expect(placementSpy).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard placement request on missing_data row', async () => {
    const { fixture, component, fakeManager } = await setupUploadPanel();
    const placementSpy = vi.spyOn(component.placementRequested, 'emit');

    fakeManager._jobsSignal.set([
      makeUploadJob({
        phase: 'missing_data',
        statusLabel: 'Missing location',
      }),
    ]);
    component.setSelectedLane('issues');
    fixture.detectChanges();

    const rowMain = fixture.debugElement.query(By.css('.upload-panel__file-main'));
    (rowMain.nativeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter' }),
    );

    expect(placementSpy).toHaveBeenCalledTimes(1);
  });
});
