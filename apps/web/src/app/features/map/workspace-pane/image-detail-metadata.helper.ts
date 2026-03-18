import { WritableSignal } from '@angular/core';
import { SupabaseService } from '../../../core/supabase.service';
import { ImageRecord, MetadataEntry } from './image-detail-view.types';

interface ImageDetailMetadataHelperDeps {
  services: {
    supabase: SupabaseService;
  };
  signals: {
    image: WritableSignal<ImageRecord | null>;
    imageId: () => string | null;
    metadata: WritableSignal<MetadataEntry[]>;
    saving: WritableSignal<boolean>;
  };
}

export class ImageDetailMetadataHelper {
  constructor(private readonly deps: ImageDetailMetadataHelperDeps) {}

  async saveMetadata(entry: MetadataEntry, newValue: string): Promise<void> {
    if (newValue === entry.value) return;
    const id = this.deps.signals.imageId();
    if (!id) return;

    this.deps.signals.metadata.update((list) =>
      list.map((m) => (m.metadataKeyId === entry.metadataKeyId ? { ...m, value: newValue } : m)),
    );

    const { error } = await this.deps.services.supabase.client.from('image_metadata').upsert(
      {
        image_id: id,
        metadata_key_id: entry.metadataKeyId,
        value_text: newValue,
      },
      { onConflict: 'image_id,metadata_key_id' },
    );

    if (error) {
      this.deps.signals.metadata.update((list) =>
        list.map((m) =>
          m.metadataKeyId === entry.metadataKeyId ? { ...m, value: entry.value } : m,
        ),
      );
    }
  }

  async addMetadata(keyName: string, value: string): Promise<void> {
    const img = this.deps.signals.image();
    if (!img || !keyName.trim() || !value.trim()) return;

    this.deps.signals.saving.set(true);

    let keyId: string;
    const { data: existing } = await this.deps.services.supabase.client
      .from('metadata_keys')
      .select('id')
      .eq('key_name', keyName.trim())
      .eq('organization_id', img.organization_id!)
      .maybeSingle();

    if (existing) {
      keyId = existing.id;
    } else {
      const { data: created, error: createError } = await this.deps.services.supabase.client
        .from('metadata_keys')
        .insert({ key_name: keyName.trim(), organization_id: img.organization_id! })
        .select('id')
        .single();

      if (createError || !created) {
        this.deps.signals.saving.set(false);
        return;
      }
      keyId = created.id;
    }

    const { error } = await this.deps.services.supabase.client.from('image_metadata').upsert(
      {
        image_id: img.id,
        metadata_key_id: keyId,
        value_text: value.trim(),
      },
      { onConflict: 'image_id,metadata_key_id' },
    );

    if (!error) {
      this.deps.signals.metadata.update((list) => [
        ...list,
        { metadataKeyId: keyId, key: keyName.trim(), value: value.trim() },
      ]);
    }

    this.deps.signals.saving.set(false);
  }

  async removeMetadata(entry: MetadataEntry): Promise<void> {
    const id = this.deps.signals.imageId();
    if (!id) return;

    const previousList = this.deps.signals.metadata();
    this.deps.signals.metadata.update((list) =>
      list.filter((m) => m.metadataKeyId !== entry.metadataKeyId),
    );

    const { error } = await this.deps.services.supabase.client
      .from('image_metadata')
      .delete()
      .eq('image_id', id)
      .eq('metadata_key_id', entry.metadataKeyId);

    if (error) {
      this.deps.signals.metadata.set(previousList);
    }
  }
}
