import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { MediaDetailDeleteHelper } from './media-detail-delete.helper';

describe('MediaDetailDeleteHelper', () => {
  const helper = new MediaDetailDeleteHelper({
    services: {
      mediaDeleteUndo: {
        deleteWithUndo: vi.fn(async () => ({ ok: true })),
      } as any,
    },
    signals: {
      mediaId: () => 'img-1',
      destructiveConfirm: signal(null),
      showContextMenu: signal(false),
    },
    callbacks: {
      onDeleted: vi.fn(),
    },
  });

  it('sets destructive confirm state', () => {
    const destructiveConfirm = signal<any>(null);
    const showContextMenu = signal(true);
    const localHelper = new MediaDetailDeleteHelper({
      services: { mediaDeleteUndo: {} as any },
      signals: {
        mediaId: () => 'img-1',
        destructiveConfirm,
        showContextMenu,
      },
      callbacks: { onDeleted: vi.fn() },
    });

    localHelper.confirmDelete();

    expect(destructiveConfirm()).toEqual({ kind: 'delete_media' });
    expect(showContextMenu()).toBe(false);
  });

  it('executes delete when media id is present', async () => {
    const deleteWithUndo = vi.fn(async () => ({ ok: true }));
    const onDeleted = vi.fn();
    const localHelper = new MediaDetailDeleteHelper({
      services: { mediaDeleteUndo: { deleteWithUndo } as any },
      signals: {
        mediaId: () => 'img-1',
        destructiveConfirm: signal({ kind: 'delete_media' }),
        showContextMenu: signal(false),
      },
      callbacks: { onDeleted },
    });

    await localHelper.executeDelete();

    expect(deleteWithUndo).toHaveBeenCalled();
    expect(onDeleted).toHaveBeenCalled();
  });

  it('exposes confirmDelete on default helper instance', () => {
    expect(helper).toBeDefined();
  });
});
