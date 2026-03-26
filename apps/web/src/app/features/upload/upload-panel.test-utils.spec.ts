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
} from '../../core/upload/upload-manager.service';
import { WorkspaceViewService } from '../../core/workspace-view.service';

export function buildFakeUploadManager() {
  const jobsSignal = signal<ReadonlyArray<UploadJob>>([]);
  const batchesSignal = signal<ReadonlyArray<UploadBatch>>([]);
  const activeBatchSignal = signal<UploadBatch | null>(null);
  const imageUploaded$ = new Subject<ManagerImageUploadedEvent>();
  const missingData$ = new Subject<MissingDataEvent>();
  const jobPhaseChanged$ = new Subject<JobPhaseChangedEvent>();

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
    submit: vi.fn().mockReturnValue([]),
    submitFolder: vi.fn().mockResolvedValue('batch-1'),
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

export async function setupUploadPanel(): Promise<UploadPanelSetupResult> {
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
  const component = fixture.componentInstance;
  const ref = fixture.componentRef;
  fixture.detectChanges();

  return {
    fixture,
    component,
    ref,
    fakeManager,
  };
}
