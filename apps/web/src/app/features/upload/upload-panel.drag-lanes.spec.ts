import { By } from '@angular/platform-browser';
import { makeUploadJob, setupUploadPanel } from './upload-panel.test-utils.spec';

describe('UploadPanelComponent drag-and-drop interactions', () => {
  function makeDragEventStub(): DragEvent {
    return { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as DragEvent;
  }

  it('sets isDragging to true on dragover', async () => {
    const { component } = await setupUploadPanel();

    component.inputHandlers.onDragOver(makeDragEventStub());

    expect(component.isDragging()).toBe(true);
  });

  it('sets isDragging to false on dragleave', async () => {
    const { component } = await setupUploadPanel();
    component.inputHandlers.onDragOver(makeDragEventStub());

    component.inputHandlers.onDragLeave(makeDragEventStub());

    expect(component.isDragging()).toBe(false);
  });

  it('sets isDragging to false on drop', async () => {
    const { component } = await setupUploadPanel();
    component.inputHandlers.onDragOver(makeDragEventStub());

    component.inputHandlers.onDrop(makeDragEventStub());

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

    component.inputHandlers.onDrop(event);

    expect(fakeManager.submit).toHaveBeenCalledWith([file], {
      projectId: undefined,
      locationRequirementMode: 'required',
    });
  });
});

describe('UploadPanelComponent progress board', () => {
  it('renders segmented lane switch and no dot matrix when jobs exist', async () => {
    const { component } = await setupUploadPanel({
      initialJobs: [
        makeUploadJob({ phase: 'queued', statusLabel: 'Queued' }),
        makeUploadJob({ phase: 'uploading', statusLabel: 'Uploading' }),
      ],
    });

    expect(component.showProgressBoard()).toBe(true);
    expect(component.laneSwitchOptions().length).toBeGreaterThan(0);
    expect(component.laneSwitchOptions().every((option) => !option.label?.includes('•'))).toBe(true);
  });

  it('does not show legacy last upload summary when queue is empty and completed batch exists', async () => {
    const { fixture, fakeManager } = await setupUploadPanel();
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
    const { component } = await setupUploadPanel();

    expect(component.showProgressBoard()).toBe(false);
    expect(component.jobs().length).toBe(0);
  });
});

describe('UploadPanelComponent lanes', () => {
  it('selects issues lane when clicking lane switch', async () => {
    const { component } = await setupUploadPanel({
      initialJobs: [
        makeUploadJob({ phase: 'uploading', statusLabel: 'Uploading' }),
        makeUploadJob({ phase: 'error', statusLabel: 'Failed', error: 'Denied' }),
      ],
    });

    component.laneHandlers.onLaneSwitchValueChange('issues');

    expect(component.effectiveLane()).toBe('issues');
  });

  it('counts missing_data jobs in issues lane', async () => {
    const { component } = await setupUploadPanel({
      initialJobs: [
        makeUploadJob({ phase: 'uploading', statusLabel: 'Uploading' }),
        makeUploadJob({ phase: 'missing_data', statusLabel: 'Missing location' }),
      ],
    });

    expect(component.laneCounts().issues).toBe(1);
    expect(component.laneCounts().uploading).toBe(1);
  });

  it('routes jobs with missing-location status text to issues lane', async () => {
    const { component } = await setupUploadPanel({
      initialJobs: [makeUploadJob({ phase: 'uploading', statusLabel: 'Missing location' })],
    });
    component.laneHandlers.setSelectedLane('issues');

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
    component.rowHandlers.retryFile('some-id');
    expect(fakeManager.retryJob).toHaveBeenCalledWith('some-id');
  });
});
