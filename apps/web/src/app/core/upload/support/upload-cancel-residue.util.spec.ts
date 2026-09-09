import { describe, expect, it, vi } from 'vitest';
import { removeUploadCancelResidue } from './upload-cancel-residue.util';

function buildClient() {
  const remove = vi.fn().mockResolvedValue({ data: null, error: null });
  const or = vi.fn().mockResolvedValue({ data: null, error: null });
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

    await removeUploadCancelResidue('org/user/uuid.jpg', 'media-1', client);

    expect(client.storage.from).toHaveBeenCalledWith('media');
    expect(remove).toHaveBeenCalledWith(['org/user/uuid.jpg']);
    expect(client.from).toHaveBeenCalledWith('media_items');
    expect(del).toHaveBeenCalled();
    expect(or).toHaveBeenCalledWith('id.eq.media-1,source_image_id.eq.media-1');
  });

  it('removes only the storage object when no row was persisted yet', async () => {
    const { client, remove, del } = buildClient();

    await removeUploadCancelResidue('org/user/uuid.jpg', undefined, client);

    expect(remove).toHaveBeenCalledWith(['org/user/uuid.jpg']);
    expect(del).not.toHaveBeenCalled();
  });

  it('removes only the row when no storage object exists (row-only cancel)', async () => {
    const { client, remove, del } = buildClient();

    await removeUploadCancelResidue(undefined, 'media-1', client);

    expect(remove).not.toHaveBeenCalled();
    expect(del).toHaveBeenCalled();
  });

  it('does nothing when neither was persisted', async () => {
    const { client, remove, del } = buildClient();

    await removeUploadCancelResidue(undefined, undefined, client);

    expect(remove).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });
});
