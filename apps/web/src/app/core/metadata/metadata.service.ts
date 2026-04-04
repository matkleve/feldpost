import { Injectable, computed, inject, signal } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import type {
  WorkspaceMedia,
  WorkspaceMediaCustomMetadata,
} from '../workspace-view/workspace-view.types';
import {
  buildLookupIdsByMediaItemId,
  buildMetadataMapByLookupId,
  mapMetadataKeysToFieldDefinitions,
} from './metadata.helpers';
import {
  BUILT_IN_METADATA_FIELDS,
  METADATA_TYPE_ICONS,
  resolveBuiltInGroupingLabel,
  resolveBuiltInMetadataValue,
} from './adapters/built-in-metadata-fields.adapter';
import { SupabaseMetadataAdapter } from './adapters/supabase-metadata.adapter';
import type {
  MetadataEntryRecord,
  MetadataFieldDefinition,
  MetadataKeyRecord,
} from './metadata.types';

@Injectable({ providedIn: 'root' })
export class MetadataService {
  private readonly i18nService = inject(I18nService);
  private readonly adapter = inject(SupabaseMetadataAdapter);

  readonly customMetadataFields = signal<MetadataFieldDefinition[]>([]);

  readonly allMetadataFields = computed<MetadataFieldDefinition[]>(() => [
    ...BUILT_IN_METADATA_FIELDS.map((field) => ({
      ...field,
      label: this.i18nService.translateOriginal(field.label, field.label),
    })),
    ...this.customMetadataFields(),
  ]);

  readonly sortableMetadataFields = computed(() =>
    this.allMetadataFields().filter((field) => field.capabilities.sortable),
  );

  readonly groupableMetadataFields = computed(() =>
    this.allMetadataFields().filter((field) => field.capabilities.groupable),
  );

  readonly filterableMetadataFields = computed(() =>
    this.allMetadataFields().filter((field) => field.capabilities.filterable),
  );

  readonly searchableMetadataFields = computed(() =>
    this.allMetadataFields().filter((field) => field.capabilities.searchable),
  );

  getMetadataField(id: string): MetadataFieldDefinition | undefined {
    return this.allMetadataFields().find((field) => field.id === id);
  }

  getSortableValue(media: WorkspaceMedia, fieldId: string): string | number | null {
    const builtInValue = resolveBuiltInMetadataValue(media, fieldId);
    if (builtInValue !== null) return builtInValue;
    return this.getCustomMetadataValue(media, fieldId);
  }

  getGroupingLabel(media: WorkspaceMedia, fieldId: string): string {
    const builtInValue = resolveBuiltInGroupingLabel(media, fieldId, {
      t: (value: string): string => this.i18nService.translateOriginal(value, value),
      formatDate: (value: string, options: Intl.DateTimeFormatOptions): string =>
        this.i18nService.formatDate(value, options),
    });
    if (builtInValue !== null) return builtInValue;

    const value = this.getCustomMetadataValue(media, fieldId);
    const label = this.getMetadataField(fieldId)?.label ?? fieldId;

    if (value == null || value === '') {
      return `${this.i18nService.translateOriginal('No', 'No')} ${label}`;
    }

    return `${label} ${value}`;
  }

  getFilterValue(media: WorkspaceMedia, fieldId: string): string | null {
    const builtInValue = resolveBuiltInMetadataValue(media, fieldId);
    if (builtInValue !== null) {
      return String(builtInValue);
    }

    const customValue = this.getCustomMetadataValue(media, fieldId);
    return customValue != null ? String(customValue) : null;
  }

  setMetadataFieldsFromKeys(keys: MetadataKeyRecord[]): void {
    this.customMetadataFields.set(mapMetadataKeysToFieldDefinitions(keys, METADATA_TYPE_ICONS));
  }

  async refreshMetadataFields(): Promise<void> {
    const keys = await this.adapter.fetchMetadataKeys();
    if (keys.length === 0) return;
    this.setMetadataFieldsFromKeys(keys);
  }

  async loadMetadataValuesByLookupIds(
    lookupIds: string[],
  ): Promise<Map<string, WorkspaceMediaCustomMetadata>> {
    const uniqueLookupIds = Array.from(new Set(lookupIds.filter((id) => !!id)));
    if (uniqueLookupIds.length === 0) return new Map();

    const mediaRows = await this.adapter.fetchMediaLinksForLookupIds(uniqueLookupIds);
    if (mediaRows.length === 0) return new Map();

    const lookupIdsByMediaItemId = buildLookupIdsByMediaItemId(mediaRows, new Set(uniqueLookupIds));

    if (lookupIdsByMediaItemId.size === 0) return new Map();

    const mediaItemIds = Array.from(lookupIdsByMediaItemId.keys());
    const values = await this.adapter.fetchMetadataValuesForMediaItems(mediaItemIds);
    if (values.length === 0) return new Map();

    return buildMetadataMapByLookupId(values, lookupIdsByMediaItemId);
  }

  async loadMetadataEntriesForMediaItem(mediaItemId: string): Promise<MetadataEntryRecord[]> {
    return this.adapter.fetchMetadataEntriesForMediaItem(mediaItemId);
  }

  async listMetadataKeyNamesForOrganization(organizationId: string): Promise<string[]> {
    return this.adapter.listMetadataKeyNames(organizationId);
  }

  async saveMetadataValueByLookupId(
    lookupId: string,
    metadataKeyId: string,
    valueText: string,
  ): Promise<boolean> {
    const mediaItemId = await this.adapter.resolveMediaItemIdByLookupId(lookupId);
    if (!mediaItemId) return false;

    return this.adapter.upsertMetadataValue(mediaItemId, metadataKeyId, valueText);
  }

  async addMetadataValueByLookupId(
    lookupId: string,
    organizationId: string | null,
    keyName: string,
    valueText: string,
  ): Promise<{ metadataKeyId: string; key: string } | null> {
    if (!organizationId) return null;

    const mediaItemId = await this.adapter.resolveMediaItemIdByLookupId(lookupId);
    if (!mediaItemId) return null;

    let metadataKeyId = await this.adapter.findMetadataKeyId(organizationId, keyName);
    if (!metadataKeyId) {
      metadataKeyId = await this.adapter.createMetadataKey(organizationId, keyName);
    }

    if (!metadataKeyId) return null;

    const saved = await this.adapter.upsertMetadataValue(mediaItemId, metadataKeyId, valueText);
    if (!saved) return null;

    return { metadataKeyId, key: keyName };
  }

  async removeMetadataValueByLookupId(lookupId: string, metadataKeyId: string): Promise<boolean> {
    const mediaItemId = await this.adapter.resolveMediaItemIdByLookupId(lookupId);
    if (!mediaItemId) return false;

    return this.adapter.deleteMetadataValue(mediaItemId, metadataKeyId);
  }

  private getCustomMetadataValue(media: WorkspaceMedia, fieldId: string): string | number | null {
    const metadata = media.metadata;
    if (!metadata) return null;

    const rawValue = metadata[fieldId];
    if (rawValue == null || rawValue === '') return null;

    const field = this.getMetadataField(fieldId);
    if (field?.valueType === 'number') {
      const numericValue = parseFloat(rawValue);
      return Number.isNaN(numericValue) ? null : numericValue;
    }

    return rawValue;
  }
}
