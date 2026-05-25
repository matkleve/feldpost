import type { ScannedFileEntry } from './folder-scan.service';

export type WebkitFolderScanResult = {
  entries: ScannedFileEntry[];
  /** Root folder label for batch hint when inferable from paths. */
  rootFolderLabel: string | undefined;
};

/**
 * Builds folder-scan entries from a webkitdirectory FileList.
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md
 */
export function scanFilesFromWebkitDirectory(files: readonly File[]): WebkitFolderScanResult {
  const entries: ScannedFileEntry[] = [];
  let rootFolderLabel: string | undefined;

  for (const file of files) {
    const relativePath = readWebkitRelativePath(file);
    const { directorySegments, inferredRoot } = splitWebkitRelativePath(relativePath);
    if (!rootFolderLabel && inferredRoot) {
      rootFolderLabel = inferredRoot;
    }

    entries.push({
      file,
      relativePath: relativePath ?? file.name,
      directorySegments,
    });
  }

  return { entries, rootFolderLabel };
}

function readWebkitRelativePath(file: File): string | undefined {
  const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  if (typeof path !== 'string') {
    return undefined;
  }
  const trimmed = path.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function splitWebkitRelativePath(relativePath: string | undefined): {
  directorySegments: readonly string[];
  inferredRoot: string | undefined;
} {
  if (!relativePath) {
    return { directorySegments: [], inferredRoot: undefined };
  }

  const normalized = relativePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter((segment) => segment.length > 0);
  if (parts.length === 0) {
    return { directorySegments: [], inferredRoot: undefined };
  }

  if (parts.length === 1) {
    return { directorySegments: [], inferredRoot: undefined };
  }

  const directoryParts = parts.slice(0, -1);
  const inferredRoot = parts[0];

  return {
    directorySegments: directoryParts.length <= 1 ? [] : directoryParts,
    inferredRoot,
  };
}
