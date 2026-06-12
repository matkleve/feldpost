/**
 * Lazy-loads AT geo JSON from /assets/geo for token classification.
 * @see docs/specs/service/media-upload-service/upload-address-resolution.local-geo.md
 */

import { Injectable } from '@angular/core';

export interface BundeslandRecord {
  n: string;
  a?: string[];
}

export interface GemeindeRecord {
  n: string;
  b: string;
  a?: string[];
}

export type PlzMap = Record<string, string[]>;

@Injectable({ providedIn: 'root' })
export class LocalGeoDataAdapter {
  private bundeslaenderPromise: Promise<BundeslandRecord[]> | null = null;
  private gemeindenPromise: Promise<GemeindeRecord[]> | null = null;
  private plzPromise: Promise<PlzMap> | null = null;

  async getBundeslaender(): Promise<BundeslandRecord[]> {
    if (!this.bundeslaenderPromise) {
      this.bundeslaenderPromise = this.fetchJson<BundeslandRecord[]>('/assets/geo/at-bundeslaender.json');
    }
    return this.bundeslaenderPromise;
  }

  async getGemeinden(): Promise<GemeindeRecord[]> {
    if (!this.gemeindenPromise) {
      this.gemeindenPromise = this.fetchJson<GemeindeRecord[]>('/assets/geo/at-gemeinden-bev.json');
    }
    return this.gemeindenPromise;
  }

  async getPlzMap(): Promise<PlzMap> {
    if (!this.plzPromise) {
      this.plzPromise = this.fetchJson<PlzMap>('/assets/geo/at-plz.json');
    }
    return this.plzPromise;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load geo asset: ${url}`);
    }
    return (await response.json()) as T;
  }
}
