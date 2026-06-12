import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { WorkspacePaneShellHost } from '../workspace-pane/workspace-pane-shell-host.token';
import { ShareLinkRestoreService } from './share-link-restore.service';
import { ShareSetService } from './share-set.service';
import { WorkspaceSelectionService } from '../workspace-selection/workspace-selection.service';
import { WorkspaceViewService } from '../workspace-view/workspace-view.service';

function routeSnapshot(query: Record<string, string>): ActivatedRouteSnapshot {
  return {
    queryParamMap: {
      get: (key: string) => query[key] ?? null,
    },
  } as ActivatedRouteSnapshot;
}

function shellHostStub(): WorkspacePaneShellHost {
  return {
    openDetailView: vi.fn(),
    closeDetailView: vi.fn(),
    closeWorkspacePane: vi.fn(),
    onWorkspaceWidthChange: vi.fn(),
    onWorkspacePaneActiveTabChange: vi.fn(),
    onDetailAddressSearchRequestConsumed: vi.fn(),
    onZoomToLocationRequested: vi.fn(),
    onImageUploadedFromWorkspacePane: vi.fn(),
    enterPlacementModeFromWorkspacePane: vi.fn(),
    onUploadLocationPreviewRequestedFromWorkspacePane: vi.fn(),
    onUploadLocationPreviewClearedFromWorkspacePane: vi.fn(),
    onUploadLocationMapPickRequestedFromWorkspacePane: vi.fn(),
    onWorkspaceItemHoverStartedFromPane: vi.fn(),
    onWorkspaceItemHoverEndedFromPane: vi.fn(),
  };
}

describe('ShareLinkRestoreService', () => {
  const mediaA = '550e8400-e29b-41d4-a716-446655440000';
  const mediaB = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  function setup(): {
    service: ShareLinkRestoreService;
    shareSet: { resolveShareSet: ReturnType<typeof vi.fn> };
    workspaceView: {
      loadImagesByIdsOrdered: ReturnType<typeof vi.fn>;
      clearActiveSelectionAndSettings: ReturnType<typeof vi.fn>;
      setActiveSelectionImages: ReturnType<typeof vi.fn>;
    };
    selection: { selectAllInScope: ReturnType<typeof vi.fn> };
    shell: WorkspacePaneShellHost;
  } {
    const shareSet = { resolveShareSet: vi.fn() };
    const workspaceView = {
      loadImagesByIdsOrdered: vi.fn(),
      clearActiveSelectionAndSettings: vi.fn(),
      setActiveSelectionImages: vi.fn(),
    };
    const selection = { selectAllInScope: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        ShareLinkRestoreService,
        { provide: ShareSetService, useValue: shareSet },
        { provide: WorkspaceViewService, useValue: workspaceView },
        { provide: WorkspaceSelectionService, useValue: selection },
      ],
    });

    return {
      service: TestBed.inject(ShareLinkRestoreService),
      shareSet,
      workspaceView,
      selection,
      shell: shellHostStub(),
    };
  }

  it('skips when share param is absent', async () => {
    const { service, shell, shareSet } = setup();
    const result = await service.restoreFromRoute(routeSnapshot({}), shell);
    expect(result.status).toBe('skipped');
    expect(shareSet.resolveShareSet).not.toHaveBeenCalled();
  });

  it('hydrates scope and opens detail when media is in set', async () => {
    const { service, shareSet, workspaceView, selection, shell } = setup();
    shareSet.resolveShareSet.mockResolvedValue([
      { mediaId: mediaA, shareSetId: 'set-1', itemOrder: 0 },
      { mediaId: mediaB, shareSetId: 'set-1', itemOrder: 1 },
    ]);
    workspaceView.loadImagesByIdsOrdered.mockResolvedValue([
      { id: mediaA },
      { id: mediaB },
    ]);

    const result = await service.restoreFromRoute(
      routeSnapshot({ share: 'ss_abc', media: mediaB }),
      shell,
    );

    expect(result.status).toBe('success');
    expect(result.detailMediaId).toBe(mediaB);
    expect(result.detailSkipped).toBe(false);
    expect(selection.selectAllInScope).toHaveBeenCalledWith([mediaA, mediaB]);
    expect(shell.openDetailView).toHaveBeenCalledWith(mediaB);
  });

  it('sets detailSkipped when media is not in loaded selection', async () => {
    const { service, shareSet, workspaceView, shell } = setup();
    shareSet.resolveShareSet.mockResolvedValue([
      { mediaId: mediaA, shareSetId: 'set-1', itemOrder: 0 },
    ]);
    workspaceView.loadImagesByIdsOrdered.mockResolvedValue([{ id: mediaA }]);

    const result = await service.restoreFromRoute(
      routeSnapshot({ share: 'ss_abc', media: mediaB }),
      shell,
    );

    expect(result.status).toBe('success');
    expect(result.detailSkipped).toBe(true);
    expect(shell.openDetailView).not.toHaveBeenCalled();
  });

  it('returns invalid when resolve returns no ids', async () => {
    const { service, shareSet, shell } = setup();
    shareSet.resolveShareSet.mockResolvedValue([]);

    const result = await service.restoreFromRoute(routeSnapshot({ share: 'ss_bad' }), shell);

    expect(result.status).toBe('invalid');
    expect(result.shouldStripQueryParams).toBe(true);
  });

  it('does not attempt restore twice in the same session', async () => {
    const { service, shareSet, workspaceView, shell } = setup();
    shareSet.resolveShareSet.mockResolvedValue([
      { mediaId: mediaA, shareSetId: 'set-1', itemOrder: 0 },
    ]);
    workspaceView.loadImagesByIdsOrdered.mockResolvedValue([{ id: mediaA }]);

    await service.restoreFromRoute(routeSnapshot({ share: 'ss_abc' }), shell);
    const second = await service.restoreFromRoute(routeSnapshot({ share: 'ss_def' }), shell);

    expect(second.status).toBe('skipped');
    expect(shareSet.resolveShareSet).toHaveBeenCalledTimes(1);
  });
});
