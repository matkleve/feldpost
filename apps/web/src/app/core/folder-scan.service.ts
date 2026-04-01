/**
 * FolderScanService — recursive directory scanning via File System Access API.
 *
 * Scans a FileSystemDirectoryHandle for supported image files and
 * reports progress as files are discovered.
 *
 * ⚠️ SPEC GAP: Uses callback pattern instead of progress Observable.
 * Spec (folder-scan.md § Entry points): "Stream: scanProgress$ — emits
 * discovered file counts during scan."
 * Current: onFileFound callback parameter (not typed as Observable).
 * TODO: (1) Create readonly scanProgress$: Observable<FileScanProgress>
 *       (2) Emit events as files discovered during walkDirectory
 *       (3) Update callers to subscribe to Observable instead of callback
 *       (4) Maintain consistency with UploadManagerService event model
 *           (imageUploaded$, jobPhaseChanged$, etc.)
 */

import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface FileScanProgress {
  fileCount: number;
  currentFile?: string;
}

@Injectable({ providedIn: 'root' })
export class FolderScanService {
  private readonly scanProgressSubject$ = new Subject<FileScanProgress>();
  readonly scanProgress$: Observable<FileScanProgress> = this.scanProgressSubject$.asObservable();

  private static readonly SUPPORTED_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/tiff',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'application/vnd.oasis.opendocument.graphics',
    'text/plain',
    'text/csv',
    'application/csv',
  ]);

  private static readonly SUPPORTED_EXTENSIONS = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.heic',
    '.heif',
    '.tiff',
    '.tif',
    '.mp4',
    '.mov',
    '.webm',
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.odt',
    '.ods',
    '.odp',
    '.odg',
    '.txt',
    '.csv',
  ]);

  /**
   * Whether folder upload is available through either picker API:
   * - File System Access API (`showDirectoryPicker`)
   * - File input directory selection (`webkitdirectory`)
   */
  readonly isSupported =
    typeof window !== 'undefined' &&
    ('showDirectoryPicker' in window || 'webkitdirectory' in HTMLInputElement.prototype);

  /**
   * Recursively scan a directory for image files.
   * Emits progress as files are discovered via scanProgress$ Observable.
   */
  async scanDirectory(dirHandle: FileSystemDirectoryHandle): Promise<File[]> {
    const files: File[] = [];
    await this.walkDirectory(dirHandle, files);
    return files;
  }

  private async walkDirectory(dirHandle: FileSystemDirectoryHandle, files: File[]): Promise<void> {
    for await (const entry of (dirHandle as any).values()) {
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (
          FolderScanService.SUPPORTED_IMAGE_TYPES.has(file.type) ||
          FolderScanService.SUPPORTED_EXTENSIONS.has(ext)
        ) {
          files.push(file);
          this.scanProgressSubject$.next({ fileCount: files.length, currentFile: file.name });
        }
      } else if (entry.kind === 'directory') {
        await this.walkDirectory(entry as FileSystemDirectoryHandle, files);
      }
    }
  }
}
