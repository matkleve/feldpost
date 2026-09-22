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
import { DeferredLocationCountAdapter } from '../../../core/media-location-bulk/deferred-location-count.adapter';
import { DeferredLocationBulkFlowService } from '../../../core/media-location-bulk/deferred-location-bulk-flow.service';

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
  fakeDeferredCounts: FakeDeferredLocationCountAdapter;
  fakeBulkFlow: Record<string, unknown>;
};

/**
 * The panel reads the deferred-location backlog (#232). Every panel spec gets a counting adapter
 * that answers from memory, because the alternative is each of them reaching a real Supabase client
 * to render a header figure. Specs that care about the figures pass their own `deferredCounts`.
 */
export interface FakeDeferredLocationCounts {
  all: number;
  byStatus: Record<string, number>;
}

export interface FakeDeferredLocationCountAdapter {
  countAll: ReturnType<typeof vi.fn>;
  countWithStatusIn: ReturnType<typeof vi.fn>;
}

export function buildFakeDeferredLocationCountAdapter(
  counts: FakeDeferredLocationCounts = { all: 0, byStatus: {} },
): FakeDeferredLocationCountAdapter {
  return {
    countAll: vi.fn(async () => counts.all),
    countWithStatusIn: vi.fn(async (statuses: readonly string[]) =>
      statuses.reduce((sum, status) => sum + (counts.byStatus[status] ?? 0), 0),
    ),
  };
}

function buildFakeShellHost(): Record<string, ReturnType<typeof vi.fn>> {
  return {
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
}

/**
 * The bulk flow the backlog figures start. Faked wholesale in panel specs: the real one reaches a
 * geocoder and writes locations, which is not what a panel spec is asserting.
 */
export function buildFakeDeferredBulkFlow(): Record<string, unknown> {
  return {
    open: signal(false).asReadonly(),
    bucket: signal<string | null>(null).asReadonly(),
    plan: signal<unknown>(null).asReadonly(),
    running: signal(false).asReadonly(),
    progress: signal<unknown>(null).asReadonly(),
    report: signal<unknown>(null).asReadonly(),
    error: signal<string | null>(null).asReadonly(),
    openBucket: vi.fn(async () => undefined),
    confirm: vi.fn(async () => undefined),
    cancel: vi.fn(),
  };
}

export async function setupUploadPanel(
  options: {
    initialJobs?: ReadonlyArray<UploadJob>;
    /** Skip the initial detectChanges so callers can set inputs first. */
    deferChangeDetection?: boolean;
    /** Backlog figures the counting adapter should report. Defaults to an empty library. */
    deferredCounts?: FakeDeferredLocationCounts;
    /** Replace the faked bulk flow, e.g. to drive the dialog's open state. */
    bulkFlow?: Record<string, unknown>;
  } = {},
): Promise<UploadPanelSetupResult> {
  const fakeManager = buildFakeUploadManager();
  const fakeWorkspaceView = {
    selectedProjectIds: signal<Set<string>>(new Set()).asReadonly(),
  };

  const fakeDeferredCounts = buildFakeDeferredLocationCountAdapter(options.deferredCounts);
  const fakeBulkFlow = options.bulkFlow ?? buildFakeDeferredBulkFlow();

  const fakeShellHost = buildFakeShellHost();

  await TestBed.configureTestingModule({
    imports: [UploadPanelComponent],
    providers: [
      { provide: UploadManagerService, useValue: fakeManager },
      { provide: WorkspaceViewService, useValue: fakeWorkspaceView },
      { provide: WORKSPACE_PANE_SHELL_HOST, useValue: fakeShellHost },
      {
        provide: DeferredLocationCountAdapter,
        useValue: fakeDeferredCounts,
      },
      { provide: DeferredLocationBulkFlowService, useValue: fakeBulkFlow },
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
    fakeDeferredCounts,
    fakeBulkFlow,
  };
}
