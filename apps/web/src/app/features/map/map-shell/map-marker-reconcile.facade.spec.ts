import { describe, expect, it, vi } from 'vitest';
import * as L from 'leaflet';
import {
  MapMarkerReconcileFacade,
  type ReconcileDependencies,
  type ReconcileIncomingRow,
} from './map-marker-reconcile.facade';

function row(): ReconcileIncomingRow {
  return {
    cluster_lat: 48.2,
    cluster_lng: 16.37,
    image_count: 1,
    image_id: 'img-1',
    direction: null,
    thumbnail_path: null,
    storage_path: null,
    exif_latitude: null,
    exif_longitude: null,
    sourceCells: [],
  };
}

function createDeps(suppressMarkerFadeIn: boolean): ReconcileDependencies {
  const layer = L.layerGroup();
  const attachMarkerInteractions = vi.fn();

  return {
    photoMarkerLayer: layer,
    uploadedPhotoMarkers: new Map(),
    markersByMediaId: new Map(),
    selectedMarkerKey: () => null,
    setSelectedMarkerKey: vi.fn(),
    findReusableMarkerKey: () => null,
    findSpawnOriginForIncomingRow: () => null,
    buildFallbackLabelFromPath: () => undefined,
    buildPhotoMarkerIcon: () => L.divIcon({ className: 'test-marker' }),
    attachMarkerInteractions,
    bindMarkerClickInteraction: vi.fn(),
    bindMarkerContextInteraction: vi.fn(),
    bindMarkerHoverInteraction: vi.fn(),
    animateMarkerPosition: vi.fn(),
    refreshPhotoMarker: vi.fn(),
    cancelMarkerMoveAnimation: vi.fn(),
    suppressMarkerFadeIn,
  };
}

describe('MapMarkerReconcileFacade createIncomingMarker fadeIn', () => {
  const facade = new MapMarkerReconcileFacade();

  it('uses fadeIn false when suppressMarkerFadeIn is true', () => {
    const deps = createDeps(true);
    const incoming = new Map([['k1', row()]]);

    facade.reconcileIncomingViewportMarkers(incoming, new Set(), deps);

    expect(deps.attachMarkerInteractions).toHaveBeenCalledWith(expect.any(String), expect.anything(), false);
  });

  it('uses fadeIn true for fresh RPC reconcile', () => {
    const deps = createDeps(false);
    const incoming = new Map([['k1', row()]]);

    facade.reconcileIncomingViewportMarkers(incoming, new Set(), deps);

    expect(deps.attachMarkerInteractions).toHaveBeenCalledWith(expect.any(String), expect.anything(), true);
  });
});
