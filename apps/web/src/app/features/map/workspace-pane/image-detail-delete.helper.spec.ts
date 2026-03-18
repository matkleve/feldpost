import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { ImageDetailDeleteHelper } from './image-detail-delete.helper';

function createHelper() {
  const showDeleteConfirm = signal(false);
  const showContextMenu = signal(true);
  const onDeleted = vi.fn();
  const deleteEq = vi.fn(async () => ({ error: null }));
  const helper = new ImageDetailDeleteHelper({
    services: {
      supabase: {
        client: {
          from: vi.fn(() => ({
            delete: vi.fn(() => ({
              eq: deleteEq,
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

  return { helper, signals: { showDeleteConfirm, showContextMenu }, onDeleted, deleteEq };
}

describe('ImageDetailDeleteHelper', () => {
  it('opens delete confirmation and closes the context menu', () => {
    const { helper, signals } = createHelper();

    helper.confirmDelete();

    expect(signals.showDeleteConfirm()).toBe(true);
    expect(signals.showContextMenu()).toBe(false);
  });

  it('deletes the image and calls the close callback', async () => {
    const { helper, signals, onDeleted, deleteEq } = createHelper();
    signals.showDeleteConfirm.set(true);

    await helper.executeDelete();

    expect(deleteEq).toHaveBeenCalledWith('id', 'img-1');
    expect(signals.showDeleteConfirm()).toBe(false);
    expect(onDeleted).toHaveBeenCalled();
  });
});
