import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import type { UploadJob } from '../../core/upload/upload-manager.service';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import { ToastService } from '../../core/toast/toast.service';
import { ACTION_CONTEXT_IDS } from '../action-system/action-context-ids';
import { UploadPanelDialogActionsService } from './upload-panel-dialog-actions.service';
import { UploadPanelJobFileActionsService } from './upload-panel-job-file-actions.service';
import {
  UploadPanelMenuActionRouterService,
  type UploadPanelMenuActionRouterOptions,
} from './upload-panel-menu-action-router.service';
import type { UploadItemActionContext } from './upload-panel-item.component';

function makeJob(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File([new Uint8Array([1, 2, 3])], 'photo.jpg', { type: 'image/jpeg' }),
    phase: 'complete',
    progress: 100,
    statusLabel: 'Uploaded',
    mode: 'new',
    submittedAt: new Date('2026-01-01T10:00:00.000Z'),
    imageId: 'img-1',
    storagePath: 'org/u/photo.jpg',
    ...overrides,
  } as UploadJob;
}

function setup() {
  const fakeUploadManager = {
    forceDuplicateUpload: vi.fn(),
    cancelJob: vi.fn(),
  };

  const fakeToast = {
    show: vi.fn(),
  };

  const fakeFileActions = {
    openExistingDuplicateInMedia: vi.fn().mockResolvedValue(undefined),
    openUploadedJobProject: vi.fn().mockResolvedValue(undefined),
    openUploadedJobInMedia: vi.fn().mockResolvedValue(undefined),
    downloadUploadedJob: vi.fn().mockResolvedValue(undefined),
    removeUploadedJobFromProjects: vi.fn().mockResolvedValue(true),
    deleteUploadedMedia: vi.fn().mockResolvedValue(true),
    requestLocationPickOnMap: vi.fn().mockResolvedValue(undefined),
    toggleJobPriority: vi.fn(),
  };

  const fakeDialogActions = {
    openLocationAddressDialog: vi.fn(),
    onAddressAmbiguousCandidateSelect: vi.fn().mockResolvedValue(undefined),
    openProjectAssignmentForJob: vi.fn().mockResolvedValue(undefined),
  };

  TestBed.configureTestingModule({
    providers: [
      UploadPanelMenuActionRouterService,
      { provide: UploadManagerService, useValue: fakeUploadManager },
      { provide: ToastService, useValue: fakeToast },
      { provide: UploadPanelJobFileActionsService, useValue: fakeFileActions },
      { provide: UploadPanelDialogActionsService, useValue: fakeDialogActions },
    ],
  });

  const service = TestBed.inject(UploadPanelMenuActionRouterService);
  const options: UploadPanelMenuActionRouterOptions = {
    placementRequested: vi.fn(),
    dismissFile: vi.fn(),
    retryFile: vi.fn(),
    setLane: vi.fn(),
  };
  service.register(options);

  return { service, fakeFileActions };
}

describe('UploadPanelMenuActionRouterService context guard', () => {
  it('executes action when contextType is upload_item', async () => {
    const { service, fakeFileActions } = setup();
    const job = makeJob();

    const context: UploadItemActionContext = {
      contextType: ACTION_CONTEXT_IDS.uploadItem,
      lane: 'uploaded',
      issueKind: null,
    };

    await service.handleMenuAction(job, 'download', context);

    expect(fakeFileActions.downloadUploadedJob).toHaveBeenCalledTimes(1);
    expect(fakeFileActions.downloadUploadedJob).toHaveBeenCalledWith(job);
  });

  it('blocks action when contextType is not upload_item', async () => {
    const { service, fakeFileActions } = setup();
    const job = makeJob();

    const wrongContext = {
      contextType: ACTION_CONTEXT_IDS.wsFooter,
      lane: 'uploaded',
      issueKind: null,
    } as unknown as UploadItemActionContext;

    await service.handleMenuAction(job, 'download', wrongContext);

    expect(fakeFileActions.downloadUploadedJob).not.toHaveBeenCalled();
  });

  it('keeps backward compatibility when context is omitted', async () => {
    const { service, fakeFileActions } = setup();
    const job = makeJob();

    await service.handleMenuAction(job, 'download');

    expect(fakeFileActions.downloadUploadedJob).toHaveBeenCalledTimes(1);
  });
});
