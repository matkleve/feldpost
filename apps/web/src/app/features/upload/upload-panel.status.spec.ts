import { By } from '@angular/platform-browser';
import { makeUploadJob, setupUploadPanel } from './upload-panel.test-utils.spec';

describe('UploadPanelComponent missing_data prompt', () => {
  it('renders compact missing_data status text for missing_data jobs', async () => {
    const { fixture, fakeManager } = await setupUploadPanel();
    fakeManager._jobsSignal.set([
      makeUploadJob({ phase: 'missing_data', statusLabel: 'Missing location' }),
    ]);
    fixture.detectChanges();

    const status = fixture.debugElement.query(By.css('.upload-panel__file-status'));
    expect(status).not.toBeNull();
    expect(status.nativeElement.textContent).toContain('Missing GPS');
  });

  it('enables left placement action for missing_data jobs', async () => {
    const { fixture, fakeManager } = await setupUploadPanel();
    fakeManager._jobsSignal.set([
      makeUploadJob({ phase: 'missing_data', statusLabel: 'Missing location' }),
    ]);
    fixture.componentInstance.setSelectedLane('issues');
    fixture.detectChanges();

    const placementButtons = fixture.debugElement.queryAll(
      By.css('.upload-panel__row-action--left'),
    );
    expect((placementButtons[0].nativeElement as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables left placement action for non-missing_data rows', async () => {
    const { fixture, fakeManager } = await setupUploadPanel();
    fakeManager._jobsSignal.set([makeUploadJob({ phase: 'uploading', statusLabel: 'Uploading' })]);
    fixture.detectChanges();

    const placementButton = fixture.debugElement.query(By.css('.upload-panel__row-action--left'));
    expect((placementButton.nativeElement as HTMLButtonElement).disabled).toBe(true);
  });

  it('does not render missing_data status text for completed jobs', async () => {
    const { fixture, fakeManager } = await setupUploadPanel();
    fakeManager._jobsSignal.set([makeUploadJob({ phase: 'complete', statusLabel: 'Uploaded' })]);
    fixture.detectChanges();

    const status = fixture.debugElement.query(By.css('.upload-panel__file-status'));
    expect(status.nativeElement.textContent).not.toContain('Missing GPS');
  });
});

describe('UploadPanelComponent error display', () => {
  it('renders error text in compact status line for error-phase jobs', async () => {
    const { fixture, fakeManager } = await setupUploadPanel();
    fakeManager._jobsSignal.set([
      makeUploadJob({ phase: 'error', statusLabel: 'Failed', error: 'File too large' }),
    ]);
    fixture.detectChanges();

    const status = fixture.debugElement.query(By.css('.upload-panel__file-status'));
    expect(status).not.toBeNull();
    expect(status.nativeElement.textContent).toContain('File too large');
  });

  it('does not render retry button in compact row mode', async () => {
    const { fixture, fakeManager } = await setupUploadPanel();
    fakeManager._jobsSignal.set([
      makeUploadJob({ phase: 'error', statusLabel: 'Failed', error: 'Failed' }),
    ]);
    fixture.detectChanges();

    const retry = fixture.debugElement.query(By.css('.upload-panel__retry'));
    expect(retry).toBeNull();

    const dismiss = fixture.debugElement.query(By.css('.upload-panel__row-action--right'));
    expect(dismiss).not.toBeNull();
  });
});

describe('UploadPanelComponent trackByJobId()', () => {
  it('returns the job id', async () => {
    const { component } = await setupUploadPanel();
    const job = makeUploadJob();

    expect(component.trackByJobId(0, job)).toBe(job.id);
  });
});
