import { WritableSignal } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { ImageRecord, MetadataEntry } from './media-detail-view.types';

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

  private async resolveMediaItemId(id: string): Promise<string | null> {
    const { data, error } = await this.deps.services.supabase.client
      .from('media_items')
      .select('id')
      .or(`id.eq.${id},source_image_id.eq.${id}`)
      .limit(1)
      .maybeSingle();

    if (error || !data?.id) {
      return null;
    }

    return data.id;
  }

  async saveMetadata(entry: MetadataEntry, newValue: string): Promise<void> {
    if (newValue === entry.value) return;
    const id = this.deps.signals.imageId();
    if (!id) return;

    const mediaItemId = await this.resolveMediaItemId(id);
    if (!mediaItemId) return;

    this.deps.signals.metadata.update((list) =>
      list.map((m) => (m.metadataKeyId === entry.metadataKeyId ? { ...m, value: newValue } : m)),
    );

    const { error } = await this.deps.services.supabase.client.from('media_metadata').upsert(
      {
        media_item_id: mediaItemId,
        metadata_key_id: entry.metadataKeyId,
        value_text: newValue,
      },
      { onConflict: 'media_item_id,metadata_key_id' },
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

    const mediaItemId = await this.resolveMediaItemId(img.id);
    if (!mediaItemId) return;

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

    const { error } = await this.deps.services.supabase.client.from('media_metadata').upsert(
      {
        media_item_id: mediaItemId,
        metadata_key_id: keyId,
        value_text: value.trim(),
      },
      { onConflict: 'media_item_id,metadata_key_id' },
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

    const mediaItemId = await this.resolveMediaItemId(id);
    if (!mediaItemId) return;

    const previousList = this.deps.signals.metadata();
    this.deps.signals.metadata.update((list) =>
      list.filter((m) => m.metadataKeyId !== entry.metadataKeyId),
    );

    const { error } = await this.deps.services.supabase.client
      .from('media_metadata')
      .delete()
      .eq('media_item_id', mediaItemId)
      .eq('metadata_key_id', entry.metadataKeyId);

    if (error) {
      this.deps.signals.metadata.set(previousList);
    }
  }
}
