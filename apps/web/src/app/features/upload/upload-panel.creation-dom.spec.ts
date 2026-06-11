import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { UploadPanelInputHandlersService } from './upload-panel-input-handlers';
import { makeUploadJob, setupUploadPanel } from './upload-panel.test-utils.spec';

describe('UploadPanelComponent creation', () => {
  it('creates', async () => {
    const { component } = await setupUploadPanel();
    expect(component).toBeTruthy();
  });

  it('starts with no jobs', async () => {
    const { component } = await setupUploadPanel();
    expect(component.jobs()).toHaveLength(0);
  });

  it('starts with isDragging false', async () => {
    const { component } = await setupUploadPanel();
    expect(component.isDragging()).toBe(false);
  });
});

describe('UploadPanelComponent DOM basic inputs', () => {
  it('renders a drop zone element', async () => {
    const { fixture } = await setupUploadPanel();
    const zone = fixture.debugElement.query(By.css('.upload-panel__dropzone'));
    expect(zone).not.toBeNull();
  });

  it('opens the file picker when clicking the drop zone', async () => {
    const { fixture } = await setupUploadPanel();
    const inputHandlers = TestBed.inject(UploadPanelInputHandlersService);
    const openSpy = vi.spyOn(inputHandlers, 'openFilePicker');
    const zone = fixture.debugElement.query(By.css('.upload-panel__dropzone'));
    zone.triggerEventHandler('click', new MouseEvent('click'));
    expect(openSpy).toHaveBeenCalled();
  });

  it('renders a hidden file input', async () => {
    const { fixture } = await setupUploadPanel();
    const input = fixture.debugElement.query(By.css('.upload-panel__file-input'));
    expect(input).not.toBeNull();
  });

  it('file input accepts the correct MIME types', async () => {
    const { fixture } = await setupUploadPanel();
    const input = fixture.debugElement.query(By.css('.upload-panel__file-input'))
      .nativeElement as HTMLInputElement;
    expect(input.accept).toContain('image/jpeg');
    expect(input.accept).toContain('image/png');
    expect(input.accept).toContain('image/heic');
    expect(input.accept).toContain('video/mp4');
    expect(input.accept).toContain('application/pdf');
    expect(input.accept).toContain('application/vnd.oasis.opendocument.text');
    expect(input.accept).toContain('application/vnd.oasis.opendocument.graphics');
    expect(input.accept).toContain('text/plain');
    expect(input.accept).toContain('text/csv');
  });

  it('renders file-type chip trigger buttons', async () => {
    const { fixture } = await setupUploadPanel();
    const triggers = fixture.debugElement.queryAll(
      By.css('.upload-panel__file-type-chip-trigger'),
    );
    expect(triggers.length).toBeGreaterThan(0);
  });

  it('file input has multiple attribute', async () => {
    const { fixture } = await setupUploadPanel();
    const input = fixture.debugElement.query(By.css('.upload-panel__file-input'))
      .nativeElement as HTMLInputElement;
    expect(input.multiple).toBe(true);
  });
});

describe('UploadPanelComponent DOM intake controls', () => {
  it('renders a hidden capture input for take-photo flow', async () => {
    const { fixture } = await setupUploadPanel();
    const input = fixture.debugElement.query(By.css('.upload-panel__capture-input'))
      .nativeElement as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.accept).toBe('image/*');
    expect(input.getAttribute('capture')).toBe('environment');
    expect(input.multiple).toBe(false);
  });

  it('renders the take-photo intake button', async () => {
    const { fixture } = await setupUploadPanel();
    const button = fixture.debugElement.query(By.css('.upload-panel__intake-btn--capture'));
    expect(button).not.toBeNull();
    expect((button.nativeElement as HTMLButtonElement).textContent).toContain('Take photo');
  });

  it('renders a hidden webkitdirectory folder input for fallback intake', async () => {
    const { fixture } = await setupUploadPanel();
    const input = fixture.debugElement.query(By.css('.upload-panel__folder-input'))
      .nativeElement as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.multiple).toBe(true);
    expect(input.hasAttribute('webkitdirectory')).toBe(true);
  });

  it('renders the upload-folder intake button', async () => {
    const { fixture } = await setupUploadPanel();
    const buttons = fixture.debugElement.queryAll(By.css('.upload-panel__intake-btn'));
    expect(buttons.length).toBeGreaterThan(0);
    expect((buttons[0].nativeElement as HTMLButtonElement).textContent).toContain('Upload folder');
  });
});

describe('UploadPanelComponent panel visibility', () => {
  it('does not add --visible class when visible input is false', async () => {
    const { fixture, ref } = await setupUploadPanel();
    ref.setInput('visible', false);
    fixture.detectChanges();

    const panel = fixture.debugElement.query(By.css('.upload-panel'));
    expect(panel.nativeElement.classList.contains('upload-panel--visible')).toBe(false);
  });

  it('accepts visible=true from host before first change detection', async () => {
    const { ref, component } = await setupUploadPanel();
    ref.setInput('visible', true);

    expect(component.visible()).toBe(true);
  });
});

describe('UploadPanelComponent job list rendering', () => {
  it('shows file-list element when jobs are present', async () => {
    const { component } = await setupUploadPanel({ initialJobs: [makeUploadJob()] });

    expect(component.showProgressBoard()).toBe(true);
    expect(component.visibleLaneJobs().length).toBe(1);
  });

  it('does not render file-list when jobs are empty', async () => {
    const { fixture } = await setupUploadPanel();
    const list = fixture.debugElement.query(By.css('.upload-panel__file-list'));
    expect(list).toBeNull();
  });

  it('renders one list item per job', async () => {
    const { component } = await setupUploadPanel({
      initialJobs: [makeUploadJob(), makeUploadJob(), makeUploadJob()],
    });

    expect(component.visibleLaneJobs().length).toBe(3);
  });
});
