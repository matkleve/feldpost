import type { WritableSignal } from '@angular/core';
import type { MetadataService } from '../../../core/metadata/metadata.service';
import type { ImageRecord, MetadataEntry } from './media-detail-view.types';

interface MediaDetailMetadataHelperDeps {
  services: {
    metadata: MetadataService;
  };
  signals: {
    media: WritableSignal<ImageRecord | null>;
    mediaId: () => string | null;
    metadata: WritableSignal<MetadataEntry[]>;
    saving: WritableSignal<boolean>;
  };
}

export class MediaDetailMetadataHelper {
  constructor(private readonly deps: MediaDetailMetadataHelperDeps) {}

  async saveMetadata(entry: MetadataEntry, newValue: string): Promise<void> {
    if (newValue === entry.value) return;
    const id = this.deps.signals.mediaId();
    if (!id) return;

    const composeType =
      entry.keyType === 'number' || entry.keyType === 'date' ? entry.keyType : 'text';
    const validation = this.deps.services.metadata.validateMetadataValueForSave(
      composeType,
      newValue,
    );
    if (!validation.valid) return;

    this.deps.signals.metadata.update((list) =>
      list.map((m) =>
        m.metadataKeyId === entry.metadataKeyId
          ? { ...m, value: validation.normalizedValue }
          : m,
      ),
    );

    const saved = await this.deps.services.metadata.saveMetadataValueByLookupId(
      id,
      entry.metadataKeyId,
      validation.normalizedValue,
    );

    if (!saved) {
      this.deps.signals.metadata.update((list) =>
        list.map((m) =>
          m.metadataKeyId === entry.metadataKeyId ? { ...m, value: entry.value } : m,
        ),
      );
    }
  }

  async addMetadata(
    keyName: string,
    keyType: 'text' | 'number' | 'date',
    value: string,
  ): Promise<void> {
    const media = this.deps.signals.media();
    if (!media || !keyName.trim()) return;

    const validation = this.deps.services.metadata.validateMetadataValueForSave(keyType, value);
    if (!validation.valid) return;

    this.deps.signals.saving.set(true);

    const result = await this.deps.services.metadata.addMetadataValueByLookupId(
      media.id,
      media.organization_id,
      keyName.trim(),
      keyType,
      validation.normalizedValue,
    );

    if (result) {
      this.deps.signals.metadata.update((list) => [
        ...list,
        {
          metadataKeyId: result.metadataKeyId,
          key: result.key,
          keyType: result.keyType,
          value: validation.normalizedValue,
        },
      ]);
    }

    this.deps.signals.saving.set(false);
  }

  async removeMetadata(entry: MetadataEntry): Promise<void> {
    const id = this.deps.signals.mediaId();
    if (!id) return;

    const previousList = this.deps.signals.metadata();
    this.deps.signals.metadata.update((list) =>
      list.filter((m) => m.metadataKeyId !== entry.metadataKeyId),
    );

    const removed = await this.deps.services.metadata.removeMetadataValueByLookupId(
      id,
      entry.metadataKeyId,
    );

    if (!removed) {
      this.deps.signals.metadata.set(previousList);
    }
  }
}
