/**
 * Runtime access to upload location config; all tunable constants centralised here.
 * @see docs/specs/service/media-upload-service/upload-location-config.md
 */
import { Injectable } from '@angular/core';
import {
  DEFAULT_UPLOAD_LOCATION_CONFIG,
  type UploadLocationConfig,
} from './upload-location-config';

@Injectable({ providedIn: 'root' })
export class UploadLocationConfigService {
  private config: UploadLocationConfig = { ...DEFAULT_UPLOAD_LOCATION_CONFIG };

  getConfig(): UploadLocationConfig {
    return this.config;
  }

  setConfig(next: UploadLocationConfig): void {
    this.config = { ...next };
  }

  patchConfig(patch: Partial<UploadLocationConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  resetToDefaults(): void {
    this.config = { ...DEFAULT_UPLOAD_LOCATION_CONFIG };
  }
}
