import { Observable } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import {
  submitUploadManagerFolder,
  type UploadManagerSubmitDeps,
} from './upload-manager-submit.util';
import type { UploadJob } from './upload-manager.types';
import type { ScannedFileEntry } from '../folder-scan.service';

function createBaseDeps(overrides: Partial<UploadManagerSubmitDeps> = {}): UploadManagerSubmitDeps {
  const scanProgress$ = new Observable<{ fileCount: number }>(() => {
    return { unsubscribe: () => undefined };
  });

  return {
    addBatch: vi.fn(),
    updateBatch: vi.fn(),
    addJobs: vi.fn(),
    createImmediatePreviewUrl: vi.fn().mockReturnValue(undefined),
    hydrateDeferredPreviews: vi.fn(),
    drainQueue: vi.fn(),
    scanDirectory: vi.fn().mockResolvedValue([]),
    scanProgress$,
    extractAddressFromFolderName: vi.fn().mockReturnValue(undefined),
    extractAddressFromFolderPathSegments: vi.fn().mockReturnValue(undefined),
    loadProjects: vi.fn().mockResolvedValue([]),
    createProject: vi.fn().mockResolvedValue(undefined),
    queuedLabel: 'Queued',
    ...overrides,
  };
}

describe('submitUploadManagerFolder', () => {
  it('does not auto-create project when folder scan finds no files', async () => {
    const deps = createBaseDeps({
      scanDirectory: vi.fn().mockResolvedValue([]),
      loadProjects: vi.fn().mockResolvedValue([]),
      createProject: vi.fn().mockResolvedValue('new-project-id'),
    });

    const dirHandle = { name: 'Project: Baustelle A' } as FileSystemDirectoryHandle;
    await submitUploadManagerFolder(dirHandle, undefined, deps);

    expect(deps.createProject).not.toHaveBeenCalled();
    expect(deps.addJobs).not.toHaveBeenCalled();
  });

  it('applies high-confidence folder address hint to jobs as default title address', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const entries: ScannedFileEntry[] = [
      { file, relativePath: 'Subfolder/photo.jpg', directorySegments: ['Subfolder'] },
    ];
    const deps = createBaseDeps({
      scanDirectory: vi.fn().mockResolvedValue(entries),
      extractAddressFromFolderName: vi.fn().mockReturnValue('Denisgasse 12, Wien'),
    });

    const dirHandle = { name: 'Denisgasse 12, Wien' } as FileSystemDirectoryHandle;
    await submitUploadManagerFolder(dirHandle, undefined, deps);

    const jobs = (deps.addJobs as ReturnType<typeof vi.fn>).mock.calls[0][0] as UploadJob[];
    expect(jobs).toHaveLength(1);
    expect(jobs[0].titleAddress).toBe('Denisgasse 12, Wien');
    expect(jobs[0].titleAddressSource).toBe('folder');
  });
});

describe('submitUploadManagerFolder folder hint policy', () => {
  it('prefers per-file folder path hint over root folder hint in mixed structures', async () => {
    const deps = createMixedStructureDeps();

    const dirHandle = { name: 'Mixed Upload' } as FileSystemDirectoryHandle;
    await submitUploadManagerFolder(dirHandle, undefined, deps);

    const jobs = (deps.addJobs as ReturnType<typeof vi.fn>).mock.calls[0][0] as UploadJob[];
    expect(jobs).toHaveLength(2);
    expect(jobs[0].titleAddress).toBe('Denisgasse 12, Wien');
    expect(jobs[1].titleAddress).toBe('Arsenalstrasse 3, Berlin');
  });

  it('always unsubscribes scan progress subscription when scan throws', async () => {
    let unsubscribed = false;
    const scanProgress$ = new Observable<{ fileCount: number }>(() => {
      return {
        unsubscribe: () => {
          unsubscribed = true;
        },
      };
    });

    const deps = createBaseDeps({
      scanProgress$,
      scanDirectory: vi.fn().mockRejectedValue(new Error('scan failed')),
    });

    const dirHandle = { name: 'Project: Baustelle A' } as FileSystemDirectoryHandle;
    await expect(submitUploadManagerFolder(dirHandle, undefined, deps)).rejects.toThrow(
      'scan failed',
    );
    expect(unsubscribed).toBe(true);
  });
});

function createMixedStructureDeps(): UploadManagerSubmitDeps {
  const viennaFile = new File(['a'], 'v1.jpg', { type: 'image/jpeg' });
  const berlinFile = new File(['b'], 'b1.jpg', { type: 'image/jpeg' });
  const entries: ScannedFileEntry[] = [
    {
      file: viennaFile,
      relativePath: 'Wien/Denisgasse 12/v1.jpg',
      directorySegments: ['Wien', 'Denisgasse 12'],
    },
    {
      file: berlinFile,
      relativePath: 'Berlin/Arsenalstrasse 3/b1.jpg',
      directorySegments: ['Berlin', 'Arsenalstrasse 3'],
    },
  ];

  return createBaseDeps({
    scanDirectory: vi.fn().mockResolvedValue(entries),
    extractAddressFromFolderName: vi.fn().mockReturnValue('Roothint 1, Wien'),
    extractAddressFromFolderPathSegments: vi.fn((segments: readonly string[]) => {
      const joined = segments.join('/');
      if (joined.includes('Denisgasse 12')) return 'Denisgasse 12, Wien';
      if (joined.includes('Arsenalstrasse 3')) return 'Arsenalstrasse 3, Berlin';
      return undefined;
    }),
  });
}
