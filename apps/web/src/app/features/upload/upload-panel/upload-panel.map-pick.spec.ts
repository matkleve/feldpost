import { ACTION_CONTEXT_IDS } from '../../../core/action/action-context-ids';
import { makeUploadJob, setupUploadPanel } from './upload-panel.test-utils.spec';

describe('UploadPanelComponent map-pick row state', () => {
  it('tracks pendingLocationPickMediaId when map pick is requested', async () => {
    const job = makeUploadJob({
      phase: 'complete',
      mediaId: 'media-pick-1',
      storagePath: 'org/media/photo.jpg',
      coords: { lat: 48.1, lng: 11.5 },
    });
    const { component } = await setupUploadPanel({
      initialJobs: [job],
    });

    component.laneHandlers.setSelectedLane('uploaded');
    const mapPickSpy = vi.spyOn(component.locationMapPickRequested, 'emit');

    await component.actionHandlers.handleMenuAction(job, 'change_location_map', {
      contextType: ACTION_CONTEXT_IDS.uploadItem,
      lane: 'uploaded',
      issueKind: null,
    });

    expect(component.pendingLocationPickMediaId()).toBe('media-pick-1');
    expect(mapPickSpy).toHaveBeenCalledWith(
      expect.objectContaining({ mediaId: 'media-pick-1' }),
    );
  });

  it('clears pendingLocationPickMediaId after imageUploaded for that media', async () => {
    const job = makeUploadJob({
      phase: 'complete',
      mediaId: 'media-pick-2',
      coords: { lat: 48.1, lng: 11.5 },
    });
    const { component, fakeManager } = await setupUploadPanel({
      initialJobs: [job],
    });

    component.pendingLocationPickMediaId.set('media-pick-2');
    fakeManager._imageUploaded$.next({
      mediaId: 'media-pick-2',
      coords: { lat: 48.2, lng: 11.6 },
    });

    expect(component.pendingLocationPickMediaId()).toBeNull();
  });

  it('clears pendingLocationPickMediaId when map pick is cancelled', async () => {
    const job = makeUploadJob({
      phase: 'complete',
      mediaId: 'media-pick-cancel',
      coords: { lat: 48.1, lng: 11.5 },
    });
    const { component } = await setupUploadPanel({
      initialJobs: [job],
    });

    component.pendingLocationPickMediaId.set('media-pick-cancel');
    component.clearPendingLocationMapPick('media-pick-cancel');

    expect(component.pendingLocationPickMediaId()).toBeNull();
  });

  it('ignores clearPendingLocationMapPick for a different media id', async () => {
    const { component } = await setupUploadPanel();

    component.pendingLocationPickMediaId.set('media-a');
    component.clearPendingLocationMapPick('media-b');

    expect(component.pendingLocationPickMediaId()).toBe('media-a');
  });
});

describe('UploadPanelComponent embedded bulk selection', () => {
  it('clears selectedUploadJobIds when switching lanes', async () => {
    const uploadedJob = makeUploadJob({ phase: 'complete', mediaId: 'm1', statusLabel: 'Uploaded' });
    const issueJob = makeUploadJob({ phase: 'error', statusLabel: 'Upload failed', error: 'Failed' });
    const { component } = await setupUploadPanel({
      initialJobs: [uploadedJob, issueJob],
    });

    component.laneHandlers.setSelectedLane('uploaded');
    component.selectedUploadJobIds.set(new Set([uploadedJob.id]));
    component.laneHandlers.setSelectedLane('issues');

    expect(component.selectedUploadJobIds().size).toBe(0);
  });
});
