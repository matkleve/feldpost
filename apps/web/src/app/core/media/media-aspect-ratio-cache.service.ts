import { Injectable } from '@angular/core';

export type MediaAspectRatioSource = 'intrinsic' | 'registry';

interface CachedAspectRatio {
  ratio: number;
  source: MediaAspectRatioSource;
}

/**
 * Session cache of width/height ratio per media id (from display probes or registry hints).
 * Detail embed reads on open; /media grid choreography is unchanged.
 * @see docs/specs/ui/media-detail/media-detail-media-viewer.md
 */
@Injectable({ providedIn: 'root' })
export class MediaAspectRatioCacheService {
  private readonly ratios = new Map<string, CachedAspectRatio>();

  get(mediaId: string): number | null {
    const id = mediaId.trim();
    if (!id) {
      return null;
    }
    return this.ratios.get(id)?.ratio ?? null;
  }

  set(mediaId: string, ratio: number, source: MediaAspectRatioSource = 'intrinsic'): void {
    const id = mediaId.trim();
    if (!id || !Number.isFinite(ratio) || ratio <= 0) {
      return;
    }

    const existing = this.ratios.get(id);
    if (existing?.source === 'intrinsic' && source === 'registry') {
      return;
    }

    this.ratios.set(id, { ratio, source });
  }

  invalidate(mediaId: string): void {
    const id = mediaId.trim();
    if (id) {
      this.ratios.delete(id);
    }
  }

  clear(): void {
    this.ratios.clear();
  }
}
