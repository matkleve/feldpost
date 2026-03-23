import { setupUploadPanel } from './upload-panel.test-utils.spec';

describe('UploadPanelComponent intake', () => {
  it('onCaptureInputChange submits exactly one captured file', async () => {
    const { component, fakeManager } = await setupUploadPanel();
    const file = new File([new Uint8Array(128)], 'captured.jpg', { type: 'image/jpeg' });
    const input = { files: [file], value: 'placeholder' } as unknown as HTMLInputElement;
    const event = { target: input } as unknown as Event;

    component.onCaptureInputChange(event);

    expect(fakeManager.submit).toHaveBeenCalledWith([file], { projectId: undefined });
    expect(input.value).toBe('');
  });

  it('openCapturePicker stops bubbling and triggers capture input click', async () => {
    const { component } = await setupUploadPanel();
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
    const { component, fakeManager } = await setupUploadPanel();
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
    const { component } = await setupUploadPanel();
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
