/**
 * MapShellComponent — the main application shell after authentication.
 *
 * Full-screen map with:
 *  - UploadButton: fixed top-right, click-toggles the UploadPanel.
 *  - SearchBar: floating top-center with Nominatim geocoding.
 *  - GPSButton: floating bottom-right, re-centres map on user position.
 *  - PhotoPanel: slides in from right (desktop) / bottom (mobile) on marker click.
 *  - DragDivider: resize handle shown when PhotoPanel is open.
 *
 * Ground rules:
 *  - Leaflet is initialised in afterNextRender so it only runs in the browser.
 *  - `map` is protected (not private) so unit tests can inject a mock instance.
 *  - Signals for all local UI state; no RxJS subjects.
 *  - Nominatim results are fetched with debounce (300 ms) via native fetch().
 */

import {
    Component,
    ElementRef,
    OnDestroy,
    afterNextRender,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { UploadPanelComponent, ImageUploadedEvent } from '../../upload/upload-panel/upload-panel.component';
import { ExifCoords } from '../../../core/upload.service';
import { SupabaseService } from '../../../core/supabase.service';
import { SearchBarComponent } from '../search-bar/search-bar.component';

const PHOTO_MARKER_CLUSTER_GRID_DECIMALS = 4;

@Component({
    selector: 'app-map-shell',
    imports: [UploadPanelComponent, SearchBarComponent],
    templateUrl: './map-shell.component.html',
    styleUrl: './map-shell.component.scss',
})
export class MapShellComponent implements OnDestroy {
    private readonly supabaseService = inject(SupabaseService);

    /** Reference to the Leaflet map container div. */
    private readonly mapContainerRef = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

    /** Reference to the UploadPanelComponent child (for placeFile calls). */
    private readonly uploadPanelChild = viewChild(UploadPanelComponent);

    /**
     * Leaflet map instance. Protected (not private) so unit tests can inject
     * a mock to test behaviour without initialising the real Leaflet map.
     */
    protected map?: L.Map;

    // ── Upload / placement state ─────────────────────────────────────────────

    /** True when user explicitly opened the upload panel via click. */
    readonly uploadPanelPinned = signal(false);

    /** Final visibility state: click-pinned open only. */
    readonly uploadPanelOpen = this.uploadPanelPinned;

    /**
     * When non-null the map is in "placement mode": the next click places an
     * image that had no GPS EXIF data. Holds the upload-panel row key.
     */
    private pendingPlacementKey: string | null = null;

    /** Whether the map is in placement mode (drives the banner + cursor class). */
    readonly placementActive = signal(false);
    readonly searchPlacementActive = signal(false);

    // ── GPS state ────────────────────────────────────────────────────────────

    /**
     * User's GPS position, populated after geolocation resolves.
     * Null when geolocation is denied/unavailable or not yet resolved.
     */
    readonly userPosition = signal<[number, number] | null>(null);

    /** True while waiting for a GPS fix after pressing the button. */
    readonly gpsLocating = signal(false);

    // ── Photo panel state ────────────────────────────────────────────────────

    /** Whether the PhotoPanel is slid open. */
    readonly photoPanelOpen = signal(false);

    // ── Private helpers ───────────────────────────────────────────────────────

    private userLocationMarker: L.Marker | null = null;
    private searchLocationMarker: L.Marker | null = null;
    private readonly uploadedPhotoMarkers = new Map<
        string,
        { marker: L.Marker; count: number; thumbnailUrl?: string }
    >();

    private readonly initialPhotoMarkerLimit = 500;

    constructor() {
        afterNextRender(() => {
            this.initMap();
        });
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    ngOnDestroy(): void {
        this.gpsLocating.set(false);
        this.uploadedPhotoMarkers.clear();
        this.userLocationMarker?.remove();
        this.userLocationMarker = null;
        this.clearSearchLocationMarker();
        this.map?.remove();
    }

    // ── Upload panel ──────────────────────────────────────────────────────────

    toggleUploadPanel(): void {
        this.uploadPanelPinned.update((v) => !v);
    }

    /**
     * Called when an image with GPS coords is uploaded. Adds a Leaflet marker.
     * Clicking the marker pins the side panel open (M-UI4 will populate it).
     */
    onImageUploaded(event: ImageUploadedEvent): void {
        if (!this.map) return;
        this.upsertUploadedPhotoMarker(event);
    }

    /** Enters placement mode for a file with no GPS EXIF data. */
    enterPlacementMode(key: string): void {
        this.pendingPlacementKey = key;
        this.placementActive.set(true);
        this.map?.getContainer().classList.add('map-container--placing');
    }

    /** Cancels placement mode without placing the image. */
    cancelPlacement(): void {
        this.pendingPlacementKey = null;
        this.placementActive.set(false);
        this.searchPlacementActive.set(false);
        this.map?.getContainer().classList.remove('map-container--placing');
    }

    // ── GPS button ────────────────────────────────────────────────────────────

    /**
     * Recenters on the user's position once.
     * If a recent position is already known, reuses it without requesting GPS again.
     */
    goToUserPosition(): void {
        if (typeof navigator === 'undefined' || !navigator.geolocation) return;

        const hasKnownPosition = this.recenterOnKnownUserPosition();
        if (hasKnownPosition) {
            return;
        }

        this.gpsLocating.set(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
                this.userPosition.set(coords);
                this.renderOrUpdateUserLocationMarker(coords);
                const zoom = Math.max(this.map?.getZoom() ?? 0, 15);
                this.map?.setView(coords, zoom);
                this.gpsLocating.set(false);
            },
            () => {
                this.gpsLocating.set(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 },
        );
    }

    onSearchMapCenterRequested(event: { lat: number; lng: number; label: string }): void {
        if (!this.map) return;

        this.map.setView([event.lat, event.lng], 14);
        this.renderOrUpdateSearchLocationMarker([event.lat, event.lng]);
    }

    onSearchClearRequested(): void {
        this.clearSearchLocationMarker();
    }

    onSearchDropPinRequested(): void {
        this.pendingPlacementKey = null;
        this.placementActive.set(false);
        this.searchPlacementActive.set(true);
        this.map?.getContainer().classList.add('map-container--placing');
    }

    // ── Map init ──────────────────────────────────────────────────────────────

    private initMap(): void {
        this.map = L.map(this.mapContainerRef().nativeElement, {
            center: [48.2082, 16.3738], // Vienna, Austria (fallback)
            zoom: 13,
            zoomControl: true,
        });

        // CartoDB Positron — clean, uncluttered light tile (design.md §3.1).
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }).addTo(this.map);

        // Request user GPS position; fall back to Vienna if denied.
        this.initGeolocation();
        void this.loadInitialPhotoMarkers();

        // Map click handler: closes upload panel and, when active, places images
        // that had no GPS EXIF data.
        this.map.on('click', (e: L.LeafletMouseEvent) => this.handleMapClick(e));

    }

    private initGeolocation(): void {
        if (typeof navigator === 'undefined' || !navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
                this.userPosition.set(coords);
                this.renderOrUpdateUserLocationMarker(coords);
                this.map?.setView(coords, 13);
            },
            () => {
                // Geolocation denied or unavailable — Vienna fallback already set.
            },
        );
    }

    private recenterOnKnownUserPosition(): boolean {
        const coords = this.userPosition();
        if (!coords) return false;
        const zoom = Math.max(this.map?.getZoom() ?? 0, 15);
        this.map?.setView(coords, zoom);
        return true;
    }

    private handleMapClick(e: L.LeafletMouseEvent): void {
        this.uploadPanelPinned.set(false);
        if (this.pendingPlacementKey) {
            const coords: ExifCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
            const panel = this.uploadPanelChild();
            if (panel) {
                panel.placeFile(this.pendingPlacementKey, coords);
            }
            this.pendingPlacementKey = null;
            this.placementActive.set(false);
            this.map?.getContainer().classList.remove('map-container--placing');
            return;
        }

        if (!this.searchPlacementActive()) {
            return;
        }

        this.renderOrUpdateSearchLocationMarker([e.latlng.lat, e.latlng.lng]);
        this.searchPlacementActive.set(false);
        this.map?.getContainer().classList.remove('map-container--placing');
    }

    private renderOrUpdateUserLocationMarker(coords: [number, number]): void {
        if (!this.map) return;

        if (!this.userLocationMarker) {
            const icon = L.divIcon({
                className: 'map-user-location-marker',
                iconSize: [18, 18],
                iconAnchor: [9, 9],
            });

            this.userLocationMarker = L.marker(coords, {
                icon,
                interactive: false,
                keyboard: false,
            }).addTo(this.map);
            return;
        }

        this.userLocationMarker.setLatLng(coords);
    }

    private renderOrUpdateSearchLocationMarker(coords: [number, number]): void {
        if (!this.map) return;

        if (!this.searchLocationMarker) {
            const icon = L.divIcon({
                className: 'map-search-location-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
            });

            this.searchLocationMarker = L.marker(coords, {
                icon,
                interactive: false,
                keyboard: false,
            }).addTo(this.map);
            return;
        }

        this.searchLocationMarker.setLatLng(coords);
    }

    private clearSearchLocationMarker(): void {
        this.searchLocationMarker?.remove();
        this.searchLocationMarker = null;
    }

    private upsertUploadedPhotoMarker(event: ImageUploadedEvent): void {
        if (!this.map) return;

        const markerKey = this.toMarkerKey(event.lat, event.lng);
        const existing = this.uploadedPhotoMarkers.get(markerKey);

        if (existing) {
            const nextCount = existing.count + 1;
            const nextThumb = existing.thumbnailUrl ?? event.thumbnailUrl;
            existing.count = nextCount;
            existing.thumbnailUrl = nextThumb;

            existing.marker.setIcon(this.buildPhotoMarkerIcon(nextCount, nextThumb));
            existing.marker.bindPopup(`${nextCount} images uploaded here`);
            return;
        }

        const marker = L.marker([event.lat, event.lng], {
            icon: this.buildPhotoMarkerIcon(1, event.thumbnailUrl),
        })
            .bindPopup(`Image uploaded (id: ${event.id})`)
            .addTo(this.map);

        this.uploadedPhotoMarkers.set(markerKey, {
            marker,
            count: 1,
            thumbnailUrl: event.thumbnailUrl,
        });
    }

    private async loadInitialPhotoMarkers(): Promise<void> {
        if (!this.map) return;

        const { data, error } = await this.supabaseService.client
            .from('images')
            .select('id, latitude, longitude, thumbnail_path, storage_path, created_at')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .order('created_at', { ascending: false })
            .limit(this.initialPhotoMarkerLimit);

        if (error || !data || data.length === 0) return;

        type ImageMarkerRow = {
            id: string;
            latitude: number;
            longitude: number;
            thumbnail_path: string | null;
            storage_path: string;
            created_at: string;
        };

        const grouped = new Map<string, { rows: ImageMarkerRow[]; lat: number; lng: number }>();

        for (const row of data as ImageMarkerRow[]) {
            if (typeof row.latitude !== 'number' || typeof row.longitude !== 'number') continue;
            const key = this.toMarkerKey(row.latitude, row.longitude);
            const existing = grouped.get(key);
            if (existing) {
                existing.rows.push(row);
                continue;
            }

            grouped.set(key, {
                rows: [row],
                lat: row.latitude,
                lng: row.longitude,
            });
        }

        for (const [key, group] of grouped) {
            const count = group.rows.length;
            let thumbnailUrl: string | undefined;

            if (count === 1) {
                const sourcePath = group.rows[0].thumbnail_path ?? group.rows[0].storage_path;
                const signed = await this.supabaseService.client.storage
                    .from('images')
                    .createSignedUrl(sourcePath, 3600);

                if (!signed.error) {
                    thumbnailUrl = signed.data.signedUrl;
                }
            }

            const marker = L.marker([group.lat, group.lng], {
                icon: this.buildPhotoMarkerIcon(count, thumbnailUrl),
            })
                .bindPopup(count === 1 ? `Image uploaded (id: ${group.rows[0].id})` : `${count} images uploaded here`)
                .addTo(this.map);

            this.uploadedPhotoMarkers.set(key, {
                marker,
                count,
                thumbnailUrl,
            });
        }
    }

    private buildPhotoMarkerIcon(count: number, thumbnailUrl?: string): L.DivIcon {
        const hasSingleThumbnail = count === 1 && !!thumbnailUrl;
        const html = hasSingleThumbnail
            ? `<div class="map-photo-marker map-photo-marker--single"><div class="map-photo-marker__body"><img src="${this.escapeHtmlAttribute(thumbnailUrl)}" alt="Uploaded photo marker" /></div><span class="map-photo-marker__tail" aria-hidden="true"></span></div>`
            : `<div class="map-photo-marker map-photo-marker--count"><div class="map-photo-marker__body"><span>${count}</span></div><span class="map-photo-marker__tail" aria-hidden="true"></span></div>`;

        return L.divIcon({
            className: 'map-photo-marker-wrapper',
            html,
            iconSize: [56, 66],
            iconAnchor: [28, 66],
            popupAnchor: [0, -66],
        });
    }

    private toMarkerKey(lat: number, lng: number): string {
        return `${lat.toFixed(PHOTO_MARKER_CLUSTER_GRID_DECIMALS)}:${lng.toFixed(PHOTO_MARKER_CLUSTER_GRID_DECIMALS)}`;
    }

    private escapeHtmlAttribute(value?: string): string {
        if (!value) return '';
        return value
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

}

