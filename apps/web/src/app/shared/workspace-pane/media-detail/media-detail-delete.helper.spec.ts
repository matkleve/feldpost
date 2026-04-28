import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { ImageDetailDeleteHelper } from './media-detail-delete.helper';

function createHelper() {
  const showDeleteConfirm = signal(false);
  const showContextMenu = signal(true);
  const onDeleted = vi.fn();
  const deleteOr = vi.fn(async () => ({ error: null }));
  const helper = new ImageDetailDeleteHelper({
    services: {
      supabase: {
        client: {
          from: vi.fn(() => ({
            delete: vi.fn(() => ({
              or: deleteOr,
            })),
          })),
        },
      } as any,
    },
    signals: {
      imageId: () => 'img-1',
      showDeleteConfirm,
      showContextMenu,
    },
    callbacks: {
      onDeleted,
    },
  });

  return { helper, signals: { showDeleteConfirm, showContextMenu }, onDeleted, deleteOr };
}

describe('ImageDetailDeleteHelper', () => {
  it('opens delete confirmation and closes the context menu', () => {
    const { helper, signals } = createHelper();

    helper.confirmDelete();

    expect(signals.showDeleteConfirm()).toBe(true);
    expect(signals.showContextMenu()).toBe(false);
  });

  it('deletes the image and calls the close callback', async () => {
    const { helper, signals, onDeleted, deleteOr } = createHelper();
    signals.showDeleteConfirm.set(true);

    await helper.executeDelete();

    expect(deleteOr).toHaveBeenCalledWith('id.eq.img-1,source_image_id.eq.img-1');
    expect(signals.showDeleteConfirm()).toBe(false);
    expect(onDeleted).toHaveBeenCalled();
  });
});
