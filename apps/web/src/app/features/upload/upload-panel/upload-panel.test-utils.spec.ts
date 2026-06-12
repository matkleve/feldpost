import { type ComponentRef, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { UploadPanelComponent } from './upload-panel.component';
import {
  UploadManagerService,
  type ImageUploadedEvent as ManagerImageUploadedEvent,
  type JobPhaseChangedEvent,
  type MissingDataEvent,
  type UploadBatch,
  type UploadJob,
  type UploadPhase,
} from '../../../core/upload/upload-manager.service';
import { WorkspaceViewService } from '../../../core/workspace-view/workspace-view.service';
import { WORKSPACE_PANE_SHELL_HOST } from '../../../core/workspace-pane/workspace-pane-shell-host.token';

export function buildFakeUploadManager() {
  const jobsSignal = signal<ReadonlyArray<UploadJob>>([]);
  const batchesSignal = signal<ReadonlyArray<UploadBatch>>([]);
  const activeBatchSignal = signal<UploadBatch | null>(null);
  const imageUploaded$ = new Subject<ManagerImageUploadedEvent>();
  const missingData$ = new Subject<MissingDataEvent>();
  const jobPhaseChanged$ = new Subject<JobPhaseChangedEvent>();
  const duplicateDetected$ = new Subject<unknown>();

  return {
    jobs: jobsSignal.asReadonly(),
    batches: batchesSignal.asReadonly(),
    activeJobs: signal<ReadonlyArray<UploadJob>>([]).asReadonly(),
    isBusy: signal(false).asReadonly(),
    activeBatch: activeBatchSignal.asReadonly(),
    isFolderImportSupported: true,
    activeCount: signal(0).asReadonly(),
    imageUploaded$: imageUploaded$.asObservable(),
    jobPhaseChanged$: jobPhaseChanged$.asObservable(),
    uploadFailed$: new Subject().asObservable(),
    missingData$: missingData$.asObservable(),
    duplicateDetected$: duplicateDetected$.asObservable(),
    submit: vi.fn().mockReturnValue([]),
    submitFolder: vi.fn().mockResolvedValue('batch-1'),
    submitWebkitFolder: vi.fn().mockResolvedValue('batch-webkit'),
    retryJob: vi.fn(),
    dismissJob: vi.fn(),
    dismissAllCompleted: vi.fn(),
    cancelJob: vi.fn(),
    placeJob: vi.fn(),
    _jobsSignal: jobsSignal,
    _batchesSignal: batchesSignal,
    _activeBatchSignal: activeBatchSignal,
    _imageUploaded$: imageUploaded$,
    _missingData$: missingData$,
    _jobPhaseChanged$: jobPhaseChanged$,
    _duplicateDetected$: duplicateDetected$,
  };
}

export type FakeUploadManager = ReturnType<typeof buildFakeUploadManager>;

export function makeUploadJob(overrides: Partial<UploadJob> = {}): UploadJob {
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

export type UploadPanelSetupResult = {
  fixture: ComponentFixture<UploadPanelComponent>;
  component: UploadPanelComponent;
  ref: ComponentRef<UploadPanelComponent>;
  fakeManager: FakeUploadManager;
};

export async function setupUploadPanel(
  options: {
    initialJobs?: ReadonlyArray<UploadJob>;
    /** Skip the initial detectChanges so callers can set inputs first. */
    deferChangeDetection?: boolean;
  } = {},
): Promise<UploadPanelSetupResult> {
  const fakeManager = buildFakeUploadManager();
  const fakeWorkspaceView = {
    selectedProjectIds: signal<Set<string>>(new Set()).asReadonly(),
  };

  const fakeShellHost = {
    openDetailView: vi.fn(),
    closeDetailView: vi.fn(),
    closeWorkspacePane: vi.fn(),
    onWorkspaceWidthChange: vi.fn(),
    onWorkspacePaneActiveTabChange: vi.fn(),
    onDetailAddressSearchRequestConsumed: vi.fn(),
    onZoomToLocationRequested: vi.fn(),
    onImageUploadedFromWorkspacePane: vi.fn(),
    enterPlacementModeFromWorkspacePane: vi.fn(),
    onUploadLocationPreviewRequestedFromWorkspacePane: vi.fn(),
    onUploadLocationPreviewClearedFromWorkspacePane: vi.fn(),
    onUploadLocationMapPickRequestedFromWorkspacePane: vi.fn(),
    onWorkspaceItemHoverStartedFromPane: vi.fn(),
    onWorkspaceItemHoverEndedFromPane: vi.fn(),
  };

  await TestBed.configureTestingModule({
    imports: [UploadPanelComponent],
    providers: [
      { provide: UploadManagerService, useValue: fakeManager },
      { provide: WorkspaceViewService, useValue: fakeWorkspaceView },
      { provide: WORKSPACE_PANE_SHELL_HOST, useValue: fakeShellHost },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(UploadPanelComponent);
  const component = fixture.componentInstance;
  const ref = fixture.componentRef;

  if (options.initialJobs?.length) {
    fakeManager._jobsSignal.set(options.initialJobs);
  }

  if (!options.deferChangeDetection && !options.initialJobs?.length) {
    fixture.detectChanges();
  }

  return {
    fixture,
    component,
    ref,
    fakeManager,
  };
}
