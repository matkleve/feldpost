import { WritableSignal } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';

interface ImageDetailDeleteHelperDeps {
  services: {
    supabase: SupabaseService;
  };
  signals: {
    imageId: () => string | null;
    showDeleteConfirm: WritableSignal<boolean>;
    showContextMenu: WritableSignal<boolean>;
  };
  callbacks: {
    onDeleted: () => void;
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

    const { error } = await this.deps.services.supabase.client
      .from('media_items')
      .delete()
      .or(`id.eq.${id},source_image_id.eq.${id}`);
    if (error) return;

    this.deps.signals.showDeleteConfirm.set(false);
    this.deps.callbacks.onDeleted();
  }
}
