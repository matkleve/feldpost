import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../supabase/supabase.service';
import { toChannel } from '../chat.helpers';
import type { ChatChannel } from '../chat.types';

@Injectable({ providedIn: 'root' })
export class ChatChannelsAdapter {
  private readonly supabase = inject(SupabaseService);

  async loadChannels(): Promise<{ data: ChatChannel[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('chat_channels')
      .select('*')
      .is('archived_at', null)
      .order('created_at');

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data ?? []).map((row) => toChannel(row)), error: null };
  }

  async createChannel(
    name: string,
    type: 'public' | 'private',
    userId: string,
    orgId: string,
  ): Promise<{ data: ChatChannel | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('chat_channels')
      .insert({ name, type, created_by: userId, organization_id: orgId })
      .select('*')
      .single();

    if (error || !data) {
      return { data: null, error: new Error(error?.message ?? 'Could not create channel.') };
    }

    await this.supabase.client.from('chat_channel_members').upsert({
      channel_id: data.id,
      user_id: userId,
      role: 'owner',
    });

    return { data: toChannel(data), error: null };
  }

  async archiveChannel(channelId: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client
      .from('chat_channels')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', channelId);

    return { error: error ? new Error(error.message) : null };
  }

  async addChannelMember(
    channelId: string,
    userId: string,
    role: 'owner' | 'member' = 'member',
  ): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('chat_channel_members').upsert({
      channel_id: channelId,
      user_id: userId,
      role,
    });

    return { error: error ? new Error(error.message) : null };
  }

  async findOrCreateDm(
    userId: string,
    otherUserId: string,
    orgId: string,
  ): Promise<{ data: ChatChannel | null; error: Error | null }> {
    const { data: channels, error } = await this.supabase.client
      .from('chat_channels')
      .select('*, chat_channel_members(user_id)')
      .eq('type', 'dm');

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    for (const channel of channels ?? []) {
      const members = (channel.chat_channel_members as Array<{ user_id: string }>) ?? [];
      const memberIds = new Set(members.map((m) => m.user_id));
      if (memberIds.has(userId) && memberIds.has(otherUserId) && memberIds.size === 2) {
        return { data: toChannel(channel), error: null };
      }
    }

    const { data: created, error: createError } = await this.supabase.client
      .from('chat_channels')
      .insert({ type: 'dm', created_by: userId, organization_id: orgId })
      .select('*')
      .single();

    if (createError || !created) {
      return { data: null, error: new Error(createError?.message ?? 'Could not create DM.') };
    }

    await this.supabase.client.from('chat_channel_members').insert([
      { channel_id: created.id, user_id: userId, role: 'owner' },
      { channel_id: created.id, user_id: otherUserId, role: 'member' },
    ]);

    return { data: toChannel(created), error: null };
  }

  async markChannelRead(channelId: string, userId: string): Promise<void> {
    await this.supabase.client.from('chat_channel_members').upsert({
      channel_id: channelId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    });
  }

  async loadUnreadCounts(userId: string): Promise<Map<string, number>> {
    const { data, error } = await this.supabase.client.rpc('get_chat_unread_counts', {
      p_user_id: userId,
    });

    const counts = new Map<string, number>();
    if (error || !Array.isArray(data)) return counts;

    for (const row of data as Array<{ channel_id: string; unread_count: number }>) {
      counts.set(row.channel_id, row.unread_count);
    }
    return counts;
  }

  async resolveOrganizationId(userId: string): Promise<string> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (error || !data?.organization_id) {
      throw new Error('Organization context missing.');
    }

    return data.organization_id as string;
  }
}
