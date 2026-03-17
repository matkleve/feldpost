/**
 * UploadPanelComponent unit tests.
 *
 * Strategy:
 *  - UploadManagerService is replaced with a fake so no real uploads occur.
 *  - Tests verify DOM structure, signal-driven state changes, and pure component
 *    behaviours such as dismissFile(), retryFile(), and placement delegation.
 *  - The full async upload pipeline is owned by UploadManagerService; here we
 *    only test the thin UI layer and its reactive template bindings.
 */

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ComponentRef, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { UploadPanelComponent } from './upload-panel.component';
import {
  UploadManagerService,
  UploadJob,
  UploadPhase,
  ImageUploadedEvent as ManagerImageUploadedEvent,
  MissingDataEvent,
} from '../../../core/upload-manager.service';
import { WorkspaceViewService } from '../../../core/workspace-view.service';

// ── Fake UploadManagerService ──────────────────────────────────────────────────

function buildFakeUploadManager() {
  const jobsSignal = signal<ReadonlyArray<UploadJob>>([]);
  const batchesSignal = signal<ReadonlyArray<any>>([]);
  const activeBatchSignal = signal<any>(null);
  const imageUploaded$ = new Subject<ManagerImageUploadedEvent>();
  const missingData$ = new Subject<MissingDataEvent>();

  return {
    jobs: jobsSignal.asReadonly(),
    batches: batchesSignal.asReadonly(),
    activeJobs: signal<ReadonlyArray<UploadJob>>([]).asReadonly(),
    isBusy: signal(false).asReadonly(),
    activeBatch: activeBatchSignal.asReadonly(),
    isFolderImportSupported: false,
    activeCount: signal(0).asReadonly(),
    imageUploaded$: imageUploaded$.asObservable(),
    uploadFailed$: new Subject().asObservable(),
    missingData$: missingData$.asObservable(),
    submit: vi.fn().mockReturnValue([]),
    submitFolder: vi.fn().mockResolvedValue('batch-1'),
    retryJob: vi.fn(),
    dismissJob: vi.fn(),
    dismissAllCompleted: vi.fn(),
    cancelJob: vi.fn(),
    placeJob: vi.fn(),
    // Helpers for tests to control state
    _jobsSignal: jobsSignal,
    _batchesSignal: batchesSignal,
    _activeBatchSignal: activeBatchSignal,
    _imageUploaded$: imageUploaded$,
    _missingData$: missingData$,
  };
}

// ── Helper ─────────────────────────────────────────────────────────────────────

function makeUploadJob(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: crypto.randomUUID(),
    batchId: 'test-batch',
    file: new File([new Uint8Array(512) as BlobPart], 'photo.jpg', { type: 'image/jpeg' }),
    phase: 'queued' as UploadPhase,
    progress: 0,
    statusLabel: 'Queued',
    mode: 'new',
    submittedAt: new Date(),
    ...overrides,
  } as UploadJob;
}

async function setup() {
  const fakeManager = buildFakeUploadManager();
  const fakeWorkspaceView = {
    selectedProjectIds: signal<Set<string>>(new Set()).asReadonly(),
  };

  await TestBed.configureTestingModule({
    imports: [UploadPanelComponent],
    providers: [
      { provide: UploadManagerService, useValue: fakeManager },
      { provide: WorkspaceViewService, useValue: fakeWorkspaceView },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(UploadPanelComponent);
  const component = fixture.componentInstance as UploadPanelComponent;
  const ref = fixture.componentRef as ComponentRef<UploadPanelComponent>;
  fixture.detectChanges();
  return { fixture, component, ref, fakeManager };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('UploadPanelComponent', () => {
  describe('creation', () => {
    it('creates', async () => {
      const { component } = await setup();
      expect(component).toBeTruthy();
    });

    it('starts with no jobs', async () => {
      const { component } = await setup();
      expect(component.jobs()).toHaveLength(0);
    });

    it('starts with isDragging false', async () => {
      const { component } = await setup();
      expect(component.isDragging()).toBe(false);
    });
  });

  describe('DOM structure', () => {
    it('renders a drop zone element', async () => {
      const { fixture } = await setup();
      const zone = fixture.debugElement.query(By.css('.upload-panel__dropzone'));
      expect(zone).not.toBeNull();
    });

    it('renders a hidden file input', async () => {
      const { fixture } = await setup();
      const input = fixture.debugElement.query(By.css('.upload-panel__file-input'));
      expect(input).not.toBeNull();
    });

    it('file input accepts the correct MIME types', async () => {
      const { fixture } = await setup();
      const input = fixture.debugElement.query(By.css('.upload-panel__file-input'))
        .nativeElement as HTMLInputElement;
      expect(input.accept).toContain('image/jpeg');
      expect(input.accept).toContain('image/png');
      expect(input.accept).toContain('image/heic');
      expect(input.accept).toContain('video/mp4');
      expect(input.accept).toContain('application/pdf');
    });

    it('file input has multiple attribute', async () => {
      const { fixture } = await setup();
      const input = fixture.debugElement.query(By.css('.upload-panel__file-input'))
        .nativeElement as HTMLInputElement;
      expect(input.multiple).toBe(true);
    });

    it('renders a hidden capture input for take-photo flow', async () => {
      const { fixture } = await setup();
      const input = fixture.debugElement.query(By.css('.upload-panel__capture-input'))
        .nativeElement as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.accept).toBe('image/*');
      expect(input.getAttribute('capture')).toBe('environment');
      expect(input.multiple).toBe(false);
    });

    it('renders the take-photo intake button', async () => {
      const { fixture } = await setup();
      const button = fixture.debugElement.query(By.css('.upload-panel__intake-btn--capture'));
      expect(button).not.toBeNull();
      expect((button.nativeElement as HTMLButtonElement).textContent).toContain('Take photo');
    });

    it('renders a hidden folder input for directory fallback', async () => {
      const { fixture } = await setup();
      const input = fixture.debugElement.query(By.css('.upload-panel__folder-input'))
        .nativeElement as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.multiple).toBe(true);
      expect(input.hasAttribute('webkitdirectory')).toBe(true);
    });

    it('renders the upload-folder intake button', async () => {
      const { fixture } = await setup();
      const buttons = fixture.debugElement.queryAll(By.css('.upload-panel__intake-btn'));
      expect(buttons.length).toBeGreaterThan(0);
      expect((buttons[0].nativeElement as HTMLButtonElement).textContent).toContain(
        'Upload folder',
      );
    });
  });

  describe('panel visibility', () => {
    it('does not add --visible class when visible input is false', async () => {
      const { fixture, ref } = await setup();
      ref.setInput('visible', false);
      fixture.detectChanges();

      const panel = fixture.debugElement.query(By.css('.upload-panel'));
      expect(panel.nativeElement.classList.contains('upload-panel--visible')).toBe(false);
    });

    it('adds --visible class when visible input is true', async () => {
      const { fixture, ref } = await setup();
      ref.setInput('visible', true);
      fixture.detectChanges();

      const panel = fixture.debugElement.query(By.css('.upload-panel'));
      expect(panel.nativeElement.classList.contains('upload-panel--visible')).toBe(true);
    });
  });

  describe('drag-and-drop interactions', () => {
    function makeDragEventStub(): DragEvent {
      return { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as DragEvent;
    }

    it('sets isDragging to true on dragover', async () => {
      const { component } = await setup();

      component.onDragOver(makeDragEventStub());

      expect(component.isDragging()).toBe(true);
    });

    it('sets isDragging to false on dragleave', async () => {
      const { component } = await setup();
      component.isDragging.set(true);

      component.onDragLeave(makeDragEventStub());

      expect(component.isDragging()).toBe(false);
    });

    it('sets isDragging to false on drop', async () => {
      const { component } = await setup();
      component.isDragging.set(true);

      component.onDrop(makeDragEventStub());

      expect(component.isDragging()).toBe(false);
    });

    it('calls uploadManager.submit on drop with files', async () => {
      const { component, fakeManager } = await setup();
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

  describe('job list rendering', () => {
    it('shows file-list element when jobs are present', async () => {
      const { fixture, fakeManager } = await setup();
      fakeManager._jobsSignal.set([makeUploadJob()]);
      fixture.detectChanges();

      const list = fixture.debugElement.query(By.css('.upload-panel__file-list'));
      expect(list).not.toBeNull();
    });

    it('does not render file-list when jobs are empty', async () => {
      const { fixture } = await setup();
      const list = fixture.debugElement.query(By.css('.upload-panel__file-list'));
      expect(list).toBeNull();
    });

    it('renders one list item per job', async () => {
      const { fixture, fakeManager } = await setup();
      fakeManager._jobsSignal.set([makeUploadJob(), makeUploadJob(), makeUploadJob()]);
      fixture.detectChanges();

      const items = fixture.debugElement.queryAll(By.css('.upload-panel__file-item'));
      expect(items.length).toBe(3);
    });
  });

  describe('M4 progress board and lanes', () => {
    it('renders progress board and matrix when jobs exist', async () => {
      const { fixture, fakeManager } = await setup();
      fakeManager._jobsSignal.set([
        makeUploadJob({ phase: 'queued', statusLabel: 'Queued' }),
        makeUploadJob({ phase: 'uploading', statusLabel: 'Uploading' }),
      ]);
      fixture.detectChanges();

      const board = fixture.debugElement.query(By.css('.upload-panel__progress-board'));
      const dots = fixture.debugElement.queryAll(By.css('.upload-panel__dot'));

      expect(board).not.toBeNull();
      expect(dots.length).toBe(2);
    });

    it('shows last upload summary when queue is empty and completed batch exists', async () => {
      const { fixture, fakeManager } = await setup();
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
      expect(lastUpload).not.toBeNull();
      expect(lastUpload.nativeElement.textContent).toContain('Last upload');
      expect(lastUpload.nativeElement.textContent).toContain('Batch · 4 files');
    });

    it('shows idle empty state when no jobs and no completed batch exist', async () => {
      const { fixture, fakeManager } = await setup();
      fakeManager._jobsSignal.set([]);
      fakeManager._batchesSignal.set([]);
      fixture.detectChanges();

      const empty = fixture.debugElement.query(By.css('.upload-panel__empty'));
      expect(empty).not.toBeNull();
      expect(empty.nativeElement.textContent).toContain('No uploads yet');
    });

    it('selects issues lane when clicking lane switch', async () => {
      const { fixture, component, fakeManager } = await setup();
      fakeManager._jobsSignal.set([
        makeUploadJob({ phase: 'uploading', statusLabel: 'Uploading' }),
        makeUploadJob({ phase: 'error', statusLabel: 'Failed', error: 'Denied' }),
      ]);
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('.upload-panel__lane-btn'));
      (buttons[2].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(component.effectiveLane()).toBe('issues');
    });
  });

  describe('dismissFile() and retryFile()', () => {
    it('dismissFile calls uploadManager.dismissJob', async () => {
      const { component, fakeManager } = await setup();
      component.dismissFile('some-id');
      expect(fakeManager.dismissJob).toHaveBeenCalledWith('some-id');
    });

    it('retryFile calls uploadManager.retryJob', async () => {
      const { component, fakeManager } = await setup();
      component.retryFile('some-id');
      expect(fakeManager.retryJob).toHaveBeenCalledWith('some-id');
    });
  });

  describe('photo capture intake', () => {
    it('onCaptureInputChange submits exactly one captured file', async () => {
      const { component, fakeManager } = await setup();
      const file = new File([new Uint8Array(128)], 'captured.jpg', { type: 'image/jpeg' });
      const input = { files: [file], value: 'placeholder' } as unknown as HTMLInputElement;
      const event = { target: input } as unknown as Event;

      component.onCaptureInputChange(event);

      expect(fakeManager.submit).toHaveBeenCalledWith([file], { projectId: undefined });
      expect(input.value).toBe('');
    });

    it('openCapturePicker stops bubbling and triggers capture input click', async () => {
      const { component } = await setup();
      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();
      const click = vi.fn();

      component.openCapturePicker(
        { preventDefault, stopPropagation } as unknown as MouseEvent,
        { click } as unknown as HTMLInputElement,
      );

      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(stopPropagation).toHaveBeenCalledTimes(1);
      expect(click).toHaveBeenCalledTimes(1);
    });

    it('onFolderInputChange submits all selected files', async () => {
      const { component, fakeManager } = await setup();
      const files = [
        new File([new Uint8Array(64)], 'a.jpg', { type: 'image/jpeg' }),
        new File([new Uint8Array(64)], 'b.jpg', { type: 'image/jpeg' }),
      ];
      const input = { files, value: 'placeholder' } as unknown as HTMLInputElement;

      component.onFolderInputChange({ target: input } as unknown as Event);

      expect(fakeManager.submit).toHaveBeenCalledWith(files, { projectId: undefined });
      expect(input.value).toBe('');
    });

    it('onSelectFolder falls back to directory input click when picker API is unavailable', async () => {
      const { component } = await setup();
      const click = vi.fn();
      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();

      await component.onSelectFolder(
        { preventDefault, stopPropagation } as unknown as MouseEvent,
        { click } as unknown as HTMLInputElement,
      );

      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(stopPropagation).toHaveBeenCalledTimes(1);
      expect(click).toHaveBeenCalledTimes(1);
    });
  });

  describe('placement', () => {
    it('placeFile delegates to uploadManager.placeJob', () => {
      const { component, fakeManager } = setup as unknown as never;
      // Extract synchronously
      void (async () => {
        const s = await setup();
        s.component.placeFile('job-1', { lat: 10, lng: 20 });
        expect(s.fakeManager.placeJob).toHaveBeenCalledWith('job-1', { lat: 10, lng: 20 });
      })();
    });

    it('placeFile calls uploadManager.placeJob with correct args', async () => {
      const { component, fakeManager } = await setup();
      component.placeFile('job-1', { lat: 48.2, lng: 16.37 });
      expect(fakeManager.placeJob).toHaveBeenCalledWith('job-1', { lat: 48.2, lng: 16.37 });
    });

    it('requestPlacement emits when job is missing_data', async () => {
      const { component } = await setup();
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
      const { component } = await setup();
      const emitSpy = vi.spyOn(component.placementRequested, 'emit');

      component.requestPlacement('job-1', 'uploading', {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as MouseEvent);

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('does not auto-emit placementRequested on missingData$ manager event', async () => {
      const { component, fakeManager } = await setup();
      const emitSpy = vi.spyOn(component.placementRequested, 'emit');

      fakeManager._missingData$.next({
        jobId: 'job-1',
        batchId: 'batch-1',
        fileName: 'x.jpg',
        reason: 'no_gps_no_address',
      });

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('emits zoomToLocationRequested when clicking uploaded row with coordinates', async () => {
      const { fixture, component, fakeManager } = await setup();
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
      const { fixture, component, fakeManager } = await setup();
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

    it('supports keyboard zoom request on uploaded row', async () => {
      const { fixture, component, fakeManager } = await setup();
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

  describe('missing_data prompt', () => {
    it('renders compact missing_data status text for missing_data jobs', async () => {
      const { fixture, fakeManager } = await setup();
      fakeManager._jobsSignal.set([
        makeUploadJob({ phase: 'missing_data', statusLabel: 'Missing location' }),
      ]);
      fixture.detectChanges();

      const status = fixture.debugElement.query(By.css('.upload-panel__file-status'));
      expect(status).not.toBeNull();
      expect(status.nativeElement.textContent).toContain('Missing GPS');
    });

    it('enables left placement action for missing_data jobs', async () => {
      const { fixture, fakeManager } = await setup();
      fakeManager._jobsSignal.set([
        makeUploadJob({ phase: 'missing_data', statusLabel: 'Missing location' }),
      ]);
      fixture.componentInstance.setSelectedLane('issues');
      fixture.detectChanges();

      const placementButtons = fixture.debugElement.queryAll(
        By.css('.upload-panel__row-action--left'),
      );
      expect((placementButtons[0].nativeElement as HTMLButtonElement).disabled).toBe(false);
    });

    it('disables left placement action for non-missing_data rows', async () => {
      const { fixture, fakeManager } = await setup();
      fakeManager._jobsSignal.set([
        makeUploadJob({ phase: 'uploading', statusLabel: 'Uploading' }),
      ]);
      fixture.detectChanges();

      const placementButton = fixture.debugElement.query(By.css('.upload-panel__row-action--left'));
      expect((placementButton.nativeElement as HTMLButtonElement).disabled).toBe(true);
    });

    it('does not render missing_data status text for completed jobs', async () => {
      const { fixture, fakeManager } = await setup();
      fakeManager._jobsSignal.set([makeUploadJob({ phase: 'complete', statusLabel: 'Uploaded' })]);
      fixture.detectChanges();

      const status = fixture.debugElement.query(By.css('.upload-panel__file-status'));
      expect(status.nativeElement.textContent).not.toContain('Missing GPS');
    });
  });

  describe('error display', () => {
    it('renders error text in compact status line for error-phase jobs', async () => {
      const { fixture, fakeManager } = await setup();
      fakeManager._jobsSignal.set([
        makeUploadJob({ phase: 'error', statusLabel: 'Failed', error: 'File too large' }),
      ]);
      fixture.detectChanges();

      const status = fixture.debugElement.query(By.css('.upload-panel__file-status'));
      expect(status).not.toBeNull();
      expect(status.nativeElement.textContent).toContain('File too large');
    });

    it('does not render retry button in compact row mode', async () => {
      const { fixture, fakeManager } = await setup();
      fakeManager._jobsSignal.set([
        makeUploadJob({ phase: 'error', statusLabel: 'Failed', error: 'Failed' }),
      ]);
      fixture.detectChanges();

      const retry = fixture.debugElement.query(By.css('.upload-panel__retry'));
      expect(retry).toBeNull();

      const dismiss = fixture.debugElement.query(By.css('.upload-panel__row-action--right'));
      expect(dismiss).not.toBeNull();
    });
  });

  describe('trackByJobId()', () => {
    it('returns the job id', async () => {
      const { component } = await setup();
      const job = makeUploadJob();

      expect(component.trackByJobId(0, job)).toBe(job.id);
    });
  });
});
