/**
 * Decorative OpenStreetMap iframe for auth shells. The map stays invisible until
 * the iframe fires `load`, then fades in so users do not watch tiles paint in.
 */

import { Component, signal } from '@angular/core';

/** Zurich-area embed used only on login/register backgrounds. */
const OSM_AUTH_MAP_EMBED_URL =
  'https://www.openstreetmap.org/export/embed.html?bbox=8.46%2C47.34%2C8.62%2C47.43&layer=mapnik&marker=47.3769%2C8.5417';

@Component({
  selector: 'app-auth-map-layer',
  imports: [],
  templateUrl: './auth-map-layer.component.html',
  styleUrl: './auth-map-layer.component.scss',
})
export class AuthMapLayerComponent {
  protected readonly mapEmbedUrl = OSM_AUTH_MAP_EMBED_URL;

  /** Stable state: map hidden until iframe load completes, then visible after CSS fade-in. */
  protected readonly mapLoaded = signal(false);

  protected onMapIframeLoad(): void {
    this.mapLoaded.set(true);
  }
}
