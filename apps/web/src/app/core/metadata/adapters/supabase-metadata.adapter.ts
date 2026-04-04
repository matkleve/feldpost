import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../supabase/supabase.service';
import type {
  MediaLookupRow,
  MediaMetadataValueRow,
  MetadataEntryRecord,
  MetadataKeyRecord,
} from '../metadata.types';

@Injectable({ providedIn: 'root' })
export class SupabaseMetadataAdapter {
  private readonly supabase = inject(SupabaseService);

  async fetchMetadataKeys(): Promise<MetadataKeyRecord[]> {
    const { data, error } = await this.supabase.client
      .from('metadata_keys')
      .select('id, key_name, key_type');

    if (error || !Array.isArray(data)) return [];
    return data as MetadataKeyRecord[];
  }

  async fetchMediaLinksForLookupIds(lookupIds: string[]): Promise<MediaLookupRow[]> {
    if (lookupIds.length === 0) return [];

    const [directLinksResponse, sourceLinksResponse] = await Promise.all([
      this.supabase.client.from('media_items').select('id,source_image_id').in('id', lookupIds),
      this.supabase.client
        .from('media_items')
        .select('id,source_image_id')
        .in('source_image_id', lookupIds),
    ]);

    return [
      ...(Array.isArray(directLinksResponse.data)
        ? (directLinksResponse.data as MediaLookupRow[])
        : []),
      ...(Array.isArray(sourceLinksResponse.data)
        ? (sourceLinksResponse.data as MediaLookupRow[])
        : []),
    ].filter((row, index, all) => index === all.findIndex((candidate) => candidate.id === row.id));
  }

  async fetchMetadataValuesForMediaItems(mediaItemIds: string[]): Promise<MediaMetadataValueRow[]> {
    if (mediaItemIds.length === 0) return [];

    const { data, error } = await this.supabase.client
      .from('media_metadata')
      .select('media_item_id, metadata_key_id, value_text')
      .in('media_item_id', mediaItemIds);

    if (error || !Array.isArray(data)) return [];
    return data as MediaMetadataValueRow[];
  }

  async fetchMetadataEntriesForMediaItem(mediaItemId: string): Promise<MetadataEntryRecord[]> {
    const { data, error } = await this.supabase.client
      .from('media_metadata')
      .select('metadata_key_id, value_text, metadata_keys(key_name)')
      .eq('media_item_id', mediaItemId);

    if (error || !Array.isArray(data)) return [];

    return (
      data as Array<{
        metadata_key_id: string;
        value_text: string;
        metadata_keys?: { key_name?: string | null } | null;
      }>
    ).map((row) => ({
      metadataKeyId: row.metadata_key_id,
      key: row.metadata_keys?.key_name ?? 'Unknown',
      value: row.value_text,
    }));
  }

  async listMetadataKeyNames(organizationId: string): Promise<string[]> {
    const { data, error } = await this.supabase.client
      .from('metadata_keys')
      .select('key_name')
      .eq('organization_id', organizationId)
      .order('key_name');

    if (error || !Array.isArray(data)) return [];
    return (data as Array<{ key_name: string | null }>)
      .map((row) => row.key_name ?? '')
      .filter(Boolean);
  }

  async resolveMediaItemIdByLookupId(lookupId: string): Promise<string | null> {
    const { data, error } = await this.supabase.client
      .from('media_items')
      .select('id')
      .or(`id.eq.${lookupId},source_image_id.eq.${lookupId}`)
      .limit(1)
      .maybeSingle();

    if (error || !data?.id) return null;
    return data.id as string;
  }

  async findMetadataKeyId(organizationId: string, keyName: string): Promise<string | null> {
    const { data, error } = await this.supabase.client
      .from('metadata_keys')
      .select('id')
      .eq('key_name', keyName)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error || !data?.id) return null;
    return data.id as string;
  }

  async createMetadataKey(organizationId: string, keyName: string): Promise<string | null> {
    const { data, error } = await this.supabase.client
      .from('metadata_keys')
      .insert({ key_name: keyName, organization_id: organizationId })
      .select('id')
      .single();

    if (error || !data?.id) return null;
    return data.id as string;
  }

  async upsertMetadataValue(
    mediaItemId: string,
    metadataKeyId: string,
    valueText: string,
  ): Promise<boolean> {
    const { error } = await this.supabase.client.from('media_metadata').upsert(
      {
        media_item_id: mediaItemId,
        metadata_key_id: metadataKeyId,
        value_text: valueText,
      },
      { onConflict: 'media_item_id,metadata_key_id' },
    );

    return !error;
  }

  async deleteMetadataValue(mediaItemId: string, metadataKeyId: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('media_metadata')
      .delete()
      .eq('media_item_id', mediaItemId)
      .eq('metadata_key_id', metadataKeyId);

    return !error;
  }
}
