import { Observable } from 'rxjs';
import type { ProjectListItem } from '../projects/projects.types';
import type { FileScanProgress, ScannedFileEntry } from '../folder-scan/folder-scan.service';
import type { UploadLocationConfig } from './upload-location-config';
import type { UploadBatch, UploadJob, UploadPhase, SubmitOptions } from './upload-manager.types';

export interface UploadManagerSubmitDeps {
  addBatch: (batch: UploadBatch) => void;
  updateBatch: (batchId: string, patch: Partial<UploadBatch>) => void;
  addJobs: (jobs: UploadJob[]) => void;
  createImmediatePreviewUrl: (file: File) => string | undefined;
  hydrateDeferredPreviews: (jobs: ReadonlyArray<UploadJob>) => void;
  drainQueue: () => void;
  scanDirectory: (dirHandle: FileSystemDirectoryHandle) => Promise<ReadonlyArray<ScannedFileEntry>>;
  scanProgress$: Observable<FileScanProgress>;
  extractAddressFromFolderName: (folderName: string) => string | undefined;
  extractAddressFromFolderPathSegments: (
    segments: readonly string[],
    traversalOrder: UploadLocationConfig['folderHierarchyTraversalOrder'],
    requireHighConfidence: boolean,
  ) => string | undefined;
  getLocationConfig: () => UploadLocationConfig;
  loadProjects: () => Promise<ReadonlyArray<ProjectListItem>>;
  createProject: (name: string) => Promise<string | undefined>;
  queuedLabel: string;
}

export function submitUploadManagerFiles(
  files: File[],
  options: SubmitOptions | undefined,
  deps: UploadManagerSubmitDeps,
): string {
  const batchId = crypto.randomUUID();
  const label = options?.batchLabel ?? `${files.length} file${files.length === 1 ? '' : 's'}`;

  deps.addBatch({
    id: batchId,
    label,
    totalFiles: files.length,
    completedFiles: 0,
    skippedFiles: 0,
    failedFiles: 0,
    overallProgress: 0,
    status: 'uploading',
    startedAt: new Date(),
  });

  const scannedEntries: ScannedFileEntry[] = files.map((file) => ({
    file,
    relativePath: file.name,
    directorySegments: [],
  }));

  const newJobs = createNewUploadJobs(
    scannedEntries,
    batchId,
    options?.projectId,
    deps,
    undefined,
    options?.locationRequirementMode,
  );

  deps.addJobs(newJobs);
  deps.hydrateDeferredPreviews(newJobs);
  deps.drainQueue();

  return batchId;
}

export async function submitUploadManagerFolder(
  dirHandle: FileSystemDirectoryHandle,
  options: SubmitOptions | undefined,
  deps: UploadManagerSubmitDeps,
): Promise<string> {
  const batchId = crypto.randomUUID();
  const label = options?.batchLabel ?? dirHandle.name;

  // Root-level fallback hint extracted from the selected folder label.
  // Spec context: docs/element-specs/upload-manager-pipeline.md (Action 3, Action 4).
  // File-level and per-segment hints can override this default later.
  const folderAddressHint = deps.extractAddressFromFolderName(label);

  deps.addBatch({
    id: batchId,
    label,
    totalFiles: 0,
    completedFiles: 0,
    skippedFiles: 0,
    failedFiles: 0,
    overallProgress: 0,
    status: 'scanning',
    startedAt: new Date(),
  });

  const filesPromise = deps.scanDirectory(dirHandle);
  const scanSub = deps.scanProgress$.subscribe((progress) => {
    deps.updateBatch(batchId, { totalFiles: progress.fileCount });
  });

  let scannedEntries: ReadonlyArray<ScannedFileEntry>;
  try {
    scannedEntries = await filesPromise;
  } finally {
    scanSub.unsubscribe();
  }

  deps.updateBatch(batchId, {
    totalFiles: scannedEntries.length,
    label: `${label} - ${scannedEntries.length} file${scannedEntries.length === 1 ? '' : 's'}`,
    status: scannedEntries.length > 0 ? 'uploading' : 'complete',
  });

  if (scannedEntries.length === 0) {
    // No jobs means no side effects such as project auto-create.
    // Spec context: docs/element-specs/upload-manager-pipeline.md (Action 2a scoped to uploads).
    deps.updateBatch(batchId, { finishedAt: new Date() });
    return batchId;
  }

  let projectIdFromFolder: string | undefined;
  if (!options?.projectId) {
    // Project token resolution runs only when there is at least one file to enqueue.
    // Prevents accidental project creation for empty folder selections.
    projectIdFromFolder = await resolveUploadProjectIdFromFolderName(dirHandle.name, deps);
  }
  const resolvedProjectId = options?.projectId ?? projectIdFromFolder;

  const newJobs = createNewUploadJobs(
    scannedEntries,
    batchId,
    resolvedProjectId,
    deps,
    folderAddressHint,
    options?.locationRequirementMode,
  );

  deps.addJobs(newJobs);
  deps.hydrateDeferredPreviews(newJobs);
  deps.drainQueue();

  return batchId;
}

async function resolveUploadProjectIdFromFolderName(
  folderName: string,
  deps: UploadManagerSubmitDeps,
): Promise<string | undefined> {
  // ── Parse "Project: [projectname]" token from folder name ──────────────────
  // Pattern: case-insensitive match for "project : [name]" at start of folder name.
  // Spec (upload-manager-pipeline.md, Action 2a): Extract project context from
  // folder naming convention and auto-assign/auto-create project.
  const projectTokenMatch = folderName.match(/^\s*project\s*:\s*(.+)$/i);
  if (!projectTokenMatch || !projectTokenMatch[1]) {
    return undefined;
  }

  const projectNameHint = projectTokenMatch[1].trim();
  if (!projectNameHint) {
    return undefined;
  }

  try {
    const projects = await deps.loadProjects();
    const matches = projects.filter(
      (project) =>
        project.name.toLowerCase() === projectNameHint.toLowerCase() && project.status === 'active',
    );

    if (matches.length > 0) {
      return matches[0].id;
    }

    const newProjectId = await deps.createProject(projectNameHint);
    return newProjectId;
  } catch {
    return undefined;
  }
}

function createNewUploadJobs(
  scannedEntries: ReadonlyArray<ScannedFileEntry>,
  batchId: string,
  projectId: string | undefined,
  deps: UploadManagerSubmitDeps,
  folderAddressHint?: string,
  locationRequirementMode?: UploadJob['locationRequirementMode'],
): UploadJob[] {
  const locationConfig = deps.getLocationConfig();

  return scannedEntries.map((entry) => {
    // Folder hint precedence for mixed trees:
    // 1) nearest matching directory segment hint
    // 2) root folder hint fallback
    // File-level title extraction remains authoritative in routing.
    // Spec context: docs/element-specs/upload-manager-pipeline.md (Action 3/4).
    const maxSegments = Math.max(0, Math.floor(locationConfig.maxDirectorySegmentsForHint));
    const boundedSegments =
      maxSegments === 0
        ? []
        : entry.directorySegments.slice(-Math.min(entry.directorySegments.length, maxSegments));
    const hierarchyHint = deps.extractAddressFromFolderPathSegments(
      boundedSegments,
      locationConfig.folderHierarchyTraversalOrder,
      locationConfig.folderHintRequireHighConfidence,
    );
    const perFileFolderHint =
      hierarchyHint ?? (locationConfig.folderHintUseRootFallback ? folderAddressHint : undefined);

    return {
      id: crypto.randomUUID(),
      batchId,
      file: entry.file,
      phase: 'queued' as UploadPhase,
      progress: 0,
      statusLabel: deps.queuedLabel,
      thumbnailUrl: deps.createImmediatePreviewUrl(entry.file),
      submittedAt: new Date(),
      mode: 'new',
      projectId,
      relativePath: entry.relativePath,
      titleAddress: perFileFolderHint,
      titleAddressSource: perFileFolderHint ? 'folder' : undefined,
      locationRequirementMode,
    };
  });
}
