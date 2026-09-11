/**
 * Drag-and-drop folder intake from DataTransferItemList.
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md
 */

import { scanFilesFromWebkitDirectory } from '../../../core/folder-scan/folder-scan-from-file-list.helpers';
import type { ScannedFileEntry } from '../../../core/folder-scan/folder-scan.service';

type FileSystemEntryLike = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath?: string;
  filesystem?: FileSystem;
  file: (success: (file: File) => void, error?: (err: DOMException) => void) => void;
  createReader: () => FileSystemDirectoryReaderLike;
};

type FileSystemDirectoryReaderLike = {
  readEntries: (
    success: (entries: FileSystemEntryLike[]) => void,
    error?: (err: DOMException) => void,
  ) => void;
};

export type UploadDropPayload =
  | { kind: 'files'; files: File[] }
  | { kind: 'folder'; entries: ScannedFileEntry[]; rootFolderLabel: string | undefined };

function readEntryFile(entry: FileSystemEntryLike): Promise<File | null> {
  return new Promise((resolve) => {
    if (!entry.isFile) {
      resolve(null);
      return;
    }
    entry.file(
      (file) => {
        const relativePath = entry.fullPath?.replace(/^\//, '') ?? entry.name;
        Object.defineProperty(file, 'webkitRelativePath', {
          configurable: true,
          value: relativePath,
        });
        resolve(file);
      },
      () => resolve(null),
    );
  });
}

async function readDirectoryEntries(
  reader: FileSystemDirectoryReaderLike,
): Promise<FileSystemEntryLike[]> {
  return new Promise((resolve) => {
    reader.readEntries((entries) => resolve(entries), () => resolve([]));
  });
}

async function walkDirectoryEntry(
  entry: FileSystemEntryLike,
  pathPrefix: string,
): Promise<File[]> {
  if (entry.isFile) {
    const withPath = { ...entry, fullPath: `${pathPrefix}${entry.name}` } as FileSystemEntryLike;
    const file = await readEntryFile(withPath);
    return file ? [file] : [];
  }
  if (!entry.isDirectory) {
    return [];
  }

  const files: File[] = [];
  const reader = entry.createReader();
  let batch = await readDirectoryEntries(reader);
  while (batch.length > 0) {
    for (const child of batch) {
      const childPrefix = `${pathPrefix}${entry.name}/`;
      files.push(...(await walkDirectoryEntry(child, childPrefix)));
    }
    batch = await readDirectoryEntries(reader);
  }
  return files;
}

function getEntryFromItem(item: DataTransferItem): FileSystemEntryLike | null {
  const getAsEntry = (
    item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntryLike | null }
  ).webkitGetAsEntry;
  return typeof getAsEntry === 'function' ? getAsEntry.call(item) : null;
}

/** Parse a drop event into flat files or folder-scan entries. */
export async function parseUploadDropTransfer(
  dataTransfer: DataTransfer | null,
): Promise<UploadDropPayload | null> {
  if (!dataTransfer) {
    return null;
  }

  const items = dataTransfer.items;
  if (items && items.length > 0) {
    const entries = Array.from(items)
      .map((item) => getEntryFromItem(item))
      .filter((entry): entry is FileSystemEntryLike => entry != null);

    if (entries.length > 0) {
      const hasDirectory = entries.some((entry) => entry.isDirectory);
      if (hasDirectory) {
        const collected: File[] = [];
        for (const entry of entries) {
          collected.push(...(await walkDirectoryEntry(entry, '')));
        }
        if (collected.length > 0) {
          const { entries: scanned, rootFolderLabel } = scanFilesFromWebkitDirectory(collected);
          return { kind: 'folder', entries: scanned, rootFolderLabel };
        }
      }
    }
  }

  const files = dataTransfer.files;
  if (files && files.length > 0) {
    const fileList = Array.from(files);
    const { entries, rootFolderLabel } = scanFilesFromWebkitDirectory(fileList);
    if (entries.length > 0 && entries.some((entry) => entry.directorySegments.length > 0)) {
      return { kind: 'folder', entries, rootFolderLabel };
    }
    return { kind: 'files', files: fileList };
  }

  return null;
}
