import { Injectable, inject } from '@angular/core';
import JSZip from 'jszip';
import { SupabaseService } from './supabase.service';
import type { WorkspaceImage } from './workspace-view.types';

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
      return `${this.sanitizeTitle(context.selectedProjectName)}-${date}`;
    }
    return `workspace-selection-${date}`;
  }

  async exportSelectionAsZip(
    images: WorkspaceImage[],
    title: string,
    onProgress?: (value: number) => void,
  ): Promise<void> {
    const zip = new JSZip();
    const cleanedTitle = this.sanitizeTitle(title);
    const validImages = images.filter((img) => !!img.storagePath);

    for (let i = 0; i < validImages.length; i++) {
      const image = validImages[i];
      const storagePath = image.storagePath as string;
      const downloadUrl = await this.createSignedUrl(storagePath);
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file for ${image.id}`);
      }

      const blob = await response.blob();
      const extension = this.getFileExtension(storagePath, blob.type);
      const filename = `${String(i + 1).padStart(3, '0')}-${image.id}.${extension}`;
      zip.file(filename, blob);
      onProgress?.((i + 1) / validImages.length);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(content);
    link.href = url;
    link.download = `${cleanedTitle}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  }

  sanitizeTitle(value: string): string {
    const trimmed = value.trim() || 'workspace-export';
    return trimmed
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100);
  }

  private async createSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await this.supabase.client.storage
      .from('images')
      .createSignedUrl(storagePath, 60 * 10);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message ?? 'Failed to sign image URL.');
    }

    return data.signedUrl;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private getFileExtension(storagePath: string, mimeType: string): string {
    const fromPath = storagePath.split('.').pop()?.toLowerCase();
    if (fromPath && fromPath.length <= 5) {
      return fromPath;
    }

    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/webp') return 'webp';
    if (mimeType === 'image/heic') return 'heic';
    return 'jpg';
  }
}
