import { describe, expect, it, vi } from 'vitest';
import { removeUploadCancelResidue } from './upload-cancel-residue.util';

function buildClient(options: {
  storageError?: { message: string } | null;
  deleteError?: { message: string } | null;
} = {}) {
  const remove = vi.fn().mockResolvedValue({ data: null, error: options.storageError ?? null });
  const or = vi.fn().mockResolvedValue({ data: null, error: options.deleteError ?? null });
  const del = vi.fn().mockReturnValue({ or });
  const client = {
    storage: { from: vi.fn().mockReturnValue({ remove }) },
    from: vi.fn().mockReturnValue({ delete: del }),
  };
  return { client, remove, del, or };
}

describe('removeUploadCancelResidue', () => {
  it('removes both the storage object and the media_items row when both were persisted', async () => {
    const { client, remove, del, or } = buildClient();

    const result = await removeUploadCancelResidue('org/user/uuid.jpg', 'media-1', client);

    expect(client.storage.from).toHaveBeenCalledWith('media');
    expect(remove).toHaveBeenCalledWith(['org/user/uuid.jpg']);
    expect(client.from).toHaveBeenCalledWith('media_items');
    expect(del).toHaveBeenCalled();
    expect(or).toHaveBeenCalledWith('id.eq.media-1,source_image_id.eq.media-1');
    expect(result.errors).toEqual([]);
    expect(result.storageRemoved).toBe(true);
    expect(result.rowRemoved).toBe(true);
  });

  it('removes only the storage object when no row was persisted yet', async () => {
    const { client, remove, del } = buildClient();

    const result = await removeUploadCancelResidue('org/user/uuid.jpg', undefined, client);

    expect(remove).toHaveBeenCalledWith(['org/user/uuid.jpg']);
    expect(del).not.toHaveBeenCalled();
    expect(result.errors).toEqual([]);
  });

  it('removes only the row when no storage object exists (row-only cancel)', async () => {
    const { client, remove, del } = buildClient();

    const result = await removeUploadCancelResidue(undefined, 'media-1', client);

    expect(remove).not.toHaveBeenCalled();
    expect(del).toHaveBeenCalled();
    expect(result.errors).toEqual([]);
  });

  it('does nothing when neither was persisted', async () => {
    const { client, remove, del } = buildClient();

    const result = await removeUploadCancelResidue(undefined, undefined, client);

    expect(remove).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
    expect(result.errors).toEqual([]);
  });

  it('records storage and delete errors instead of discarding them', async () => {
    const { client } = buildClient({
      storageError: { message: 'storage denied' },
      deleteError: { message: 'row denied' },
    });

    const result = await removeUploadCancelResidue('org/user/uuid.jpg', 'media-1', client);

    expect(result.storageRemoved).toBe(false);
    expect(result.rowRemoved).toBe(false);
    expect(result.errors).toEqual([
      'storage remove failed for org/user/uuid.jpg: storage denied',
      'media_items delete failed for media-1: row denied',
    ]);
  });
});
