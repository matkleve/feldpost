import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import { WorkspaceViewService } from '../../core/workspace-view/workspace-view.service';
import { UploadPanelSignalsService } from './upload-panel-signals.service';
import { UploadPanelInputHandlersService } from './upload-panel-input-handlers';
import { DEFAULT_UPLOAD_FILE_INPUT_ACCEPT } from './upload-panel-file-accept';

describe('UploadPanelInputHandlersService', () => {
  it('openFilePicker sets accept before click for filtered extensions', () => {
    const uploadManager = {
      submit: vi.fn(),
      submitFolder: vi.fn(),
    };
    const uploadSignals = {
      locationRequirementMode: signal('required' as const),
    };
    const workspaceView = {
      selectedProjectIds: vi.fn(() => new Set<string>()),
    };

    TestBed.configureTestingModule({
      providers: [
        UploadPanelInputHandlersService,
        { provide: UploadManagerService, useValue: uploadManager },
        { provide: UploadPanelSignalsService, useValue: uploadSignals },
        { provide: WorkspaceViewService, useValue: workspaceView },
      ],
    });

    const service = TestBed.inject(UploadPanelInputHandlersService);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = DEFAULT_UPLOAD_FILE_INPUT_ACCEPT;
    const clickSpy = vi.spyOn(input, 'click');

    service.openFilePicker(input, { extensions: ['jpg'] });

    expect(input.accept).toContain('image/jpeg');
    expect(input.accept).not.toContain('video/mp4');
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('onFileInputChange resets accept to default', () => {
    const uploadManager = {
      submit: vi.fn(),
      submitFolder: vi.fn(),
    };
    const uploadSignals = {
      locationRequirementMode: signal('required' as const),
    };
    const workspaceView = {
      selectedProjectIds: vi.fn(() => new Set<string>()),
    };

    TestBed.configureTestingModule({
      providers: [
        UploadPanelInputHandlersService,
        { provide: UploadManagerService, useValue: uploadManager },
        { provide: UploadPanelSignalsService, useValue: uploadSignals },
        { provide: WorkspaceViewService, useValue: workspaceView },
      ],
    });

    const service = TestBed.inject(UploadPanelInputHandlersService);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = buildFilteredAccept();

    const fileList = {
      0: new File(['x'], 'photo.jpg', { type: 'image/jpeg' }),
      length: 1,
      item: (index: number) => (index === 0 ? fileList[0] : null),
    } as FileList;
    Object.defineProperty(input, 'files', { value: fileList, configurable: true });

    service.onFileInputChange({ target: input } as unknown as Event);

    expect(input.accept).toBe(DEFAULT_UPLOAD_FILE_INPUT_ACCEPT);
    expect(uploadManager.submit).toHaveBeenCalledTimes(1);
  });

  it('onSelectFolder calls showDirectoryPicker on window and submits folder', async () => {
    const uploadManager = {
      submit: vi.fn(),
      submitFolder: vi.fn().mockResolvedValue('batch-1'),
    };
    const uploadSignals = {
      locationRequirementMode: signal('optional' as const),
    };
    const workspaceView = {
      selectedProjectIds: vi.fn(() => new Set<string>()),
    };

    TestBed.configureTestingModule({
      providers: [
        UploadPanelInputHandlersService,
        { provide: UploadManagerService, useValue: uploadManager },
        { provide: UploadPanelSignalsService, useValue: uploadSignals },
        { provide: WorkspaceViewService, useValue: workspaceView },
      ],
    });

    const service = TestBed.inject(UploadPanelInputHandlersService);
    const dirHandle = { name: 'Site Photos' } as FileSystemDirectoryHandle;
    const showDirectoryPicker = vi.fn().mockResolvedValue(dirHandle);
    vi.stubGlobal('showDirectoryPicker', showDirectoryPicker);

    await service.onSelectFolder({
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent);

    expect(showDirectoryPicker).toHaveBeenCalledWith({ mode: 'read' });
    expect(uploadManager.submitFolder).toHaveBeenCalledWith(dirHandle, {
      projectId: undefined,
      locationRequirementMode: 'optional',
    });
    vi.unstubAllGlobals();
  });
});

function buildFilteredAccept(): string {
  return '.jpg,.jpeg,image/jpeg';
}
