/**
 * Decorative OpenStreetMap iframe for auth shells. The map stays invisible until
 * the iframe fires `load`, then fades in so users do not watch tiles paint in.
 */

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/** Zurich-area embed used only on login/register backgrounds. */
const OSM_AUTH_MAP_EMBED_URL =
  'https://www.openstreetmap.org/export/embed.html?bbox=8.46%2C47.34%2C8.62%2C47.43&layer=mapnik&marker=47.3769%2C8.5417';

/** Fallback: if iframe load does not fire within this duration, reveal anyway. */
const MAP_LOAD_TIMEOUT_MS = 4000;

@Component({
  selector: 'app-auth-map-layer',
  imports: [],
  templateUrl: './auth-map-layer.component.html',
  styleUrl: './auth-map-layer.component.scss',
})
export class AuthMapLayerComponent implements OnInit, OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);

  // Safe because OSM_AUTH_MAP_EMBED_URL is a hardcoded constant, not user input.
  protected readonly mapEmbedUrl: SafeResourceUrl =
    this.sanitizer.bypassSecurityTrustResourceUrl(OSM_AUTH_MAP_EMBED_URL);

  /** Stable state: map hidden until iframe load completes, then visible after CSS fade-in. */
  protected readonly mapLoaded = signal(false);

  private loadTimeoutId: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadTimeoutId = setTimeout(() => {
      this.mapLoaded.set(true);
    }, MAP_LOAD_TIMEOUT_MS);
  }

  ngOnDestroy(): void {
    if (this.loadTimeoutId !== null) {
      clearTimeout(this.loadTimeoutId);
    }
  }

  protected onMapIframeLoad(): void {
    if (this.loadTimeoutId !== null) {
      clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }
    this.mapLoaded.set(true);
  }
}
