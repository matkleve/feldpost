import { WritableSignal } from '@angular/core';
import { MetadataService } from '../../../core/metadata/metadata.service';
import { ImageRecord, MetadataEntry } from './media-detail-view.types';

interface ImageDetailMetadataHelperDeps {
  services: {
    metadata: MetadataService;
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

    const saved = await this.deps.services.metadata.saveMetadataValueByLookupId(
      id,
      entry.metadataKeyId,
      newValue,
    );

    if (!saved) {
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

    const result = await this.deps.services.metadata.addMetadataValueByLookupId(
      img.id,
      img.organization_id,
      keyName.trim(),
      value.trim(),
    );

    if (result) {
      this.deps.signals.metadata.update((list) => [
        ...list,
        { metadataKeyId: result.metadataKeyId, key: result.key, value: value.trim() },
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

    const removed = await this.deps.services.metadata.removeMetadataValueByLookupId(
      id,
      entry.metadataKeyId,
    );

    if (!removed) {
      this.deps.signals.metadata.set(previousList);
    }
  }
}
