import { By } from '@angular/platform-browser';
import { makeUploadJob, setupUploadPanel } from './upload-panel.test-utils.spec';

describe('UploadPanelComponent drag-and-drop interactions', () => {
  function makeDragEventStub(): DragEvent {
    return { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as DragEvent;
  }

  it('sets isDragging to true on dragover', async () => {
    const { component } = await setupUploadPanel();

    component.onDragOver(makeDragEventStub());

    expect(component.isDragging()).toBe(true);
  });

  it('sets isDragging to false on dragleave', async () => {
    const { component } = await setupUploadPanel();
    component.isDragging.set(true);

    component.onDragLeave(makeDragEventStub());

    expect(component.isDragging()).toBe(false);
  });

  it('sets isDragging to false on drop', async () => {
    const { component } = await setupUploadPanel();
    component.isDragging.set(true);

    component.onDrop(makeDragEventStub());

    expect(component.isDragging()).toBe(false);
  });

  it('calls uploadManager.submit on drop with files', async () => {
    const { component, fakeManager } = await setupUploadPanel();
    const file = new File([new Uint8Array(512)], 'test.jpg', { type: 'image/jpeg' });
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: { files: [file] },
    } as unknown as DragEvent;

    component.onDrop(event);

    expect(fakeManager.submit).toHaveBeenCalledWith([file], { projectId: undefined });
  });
});

describe('UploadPanelComponent progress board', () => {
  it('renders segmented lane switch and no dot matrix when jobs exist', async () => {
    const { fixture, fakeManager } = await setupUploadPanel();
    fakeManager._jobsSignal.set([
      makeUploadJob({ phase: 'queued', statusLabel: 'Queued' }),
      makeUploadJob({ phase: 'uploading', statusLabel: 'Uploading' }),
    ]);
    fixture.detectChanges();

    const board = fixture.debugElement.query(By.css('.ui-tab-list[role="tablist"]'));
    const dots = fixture.debugElement.queryAll(By.css('.upload-panel__dot'));

    expect(board).not.toBeNull();
    expect(dots.length).toBe(0);
  });

  it('does not show legacy last upload summary when queue is empty and completed batch exists', async () => {
    const { fixture, fakeManager } = await setupUploadPanel();
    fakeManager._jobsSignal.set([]);
    fakeManager._batchesSignal.set([
      {
        id: 'batch-1',
        label: 'Batch A',
        totalFiles: 4,
        completedFiles: 4,
        skippedFiles: 0,
        failedFiles: 0,
        overallProgress: 100,
        status: 'complete',
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    ]);
    fixture.detectChanges();

    const lastUpload = fixture.debugElement.query(By.css('.upload-panel__last-upload'));
    expect(lastUpload).toBeNull();
  });

  it('shows idle empty state when no jobs and no completed batch exist', async () => {
    const { fixture, fakeManager } = await setupUploadPanel();
    fakeManager._jobsSignal.set([]);
    fakeManager._batchesSignal.set([]);
    fixture.detectChanges();

    const empty = fixture.debugElement.query(By.css('.upload-panel__empty'));
    expect(empty).not.toBeNull();
    expect(empty.nativeElement.textContent).toContain('No uploads yet');
  });
});

describe('UploadPanelComponent lanes', () => {
  it('selects issues lane when clicking lane switch', async () => {
    const { fixture, component, fakeManager } = await setupUploadPanel();
    fakeManager._jobsSignal.set([
      makeUploadJob({ phase: 'uploading', statusLabel: 'Uploading' }),
      makeUploadJob({ phase: 'error', statusLabel: 'Failed', error: 'Denied' }),
    ]);
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('.ui-tab[role="tab"]'));
    (buttons[2].nativeElement as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.effectiveLane()).toBe('issues');
  });

  it('counts missing_data jobs in issues lane', async () => {
    const { fixture, component, fakeManager } = await setupUploadPanel();
    fakeManager._jobsSignal.set([
      makeUploadJob({ phase: 'uploading', statusLabel: 'Uploading' }),
      makeUploadJob({ phase: 'missing_data', statusLabel: 'Missing location' }),
    ]);
    fixture.detectChanges();

    expect(component.laneCounts().issues).toBe(1);
    expect(component.laneCounts().uploading).toBe(1);
  });

  it('routes jobs with missing-location status text to issues lane', async () => {
    const { fixture, component, fakeManager } = await setupUploadPanel();
    fakeManager._jobsSignal.set([
      makeUploadJob({ phase: 'uploading', statusLabel: 'Missing location' }),
    ]);
    component.setSelectedLane('issues');
    fixture.detectChanges();

    expect(component.visibleLaneJobs().length).toBe(1);
    expect(component.visibleLaneJobs()[0]?.statusLabel).toBe('Missing location');
  });
});

describe('UploadPanelComponent actions', () => {
  it('dismissFile calls uploadManager.dismissJob', async () => {
    const { component, fakeManager } = await setupUploadPanel();
    component.dismissFile('some-id');
    expect(fakeManager.dismissJob).toHaveBeenCalledWith('some-id');
  });

  it('retryFile calls uploadManager.retryJob', async () => {
    const { component, fakeManager } = await setupUploadPanel();
    component.retryFile('some-id');
    expect(fakeManager.retryJob).toHaveBeenCalledWith('some-id');
  });
});
