import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { WorkspacePaneLayoutMapEffectsService } from '../workspace-pane/workspace-pane-layout-map-effects.service';
import { MapZoomOrchestratorService } from './map-zoom-orchestrator.service';

describe('MapZoomOrchestratorService', () => {
  let service: MapZoomOrchestratorService;
  let onZoomToLocation: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onZoomToLocation = vi.fn();
    navigate = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [
        MapZoomOrchestratorService,
        {
          provide: WorkspacePaneLayoutMapEffectsService,
          useValue: {
            getMapEffects: () => ({ onZoomToLocation }),
          },
        },
        {
          provide: Router,
          useValue: { url: '/map', navigate },
        },
      ],
    });

    service = TestBed.inject(MapZoomOrchestratorService);
  });

  it('delegates to map shell when effects are registered', () => {
    service.requestZoom({
      source: 'test',
      mediaId: 'media-1',
      lat: 48.2,
      lng: 16.37,
      zoomMode: 'house',
    });

    expect(onZoomToLocation).toHaveBeenCalledWith({
      mediaId: 'media-1',
      lat: 48.2,
      lng: 16.37,
      zoomMode: 'house',
      locationId: undefined,
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('rejects null-island coordinates', () => {
    service.requestZoom({
      source: 'test',
      mediaId: 'media-1',
      lat: 0,
      lng: 0,
    });

    expect(onZoomToLocation).not.toHaveBeenCalled();
    expect(service.lastRejectReason).toBe('invalid-coordinates');
  });

  it('navigates to /map from /media even when map delegate exists (map host hidden)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        MapZoomOrchestratorService,
        {
          provide: WorkspacePaneLayoutMapEffectsService,
          useValue: { getMapEffects: () => ({ onZoomToLocation }) },
        },
        {
          provide: Router,
          useValue: { url: '/media', navigate },
        },
      ],
    });
    service = TestBed.inject(MapZoomOrchestratorService);

    service.requestZoom({
      source: 'test',
      mediaId: 'media-2',
      lat: 48.2,
      lng: 16.37,
    });

    expect(navigate).toHaveBeenCalledWith(['/map'], {
      state: { mapFocus: { mediaId: 'media-2', lat: 48.2, lng: 16.37 } },
    });
    // Delegate runs after navigation + render — not synchronously on /media.
    expect(onZoomToLocation).not.toHaveBeenCalled();
  });

  it('navigates to /map when map delegate is missing', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        MapZoomOrchestratorService,
        {
          provide: WorkspacePaneLayoutMapEffectsService,
          useValue: { getMapEffects: () => null },
        },
        {
          provide: Router,
          useValue: { url: '/media', navigate },
        },
      ],
    });
    service = TestBed.inject(MapZoomOrchestratorService);

    service.requestZoom({
      source: 'test',
      mediaId: 'media-2',
      lat: 48.2,
      lng: 16.37,
    });

    expect(navigate).toHaveBeenCalledWith(['/map'], {
      state: { mapFocus: { mediaId: 'media-2', lat: 48.2, lng: 16.37 } },
    });
  });
});
