import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../core/toast/toast.service';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import { WorkspaceViewService } from '../../core/workspace-view/workspace-view.service';
import { UploadPanelSignalsService } from './upload-panel-signals.service';
import { UploadPanelInputHandlersService } from './upload-panel-input-handlers';
import { DEFAULT_UPLOAD_FILE_INPUT_ACCEPT } from './upload-panel-file-accept';

function setupHandlers() {
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
  const toast = { show: vi.fn() };
  const i18n = { t: (_key: string, fallback: string) => fallback };

  TestBed.configureTestingModule({
    providers: [
      UploadPanelInputHandlersService,
      { provide: UploadManagerService, useValue: uploadManager },
      { provide: UploadPanelSignalsService, useValue: uploadSignals },
      { provide: WorkspaceViewService, useValue: workspaceView },
      { provide: ToastService, useValue: toast },
      { provide: I18nService, useValue: i18n },
    ],
  });

  return {
    service: TestBed.inject(UploadPanelInputHandlersService),
    uploadManager,
    toast,
  };
}

describe('UploadPanelInputHandlersService', () => {
  it('openFilePicker sets accept before click for filtered extensions', () => {
    const { service } = setupHandlers();
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
    const { service, uploadManager } = setupHandlers();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,image/jpeg';

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

  it('onSelectFolder uses showDirectoryPicker when available', async () => {
    const { service, uploadManager } = setupHandlers();
    const dirHandle = { name: 'Site Photos' } as FileSystemDirectoryHandle;
    const showDirectoryPicker = vi.fn().mockResolvedValue(dirHandle);
    vi.stubGlobal('showDirectoryPicker', showDirectoryPicker);

    service.onSelectFolder(
      { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as MouseEvent,
      document.createElement('input'),
    );

    await vi.waitFor(() => {
      expect(showDirectoryPicker).toHaveBeenCalledWith({ mode: 'read' });
      expect(uploadManager.submitFolder).toHaveBeenCalledWith(dirHandle, {
        projectId: undefined,
        locationRequirementMode: 'optional',
      });
    });
    vi.unstubAllGlobals();
  });

  it('onSelectFolder clicks webkitdirectory input when showDirectoryPicker is missing', () => {
    const { service, uploadManager } = setupHandlers();
    vi.stubGlobal('showDirectoryPicker', undefined);
    if (!('webkitdirectory' in HTMLInputElement.prototype)) {
      Object.defineProperty(HTMLInputElement.prototype, 'webkitdirectory', {
        configurable: true,
        value: true,
      });
    }

    const folderInput = document.createElement('input');
    const clickSpy = vi.spyOn(folderInput, 'click');

    service.onSelectFolder(
      { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as MouseEvent,
      folderInput,
    );

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(uploadManager.submitFolder).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('onFolderInputChange submits selected files', () => {
    const { service, uploadManager } = setupHandlers();
    const files = [
      new File([new Uint8Array(64)], 'a.jpg', { type: 'image/jpeg' }),
      new File([new Uint8Array(64)], 'b.jpg', { type: 'image/jpeg' }),
    ];
    const input = { files, value: 'placeholder' } as unknown as HTMLInputElement;

    service.onFolderInputChange({ target: input } as unknown as Event);

    expect(uploadManager.submit).toHaveBeenCalledWith(files, {
      projectId: undefined,
      locationRequirementMode: 'optional',
    });
    expect(input.value).toBe('');
  });
});
