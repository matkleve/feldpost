import { TestBed } from '@angular/core/testing';
import { firstValueFrom, take } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { MediaDownloadService } from './media-download.service';
import { SignedUrlCacheAdapter } from './adapters/signed-url-cache.adapter';
import { TierResolverAdapter } from './adapters/tier-resolver.adapter';
import { EdgeExportOrchestratorAdapter } from './adapters/edge-export-orchestrator.adapter';

function configureMediaDownloadService(): MediaDownloadService {
  return TestBed.configureTestingModule({
    providers: [
      MediaDownloadService,
      TierResolverAdapter,
      SignedUrlCacheAdapter,
      EdgeExportOrchestratorAdapter,
    ],
  }).inject(MediaDownloadService);
}

describe('MediaDownloadService file preview delivery', () => {
  it('G3: does not call resolvePreview when resolvePreviewTarget is null (v1 Office without thumb)', async () => {
    const service = configureMediaDownloadService();
    const resolvePreviewSpy = vi.spyOn(service, 'resolvePreview');

    service.registerPreviewPaths('media-doc-1', 'org/u/file.docx', null);

    const delivery = await firstValueFrom(service.getState('media-doc-1', 10).pipe(take(1)));

    expect(delivery.state).toBe('icon-only');
    expect(resolvePreviewSpy).not.toHaveBeenCalled();
  });

  it('returns icon-only immediately for non-image without thumbnail_path', async () => {
    const service = configureMediaDownloadService();

    service.registerPreviewPaths('media-xlsx', 'org/u/sheet.xlsx', null);

    const delivery = await firstValueFrom(service.getState('media-xlsx', 10).pipe(take(1)));

    expect(delivery.state).toBe('icon-only');
  });

  it('returns loading when preview_generation_status is pending without thumbnail_path', async () => {
    const service = configureMediaDownloadService();

    service.registerPreviewPaths('media-pptx', 'org/u/deck.pptx', null, 'pending');

    const delivery = await firstValueFrom(service.getState('media-pptx', 10).pipe(take(1)));

    expect(delivery.state).toBe('loading');
  });

  it('returns loaded for non-image when signing completed (ready-low-res)', async () => {
    const service = configureMediaDownloadService();
    service.registerPreviewPaths('media-pptx-ready', 'org/u/deck.pptx', 'org/u/deck_thumb.webp', 'ready');
    service.getItemState('media-pptx-ready', 'small').set('ready-low-res');
    vi.spyOn(service, 'getCachedUrl').mockReturnValue('https://signed.example/thumb.webp');

    const delivery = await firstValueFrom(
      service.getState('media-pptx-ready', 6.5).pipe(take(1)),
    );

    expect(delivery.state).toBe('loaded');
    expect(delivery.resolvedUrl).toBe('https://signed.example/thumb.webp');
  });

  it('returns loading for non-image with thumbnail_path even when slot is below 8rem', async () => {
    const service = configureMediaDownloadService();
    const resolvePreviewSpy = vi.spyOn(service, 'resolvePreview').mockResolvedValue({
      url: 'https://signed.example/thumb.webp',
      resolvedTier: 'small',
      source: 'signed',
      state: 'ready-low-res',
    });

    service.registerPreviewPaths(
      'media-pptx-thumb',
      'org/u/deck.pptx',
      'org/u/deck_thumb.webp',
      'ready',
    );

    const delivery = await firstValueFrom(
      service.getState('media-pptx-thumb', 6.5).pipe(take(1)),
    );

    expect(delivery.state).toBe('loading');
    expect(resolvePreviewSpy).toHaveBeenCalled();
  });

  it('JPEG with thumbnail_path signs thumbnail not storage_path', async () => {
    const service = configureMediaDownloadService();
    const resolvePreviewSpy = vi.spyOn(service, 'resolvePreview').mockResolvedValue({
      url: 'https://signed.example/photo_thumb.jpg',
      resolvedTier: 'small',
      source: 'signed',
      state: 'ready-low-res',
    });

    service.registerPreviewPaths(
      'media-jpeg-thumb',
      'org/u/photo.jpg',
      'org/u/photo_thumb.jpg',
      'ready',
    );

    await firstValueFrom(service.getState('media-jpeg-thumb', 10).pipe(take(1)));

    expect(resolvePreviewSpy).toHaveBeenCalled();
    const request = resolvePreviewSpy.mock.calls[0]?.[0];
    expect(request?.thumbnailPath).toBe('org/u/photo_thumb.jpg');
    expect(request?.storagePath).toBe('org/u/photo.jpg');
  });

  it('returns loaded when store is no-media but a cached preview URL exists', async () => {
    const service = configureMediaDownloadService();

    service.registerPreviewPaths('media-stale', 'org/u/photo.jpg', 'org/u/photo_thumb.jpg');
    service.getItemState('media-stale', 'small').set('no-media');
    vi.spyOn(service, 'getCachedUrl').mockReturnValue('https://signed.example/photo_thumb.jpg');

    const delivery = await firstValueFrom(
      service.getState('media-stale', 10).pipe(take(1)),
    );

    expect(delivery.state).toBe('loaded');
    expect(delivery.resolvedUrl).toBe('https://signed.example/photo_thumb.jpg');
  });

  it('returns icon-only when preview_generation_status is failed', async () => {
    const service = configureMediaDownloadService();

    service.registerPreviewPaths('media-pptx-fail', 'org/u/deck.pptx', null, 'failed');

    const delivery = await firstValueFrom(
      service.getState('media-pptx-fail', 10).pipe(take(1)),
    );

    expect(delivery.state).toBe('icon-only');
  });
});
