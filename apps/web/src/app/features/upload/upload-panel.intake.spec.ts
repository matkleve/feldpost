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
      locationRequirementMode: 'optional',
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

  it('onSelectFolder submits folder via showDirectoryPicker when available', async () => {
    const { fakeManager } = await setupUploadPanel();
    const inputHandlers = TestBed.inject(UploadPanelInputHandlersService);
    const dirHandle = { name: 'Mariahilferstraße 56' } as FileSystemDirectoryHandle;
    const showDirectoryPicker = vi.fn().mockResolvedValue(dirHandle);
    vi.stubGlobal('showDirectoryPicker', showDirectoryPicker);

    await inputHandlers.onSelectFolder({
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent);

    expect(showDirectoryPicker).toHaveBeenCalledWith({ mode: 'read' });
    expect(fakeManager.submitFolder).toHaveBeenCalledWith(dirHandle, {
      projectId: undefined,
      locationRequirementMode: 'optional',
    });
    vi.unstubAllGlobals();
  });

  it('onSelectFolder does nothing when showDirectoryPicker is unavailable', async () => {
    const { fakeManager } = await setupUploadPanel();
    const inputHandlers = TestBed.inject(UploadPanelInputHandlersService);
    const showDirectoryPicker = (window as Window & { showDirectoryPicker?: unknown })
      .showDirectoryPicker;
    Reflect.deleteProperty(window, 'showDirectoryPicker');

    await inputHandlers.onSelectFolder({
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent);

    expect(fakeManager.submitFolder).not.toHaveBeenCalled();
    if (showDirectoryPicker !== undefined) {
      (window as Window & { showDirectoryPicker?: unknown }).showDirectoryPicker =
        showDirectoryPicker;
    }
  });
});
