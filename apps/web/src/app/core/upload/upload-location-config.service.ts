import { Injectable } from '@angular/core';
import {
  DEFAULT_UPLOAD_LOCATION_CONFIG,
  type UploadLocationConfig,
} from './upload-location-config';

@Injectable({ providedIn: 'root' })
export class UploadLocationConfigService {
  private config: UploadLocationConfig = {
    ...DEFAULT_UPLOAD_LOCATION_CONFIG,
    clusterAssistWeight: { ...DEFAULT_UPLOAD_LOCATION_CONFIG.clusterAssistWeight },
  };

  getConfig(): UploadLocationConfig {
    return this.config;
  }

  setConfig(next: UploadLocationConfig): void {
    this.config = {
      ...next,
      clusterAssistWeight: { ...next.clusterAssistWeight },
    };
  }

  patchConfig(patch: Partial<UploadLocationConfig>): void {
    const clusterPatch = patch.clusterAssistWeight;
    this.config = {
      ...this.config,
      ...patch,
      clusterAssistWeight: clusterPatch
        ? {
            ...this.config.clusterAssistWeight,
            ...clusterPatch,
          }
        : this.config.clusterAssistWeight,
    };
  }

  resetToDefaults(): void {
    this.config = {
      ...DEFAULT_UPLOAD_LOCATION_CONFIG,
      clusterAssistWeight: { ...DEFAULT_UPLOAD_LOCATION_CONFIG.clusterAssistWeight },
    };
  }
}
