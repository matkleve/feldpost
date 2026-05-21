import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareSetService } from './share-set.service';
import { ShareUrlSyncService } from './share-url-sync.service';

function routeSnapshot(query: Record<string, string>): ActivatedRouteSnapshot {
  return {
    queryParamMap: {
      get: (key: string) => query[key] ?? null,
    },
  } as ActivatedRouteSnapshot;
}

describe('ShareUrlSyncService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(): {
    service: ShareUrlSyncService;
    shareSet: { createOrReuseShareSet: ReturnType<typeof vi.fn> };
    router: { navigate: ReturnType<typeof vi.fn> };
  } {
    const shareSet = { createOrReuseShareSet: vi.fn() };
    const router = { navigate: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      providers: [
        ShareUrlSyncService,
        { provide: ShareSetService, useValue: shareSet },
        { provide: Router, useValue: router },
      ],
    });

    return {
      service: TestBed.inject(ShareUrlSyncService),
      shareSet,
      router,
    };
  }

  async function flushDebounce(): Promise<void> {
    await vi.advanceTimersByTimeAsync(300);
  }

  it('clears share and media when selection is empty', async () => {
    const { service, shareSet, router } = setup();

    service.scheduleSync({
      routeSnapshot: routeSnapshot({ media: '550e8400-e29b-41d4-a716-446655440000' }),
      scopeMediaIds: [],
      detailMediaId: null,
    });

    await flushDebounce();

    expect(shareSet.createOrReuseShareSet).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith([], {
      queryParams: { share: null, media: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
      state: { shareUrlSync: true },
    });
  });

  it('syncs single selection as share plus media', async () => {
    const { service, shareSet, router } = setup();
    const mediaId = '550e8400-e29b-41d4-a716-446655440000';
    shareSet.createOrReuseShareSet.mockResolvedValue({ token: 'ss_single' });

    service.scheduleSync({
      routeSnapshot: routeSnapshot({}),
      scopeMediaIds: [mediaId],
      detailMediaId: null,
    });

    await flushDebounce();

    expect(shareSet.createOrReuseShareSet).toHaveBeenCalledWith([mediaId]);
    expect(router.navigate).toHaveBeenCalledWith([], {
      queryParams: { share: 'ss_single', media: mediaId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
      state: { shareUrlSync: true },
    });
  });

  it('syncs multi selection without detail as share only', async () => {
    const { service, shareSet, router } = setup();
    const ids = [
      '550e8400-e29b-41d4-a716-446655440000',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    ];
    shareSet.createOrReuseShareSet.mockResolvedValue({ token: 'ss_multi' });

    service.scheduleSync({
      routeSnapshot: routeSnapshot({}),
      scopeMediaIds: ids,
      detailMediaId: null,
    });

    await flushDebounce();

    expect(router.navigate).toHaveBeenCalledWith([], {
      queryParams: { share: 'ss_multi', media: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
      state: { shareUrlSync: true },
    });
  });

  it('reuses resolved token for unchanged fingerprint', async () => {
    const { service, shareSet, router } = setup();
    const mediaA = '550e8400-e29b-41d4-a716-446655440000';
    const mediaB = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    shareSet.createOrReuseShareSet.mockResolvedValue({ token: 'ss_reused' });

    service.scheduleSync({
      routeSnapshot: routeSnapshot({}),
      scopeMediaIds: [mediaA, mediaB],
      detailMediaId: null,
    });
    await flushDebounce();

    service.scheduleSync({
      routeSnapshot: routeSnapshot({}),
      scopeMediaIds: [mediaA, mediaB],
      detailMediaId: mediaB,
    });
    await flushDebounce();

    expect(shareSet.createOrReuseShareSet).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenLastCalledWith([], {
      queryParams: { share: 'ss_reused', media: mediaB },
      queryParamsHandling: 'merge',
      replaceUrl: true,
      state: { shareUrlSync: true },
    });
  });

  it('skips sync while route already carries share param', async () => {
    const { service, shareSet, router } = setup();
    const mediaId = '550e8400-e29b-41d4-a716-446655440000';

    service.scheduleSync({
      routeSnapshot: routeSnapshot({ share: 'ss_existing' }),
      scopeMediaIds: [mediaId],
      detailMediaId: mediaId,
    });

    await flushDebounce();

    expect(shareSet.createOrReuseShareSet).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
