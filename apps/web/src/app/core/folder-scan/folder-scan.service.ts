/**
 * FolderScanService — recursive directory scanning via File System Access API.
 *
 * Scans a FileSystemDirectoryHandle for supported image files and
 * reports progress as files are discovered.
 *
 * Progress contract:
 * - Emits `scanProgress$` for every accepted file.
 * - `fileCount` is cumulative within one scan run.
 * - `currentFile` is the file name that triggered the latest increment.
 */

import { Injectable } from '@angular/core';
import type { Observable} from 'rxjs';
import { Subject } from 'rxjs';

export interface FileScanProgress {
  fileCount: number;
  currentFile?: string;
}

export interface ScannedFileEntry {
  file: File;
  // Workspace-relative path within the selected folder root.
  // Spec context: docs/specs/service/media-upload-service/upload-manager-pipeline.md (Action 3/4).
  // Used to derive per-file folder hints for mixed directory structures.
  relativePath: string;
  // Folder segments from root to the file's parent directory.
  // Spec context: docs/specs/service/location-path-parser/location-path-parser.md (hierarchical parsing).
  directorySegments: readonly string[];
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
  async scanDirectory(dirHandle: FileSystemDirectoryHandle): Promise<ScannedFileEntry[]> {
    const entries: ScannedFileEntry[] = [];
    await this.walkDirectory(dirHandle, entries, []);
    return entries;
  }

  private async walkDirectory(
    dirHandle: FileSystemDirectoryHandle,
    entries: ScannedFileEntry[],
    pathSegments: readonly string[],
  ): Promise<void> {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (
          FolderScanService.SUPPORTED_IMAGE_TYPES.has(file.type) ||
          FolderScanService.SUPPORTED_EXTENSIONS.has(ext)
        ) {
          entries.push({
            file,
            relativePath: [...pathSegments, file.name].join('/'),
            directorySegments: pathSegments,
          });
          this.scanProgressSubject$.next({ fileCount: entries.length, currentFile: file.name });
        }
      } else if (entry.kind === 'directory') {
        await this.walkDirectory(entry as FileSystemDirectoryHandle, entries, [
          ...pathSegments,
          entry.name,
        ]);
      }
    }
  }
}
