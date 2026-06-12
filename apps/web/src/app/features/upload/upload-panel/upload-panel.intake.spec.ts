import { TestBed } from '@angular/core/testing';
import { UploadPanelInputHandlersService } from './upload-panel-input-handlers';
import { setupUploadPanel } from './upload-panel.test-utils.spec';

describe('UploadPanelComponent intake', () => {
  it('onCaptureInputChange submits exactly one captured file', async () => {
    const { fakeManager } = await setupUploadPanel();
    const inputHandlers = TestBed.inject(UploadPanelInputHandlersService);
    const file = new File([new Uint8Array(128)], 'captured.jpg', { type: 'image/jpeg' });
    const input = { files: [file], value: 'placeholder' } as unknown as HTMLInputElement;
    const event = { target: input } as unknown as Event;

    inputHandlers.onCaptureInputChange(event);

    expect(fakeManager.submit).toHaveBeenCalledWith([file], {
      projectId: undefined,
      locationRequirementMode: 'required',
    });
    expect(input.value).toBe('');
  });

  it('openCapturePicker stops bubbling and triggers capture input click', async () => {
    await setupUploadPanel();
    const inputHandlers = TestBed.inject(UploadPanelInputHandlersService);
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const click = vi.fn();

    inputHandlers.openCapturePicker(
      { preventDefault, stopPropagation } as unknown as MouseEvent,
      { click } as unknown as HTMLInputElement,
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('onSelectFolder starts showDirectoryPicker when available', async () => {
    const { fakeManager } = await setupUploadPanel();
    const inputHandlers = TestBed.inject(UploadPanelInputHandlersService);
    const dirHandle = { name: 'Mariahilferstraße 56' } as FileSystemDirectoryHandle;
    const showDirectoryPicker = vi.fn().mockResolvedValue(dirHandle);
    vi.stubGlobal('showDirectoryPicker', showDirectoryPicker);

    inputHandlers.onSelectFolder(
      { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as MouseEvent,
      document.createElement('input'),
    );

    await vi.waitFor(() => {
      expect(showDirectoryPicker).toHaveBeenCalledWith({ mode: 'read' });
      expect(fakeManager.submitFolder).toHaveBeenCalledWith(dirHandle, {
        projectId: undefined,
        locationRequirementMode: 'required',
      });
    });
    vi.unstubAllGlobals();
  });

  it('onSelectFolder clicks folder input when showDirectoryPicker is unavailable', async () => {
    await setupUploadPanel();
    const inputHandlers = TestBed.inject(UploadPanelInputHandlersService);
    vi.stubGlobal('showDirectoryPicker', undefined);
    if (!('webkitdirectory' in HTMLInputElement.prototype)) {
      Object.defineProperty(HTMLInputElement.prototype, 'webkitdirectory', {
        configurable: true,
        value: true,
      });
    }

    const folderInput = document.createElement('input');
    const clickSpy = vi.spyOn(folderInput, 'click');

    inputHandlers.onSelectFolder(
      { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as MouseEvent,
      folderInput,
    );

    expect(clickSpy).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
