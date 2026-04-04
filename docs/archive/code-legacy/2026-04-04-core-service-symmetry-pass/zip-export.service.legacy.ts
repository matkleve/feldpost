import { Injectable, inject } from '@angular/core';
import { EdgeExportOrchestratorAdapter } from './media-download/adapters/edge-export-orchestrator.adapter';
import type { WorkspaceMedia } from './workspace-view.types';

export interface ZipExportContext {
  selectedProjectName?: string | null;
  selectedCount: number;
  now?: Date;
}

@Injectable({ providedIn: 'root' })
/**
 * @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md.
 */
export class ZipExportService {
  private readonly adapter = inject(EdgeExportOrchestratorAdapter);

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  buildDefaultTitle(context: ZipExportContext): string {
    return this.adapter.buildDefaultTitle(context);
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  async exportSelectionAsZip(
    mediaItems: WorkspaceMedia[],
    title: string,
    onProgress?: (value: number) => void,
  ): Promise<void> {
    return this.adapter.exportSelectionAsZip(mediaItems, title, onProgress);
  }
}
