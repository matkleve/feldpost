import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { ImageDetailDeleteHelper } from './media-detail-delete.helper';

function createHelper() {
  const destructiveConfirm = signal<{ kind: 'delete_media' } | null>(null);
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
      destructiveConfirm,
      showContextMenu,
    },
    callbacks: {
      onDeleted,
    },
  });

  return { helper, signals: { destructiveConfirm, showContextMenu }, onDeleted, deleteWithUndo };
}

describe('ImageDetailDeleteHelper', () => {
  it('opens delete confirmation and closes the context menu', () => {
    const { helper, signals } = createHelper();

    helper.confirmDelete();

    expect(signals.destructiveConfirm()).toEqual({ kind: 'delete_media' });
    expect(signals.showContextMenu()).toBe(false);
  });

  it('deletes the image and calls the close callback', async () => {
    const { helper, signals, onDeleted, deleteWithUndo } = createHelper();
    signals.destructiveConfirm.set({ kind: 'delete_media' });

    await helper.executeDelete();

    expect(deleteWithUndo).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaItemIds: ['img-1'],
      }),
    );
    expect(signals.destructiveConfirm()).toBeNull();
    expect(onDeleted).toHaveBeenCalled();
  });
});
