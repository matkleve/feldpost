import { Injectable, inject } from '@angular/core';
import JSZip from 'jszip';
import { SupabaseService } from './supabase/supabase.service';
import type { WorkspaceMedia } from './workspace-view.types';
import {
  composeStreetWithNumber,
  extractFilenameFromStoragePath,
  getFileExtension,
  readMetadataFilename,
  sanitizeExportTitle,
  SIGNED_URL_TTL_SECONDS,
  ZIP_INDEX_PAD_LENGTH,
} from './zip-export.helpers';

export interface ZipExportContext {
  selectedProjectName?: string | null;
  selectedCount: number;
  now?: Date;
}

@Injectable({ providedIn: 'root' })
export class ZipExportService {
  private readonly supabase = inject(SupabaseService);

  buildDefaultTitle(context: ZipExportContext): string {
    const date = this.formatDate(context.now ?? new Date());
    if (context.selectedProjectName) {
      return `${sanitizeExportTitle(context.selectedProjectName)}-${date}`;
    }
    return `workspace-selection-${date}`;
  }

  async exportSelectionAsZip(
    mediaItems: WorkspaceMedia[],
    title: string,
    onProgress?: (value: number) => void,
  ): Promise<void> {
    const zip = new JSZip();
    const cleanedTitle = sanitizeExportTitle(title);
    const validMedia = mediaItems.filter((media) => !!media.storagePath);

    for (let i = 0; i < validMedia.length; i++) {
      const media = validMedia[i];
      const storagePath = media.storagePath as string;
      const downloadUrl = await this.createSignedUrl(storagePath);
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file for ${media.id}`);
      }

      const blob = await response.blob();
      const extension = getFileExtension(storagePath, blob.type);
      const safeName = this.formatMediaName(media);
      const filename = `${String(i + 1).padStart(ZIP_INDEX_PAD_LENGTH, '0')}-${safeName}.${extension}`;
      zip.file(filename, blob);
      onProgress?.((i + 1) / validMedia.length);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(content);
    link.href = url;
    link.download = `${cleanedTitle}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private async createSignedUrl(storagePath: string): Promise<string> {
    const buckets: Array<'media' | 'images'> = ['media', 'images'];
    let lastErrorMessage = 'Failed to sign media URL.';

    for (const bucket of buckets) {
      const { data, error } = await this.supabase.client.storage
        .from(bucket)
        .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }

      if (error?.message) {
        lastErrorMessage = error.message;
      }
    }

    throw new Error(lastErrorMessage);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private formatMediaName(media: WorkspaceMedia): string {
    const metadataName = readMetadataFilename(media.fileMetadata, media.metadata);
    if (metadataName) return sanitizeExportTitle(metadataName);

    const fromStoragePath = extractFilenameFromStoragePath(media.storagePath);
    if (fromStoragePath) return sanitizeExportTitle(fromStoragePath);

    if (media.addressLabel) return sanitizeExportTitle(media.addressLabel);

    const streetWithNumber = composeStreetWithNumber(media.street, media.streetNumber);
    const parts = [streetWithNumber, media.city, media.zip, media.country].filter(Boolean);
    if (parts.length > 0) return sanitizeExportTitle(parts.join('-'));

    return `media-${media.id}`;
  }
}
