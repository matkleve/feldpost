import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../supabase/supabase.service';
import { toChannel } from '../chat.helpers';
import type { ChatChannel, ChatChannelMember } from '../chat.types';

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
    const { error } = await this.supabase.client.rpc('invite_chat_channel_member', {
      p_channel_id: channelId,
      p_user_id: userId,
    });

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  }

  async loadChannelMembers(channelId: string): Promise<{ data: ChatChannelMember[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('chat_channel_members')
      .select('user_id, role, joined_at, profiles(full_name)')
      .eq('channel_id', channelId)
      .order('joined_at');

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    const members = (data ?? []).map((row) => {
      const profile = row.profiles as { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
      const resolved = Array.isArray(profile) ? profile[0] : profile;
      return {
        userId: row.user_id as string,
        role: row.role as 'owner' | 'member',
        fullName: (resolved?.full_name as string | null) ?? '',
        joinedAt: row.joined_at as string,
      };
    });

    return { data: members, error: null };
  }

  async findOrCreateDm(
    userId: string,
    otherUserId: string,
    _orgId: string,
  ): Promise<{ data: ChatChannel | null; error: Error | null }> {
    const { data: channelId, error } = await this.supabase.client.rpc('find_or_create_dm_channel', {
      p_other_user_id: otherUserId,
    });

    if (error || !channelId) {
      return { data: null, error: new Error(error?.message ?? 'Could not open direct message.') };
    }

    const { data: channel, error: loadError } = await this.supabase.client
      .from('chat_channels')
      .select('*')
      .eq('id', channelId as string)
      .single();

    if (loadError || !channel) {
      return { data: null, error: new Error(loadError?.message ?? 'Could not load direct message.') };
    }

    return { data: toChannel(channel), error: null };
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
