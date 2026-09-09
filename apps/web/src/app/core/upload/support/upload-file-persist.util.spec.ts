import { describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { persistUploadFile } from './upload-file-persist.util';
import type { UploadFilePersistDeps } from './upload-file-persist.util';

function buildDeps(mediaInsertError?: unknown): {
  deps: UploadFilePersistDeps;
  storageRemove: ReturnType<typeof vi.fn>;
  storageUpload: ReturnType<typeof vi.fn>;
} {
  const storageRemove = vi.fn().mockResolvedValue({ data: null, error: null });
  const storageUpload = vi.fn().mockResolvedValue({ data: { path: 'uploaded' }, error: null });

  const profilesChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { organization_id: 'org-1' }, error: null }),
  };

  const mediaItemsChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(
      mediaInsertError ? { data: null, error: mediaInsertError } : { data: { id: 'media-1' }, error: null },
    ),
  };

  const supabaseClient = {
    from: vi.fn((table: string) => (table === 'profiles' ? profilesChain : mediaItemsChain)),
    storage: {
      from: vi.fn(() => ({ upload: storageUpload, remove: storageRemove })),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const deps: UploadFilePersistDeps = {
    getUser: () => ({ id: 'user-1' }) as User,
    validateFile: () => ({ valid: true }),
    resolveMimeType: () => 'image/jpeg',
    resolveMediaType: () => 'photo',
    parseExif: async () => ({}),
    withAbort: (builder) => builder,
    supabaseClient,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geocoding: {} as any,
  };

  return { deps, storageRemove, storageUpload };
}

function makeFile(): File {
  return new File([new Uint8Array(4)], 'photo.jpg', { type: 'image/jpeg' });
}

describe('persistUploadFile', () => {
  it('removes the storage object when the media_items insert fails', async () => {
    const dbError = { message: 'insert failed' };
    const { deps, storageRemove, storageUpload } = buildDeps(dbError);

    const result = await persistUploadFile({ file: makeFile() }, deps);

    expect(result.error).toBe(dbError);
    expect(storageUpload).toHaveBeenCalledTimes(1);
    const uploadedPath = storageUpload.mock.calls[0]![0] as string;
    expect(storageRemove).toHaveBeenCalledWith([uploadedPath]);
  });

  it('does not remove the storage object when the insert succeeds', async () => {
    const { deps, storageRemove } = buildDeps();

    const result = await persistUploadFile({ file: makeFile() }, deps);

    expect(result.error).toBeNull();
    expect(storageRemove).not.toHaveBeenCalled();
  });
});
