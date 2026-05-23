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

  it('returns icon-only when preview_generation_status is failed', async () => {
    const service = configureMediaDownloadService();

    service.registerPreviewPaths('media-pptx-fail', 'org/u/deck.pptx', null, 'failed');

    const delivery = await firstValueFrom(
      service.getState('media-pptx-fail', 10).pipe(take(1)),
    );

    expect(delivery.state).toBe('icon-only');
  });
});
