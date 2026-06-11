/**
 * Multilingual token → canonical field classification (step 1b).
 * @see docs/specs/service/token-normalizer/token-normalizer.md
 */

import { Injectable, inject } from '@angular/core';
import { LocalGeoDataAdapter } from '../location-path-parser/local-geo-data.adapter';
import { UploadLocationConfigService } from '../upload/location/upload-location-config.service';
import type { UploadDiscriminatingField } from '../upload/upload-manager.types';

export interface TokenNormalizeResult {
  value: string;
  field?: UploadDiscriminatingField;
  confidence: number;
}

@Injectable({ providedIn: 'root' })
export class TokenNormalizerService {
  private readonly geo = inject(LocalGeoDataAdapter);
  private readonly locationConfig = inject(UploadLocationConfigService);

  private statesLoaded: Promise<Awaited<ReturnType<LocalGeoDataAdapter['getBundeslaender']>>> | null =
    null;

  /** Normalize one path/filename token (MVP: exact gazetteer match). */
  async normalizeToken(token: string): Promise<TokenNormalizeResult> {
    const trimmed = token.trim();
    if (!trimmed) {
      return { value: '', confidence: 0 };
    }
    const threshold = this.locationConfig.getConfig().tokenNormalizerFuzzyThreshold;
    const states = await this.loadStates();
    const lower = trimmed.toLowerCase();
    for (const state of states) {
      const names = [state.n, ...(state.a ?? [])];
      for (const name of names) {
        if (name.toLowerCase() === lower) {
          return { value: state.n, field: 'state', confidence: 1 };
        }
      }
    }
    return { value: trimmed, confidence: threshold };
  }

  private loadStates() {
    if (!this.statesLoaded) {
      this.statesLoaded = this.geo.getBundeslaender();
    }
    return this.statesLoaded;
  }
}
