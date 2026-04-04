import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MediaPreviewService {
  createImmediatePreviewUrl(file: File): string | undefined {
    // Browsers cannot natively display HEIC/HEIF files, so we defer object URL creation until after conversion.
    if (this.isHeic(file)) {
      return undefined;
    }
    if (this.isImage(file.type)) {
      return URL.createObjectURL(file);
    }
    return undefined;
  }

  async createDeferredPreviewUrl(file: File): Promise<string | undefined> {
    if (this.isPdf(file.type)) {
      return this.renderPdfFirstPage(file);
    }
    return undefined;
  }

  private async renderPdfFirstPage(file: File): Promise<string | undefined> {
    try {
      const pdfjs = await import('pdfjs-dist');

      const data = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data });
      const doc = await loadingTask.promise;
      const page = await doc.getPage(1);

      // 3:4 portrait card to match the upload lane design.
      const targetWidth = 192;
      const targetHeight = 256;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        await doc.destroy();
        return undefined;
      }

      ctx.fillStyle = '#f5f3ef';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      const viewport = page.getViewport({ scale: 1 });
      const fitScale = Math.min(targetWidth / viewport.width, targetHeight / viewport.height);
      const renderViewport = page.getViewport({ scale: fitScale });

      const offsetX = (targetWidth - renderViewport.width) / 2;
      const offsetY = (targetHeight - renderViewport.height) / 2;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      await page.render({ canvasContext: ctx, viewport: renderViewport, canvas }).promise;
      ctx.restore();

      await doc.destroy();

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), 'image/webp', 0.9);
      });

      return blob ? URL.createObjectURL(blob) : undefined;
    } catch {
      return undefined;
    }
  }

  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private isHeic(file: File): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'heic' || ext === 'heif') return true;
    return file.type === 'image/heic' || file.type === 'image/heif';
  }

  private isPdf(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }
}
