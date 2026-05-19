import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { ImageDetailDeleteHelper } from './media-detail-delete.helper';

function createHelper() {
  const showDeleteConfirm = signal(false);
  const showContextMenu = signal(true);
  const onDeleted = vi.fn();
  const deleteWithUndo = vi.fn(async () => ({ ok: true, errorMessage: null, snapshot: null }));
  const helper = new ImageDetailDeleteHelper({
    services: {
      mediaDeleteUndo: {
        deleteWithUndo,
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

  return { helper, signals: { showDeleteConfirm, showContextMenu }, onDeleted, deleteWithUndo };
}

describe('ImageDetailDeleteHelper', () => {
  it('opens delete confirmation and closes the context menu', () => {
    const { helper, signals } = createHelper();

    helper.confirmDelete();

    expect(signals.showDeleteConfirm()).toBe(true);
    expect(signals.showContextMenu()).toBe(false);
  });

  it('deletes the image and calls the close callback', async () => {
    const { helper, signals, onDeleted, deleteWithUndo } = createHelper();
    signals.showDeleteConfirm.set(true);

    await helper.executeDelete();

    expect(deleteWithUndo).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaItemIds: ['img-1'],
      }),
    );
    expect(signals.showDeleteConfirm()).toBe(false);
    expect(onDeleted).toHaveBeenCalled();
  });
});
