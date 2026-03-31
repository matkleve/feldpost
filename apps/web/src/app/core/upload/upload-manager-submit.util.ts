import type { ProjectListItem } from '../projects/projects.types';
import type { UploadBatch, UploadJob, UploadPhase, SubmitOptions } from './upload-manager.types';

export interface UploadManagerSubmitDeps {
  addBatch: (batch: UploadBatch) => void;
  updateBatch: (batchId: string, patch: Partial<UploadBatch>) => void;
  addJobs: (jobs: UploadJob[]) => void;
  createImmediatePreviewUrl: (file: File) => string | undefined;
  hydrateDeferredPreviews: (jobs: ReadonlyArray<UploadJob>) => void;
  drainQueue: () => void;
  scanDirectory: (
    dirHandle: FileSystemDirectoryHandle,
    onProgress: (file: File, count: number) => void,
  ) => Promise<File[]>;
  loadProjects: () => Promise<ReadonlyArray<ProjectListItem>>;
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

  const newJobs = createNewUploadJobs(files, batchId, options?.projectId, deps);

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

  let projectIdFromFolder: string | undefined;
  if (!options?.projectId) {
    projectIdFromFolder = await resolveUploadProjectIdFromFolderName(dirHandle.name, deps);
  }
  const resolvedProjectId = options?.projectId ?? projectIdFromFolder;

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

  const files = await deps.scanDirectory(dirHandle, (_file, count) => {
    deps.updateBatch(batchId, { totalFiles: count });
  });

  deps.updateBatch(batchId, {
    totalFiles: files.length,
    label: `${label} - ${files.length} file${files.length === 1 ? '' : 's'}`,
    status: files.length > 0 ? 'uploading' : 'complete',
  });

  if (files.length === 0) {
    deps.updateBatch(batchId, { finishedAt: new Date() });
    return batchId;
  }

  const newJobs = createNewUploadJobs(files, batchId, resolvedProjectId, deps);

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

    // ⚠️ SPEC GAP (Action 2a): Auto-create missing project.
    // Current: Returns undefined if project not found; fails silently.
    // Spec requires: "creates project if missing, otherwise assign to existing project automatically"
    // TODO: Implement project auto-creation when no match found. Example:
    //   if (matches.length === 0) {
    //     return await deps.createProject(projectNameHint);
    //   }
    return matches.length > 0 ? matches[0].id : undefined;
  } catch {
    return undefined;
  }
}

function createNewUploadJobs(
  files: ReadonlyArray<File>,
  batchId: string,
  projectId: string | undefined,
  deps: UploadManagerSubmitDeps,
): UploadJob[] {
  return files.map((file) => ({
    id: crypto.randomUUID(),
    batchId,
    file,
    phase: 'queued' as UploadPhase,
    progress: 0,
    statusLabel: deps.queuedLabel,
    thumbnailUrl: deps.createImmediatePreviewUrl(file),
    submittedAt: new Date(),
    mode: 'new',
    projectId,
  }));
}
