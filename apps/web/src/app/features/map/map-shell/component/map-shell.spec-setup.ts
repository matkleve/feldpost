/**
 * Shared test infrastructure for MapShellComponent spec suite.
 *
 * Import buildTestBed + stub helpers from this file into each
 * split spec file so that all suites share the same fakes.
 */

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MapShellComponent } from './map-shell.component';
import { MapShellState } from './map-shell.state';
import {
  WORKSPACE_PANE_SHELL_HOST,
  type WorkspacePaneShellHost,
} from '../../../../core/workspace-pane/workspace-pane-shell-host.token';
import type { WorkspacePaneTab } from '../../../../core/workspace-pane/workspace-pane-host.port';
import type {
  ImageUploadedEvent,
  UploadLocationMapPickRequest,
  UploadLocationPreviewEvent,
} from '../../../../core/workspace-pane/workspace-pane-shell-events.types';
import type { ThumbnailCardHoverEvent } from '../../../../core/workspace-pane/workspace-pane-thumbnail-hover.types';
import { UploadService } from '../../../../core/upload/upload.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { GeocodingService } from '../../../../core/geocoding/geocoding.service';
import { UploadShellUiService } from '../../../upload/upload-shell/upload-shell-ui.service';

export function createMapContainerElementStub(): {
  classList: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  removeEventListener: ReturnType<typeof vi.fn>;
  getBoundingClientRect: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
} {
  return {
    classList: { add: vi.fn(), remove: vi.fn() },
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn().mockReturnValue({ left: 0, top: 0 }),
    focus: vi.fn(),
  };
}

export function createMapStub(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    setView: vi.fn(),
    getZoom: vi.fn().mockReturnValue(13),
    latLngToContainerPoint: vi.fn().mockReturnValue({ x: 10, y: 10 }),
    getContainer: vi.fn().mockReturnValue(createMapContainerElementStub()),
    remove: vi.fn(),
    ...overrides,
  };
}

export function createMarkerStub() {
  return {
    getElement: vi.fn().mockReturnValue(null),
    setIcon: vi.fn(),
  };
}

export function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createWorkspacePaneShellHostStub(state: MapShellState): WorkspacePaneShellHost {
  return {
    openDetailView(mediaId: string): void {
      state.setPhotoPanelOpen(true);
      state.setDetailMediaId(mediaId);
    },
    closeDetailView(): void {
      state.setDetailMediaId(null);
    },
    closeWorkspacePane(): void {
      state.setPhotoPanelOpen(false);
      state.setDetailMediaId(null);
    },
    onWorkspaceWidthChange(_newWidth: number): void {},
    onWorkspacePaneActiveTabChange(_tab: WorkspacePaneTab): void {},
    onDetailAddressSearchRequestConsumed(_requestId: number): void {},
    onZoomToLocationRequested(_event: {
      mediaId: string;
      lat: number;
      lng: number;
      zoomMode?: 'house' | 'street';
    }): void {},
    onImageUploadedFromWorkspacePane(_event: ImageUploadedEvent): void {},
    enterPlacementModeFromWorkspacePane(_key: string): void {},
    onUploadLocationPreviewRequestedFromWorkspacePane(_event: UploadLocationPreviewEvent): void {},
    onUploadLocationPreviewClearedFromWorkspacePane(): void {},
    onUploadLocationMapPickRequestedFromWorkspacePane(_event: UploadLocationMapPickRequest): void {},
    onWorkspaceItemHoverStartedFromPane(_event: ThumbnailCardHoverEvent): void {},
    onWorkspaceItemHoverEndedFromPane(_mediaId: string): void {},
  };
}

function createSupabaseQueryMock() {
  const resolved = { data: [], error: null };
  const query = {
    select: vi.fn(),
    not: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    in: vi.fn(),
    then: (
      onFulfilled: (value: typeof resolved) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(resolved).then(onFulfilled, onRejected),
  };

  query.select.mockReturnValue(query);
  query.not.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.limit.mockReturnValue(Promise.resolve(resolved));

  return query;
}

export function buildTestBed() {
  const imageQueryMock = createSupabaseQueryMock();

  return TestBed.configureTestingModule({
    imports: [MapShellComponent],
    providers: [
      MapShellState,
      UploadShellUiService,
      {
        provide: WORKSPACE_PANE_SHELL_HOST,
        useFactory: (state: MapShellState) => createWorkspacePaneShellHostStub(state),
        deps: [MapShellState],
      },
      {
        provide: UploadService,
        useValue: {
          validateFile: vi.fn().mockReturnValue({ valid: true }),
          parseExif: vi.fn().mockResolvedValue({}),
          uploadFile: vi.fn().mockResolvedValue({ error: 'not called in tests' }),
        },
      },
      {
        provide: AuthService,
        useValue: {
          user: signal(null).asReadonly(),
          session: signal(null).asReadonly(),
          loading: signal(false).asReadonly(),
          initialize: vi.fn().mockResolvedValue(undefined),
        },
      },
      {
        provide: SupabaseService,
        useValue: {
          client: {
            auth: {
              getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
              onAuthStateChange: vi
                .fn()
                .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
            },
            from: vi.fn().mockReturnValue(imageQueryMock),
            rpc: vi.fn().mockResolvedValue({ data: 0, error: null }),
            storage: {
              from: vi.fn().mockReturnValue({
                createSignedUrl: vi.fn().mockResolvedValue({
                  data: { signedUrl: '' },
                  error: null,
                }),
              }),
            },
          },
        },
      },
      {
        provide: GeocodingService,
        useValue: {
          reverse: vi.fn().mockResolvedValue(null),
          search: vi.fn().mockResolvedValue([]),
        },
      },
      {
        provide: Router,
        useValue: {
          navigate: vi.fn(),
          getCurrentNavigation: vi.fn().mockReturnValue(null),
        },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParams: {},
            queryParamMap: {
              get: vi.fn().mockReturnValue(null),
            },
          },
        },
      },
    ],
  }).compileComponents();
}
