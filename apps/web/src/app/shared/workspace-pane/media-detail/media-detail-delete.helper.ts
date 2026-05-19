import type { WritableSignal } from '@angular/core';
import type { MediaDeleteUndoService } from '../../../core/media-delete/media-delete-undo.service';

interface ImageDetailDeleteHelperDeps {
  services: {
    mediaDeleteUndo: MediaDeleteUndoService;
  };
  signals: {
    imageId: () => string | null;
    showDeleteConfirm: WritableSignal<boolean>;
    showContextMenu: WritableSignal<boolean>;
  };
  callbacks: {
    onDeleted: () => void;
    onRestored?: () => void;
  };
}

export class ImageDetailDeleteHelper {
  constructor(private readonly deps: ImageDetailDeleteHelperDeps) {}

  confirmDelete(): void {
    this.deps.signals.showDeleteConfirm.set(true);
    this.deps.signals.showContextMenu.set(false);
  }

  cancelDelete(): void {
    this.deps.signals.showDeleteConfirm.set(false);
  }

  async executeDelete(): Promise<void> {
    const id = this.deps.signals.imageId();
    if (!id) return;

    const result = await this.deps.services.mediaDeleteUndo.deleteWithUndo({
      mediaItemIds: [id],
      onAfterDelete: () => {
        this.deps.signals.showDeleteConfirm.set(false);
        this.deps.callbacks.onDeleted();
      },
      onAfterUndo: () => {
        this.deps.callbacks.onRestored?.();
      },
    });

    if (!result.ok) {
      return;
    }
  }
}
