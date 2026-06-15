import { Injectable, inject, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from '../auth/auth.service';
import type { ChatChannel, ChatMessage, SendMessageInput } from './chat.types';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  private realtimeChannel: RealtimeChannel | null = null;
  private subscribedChannelId: string | null = null;

  readonly liveMessages = signal<ChatMessage[]>([]);
  readonly typingUserIds = signal<Set<string>>(new Set());

  async loadChannels(): Promise<{ data: ChatChannel[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('chat_channels')
      .select('*')
      .is('archived_at', null)
      .order('created_at');

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return {
      data: (data ?? []).map((row) => this.toChannel(row)),
      error: null,
    };
  }

  async createChannel(name: string, type: 'public' | 'private' = 'public'): Promise<{ data: ChatChannel | null; error: Error | null }> {
    const userId = this.authService.user()?.id ?? null;
    const orgId = await this.resolveOrganizationId();
    const { data, error } = await this.supabase.client
      .from('chat_channels')
      .insert({ name, type, created_by: userId, organization_id: orgId })
      .select('*')
      .single();

    if (error || !data) {
      return { data: null, error: new Error(error?.message ?? 'Could not create channel.') };
    }

    if (userId) {
      await this.supabase.client.from('chat_channel_members').upsert({
        channel_id: data.id,
        user_id: userId,
        role: 'owner',
      });
    }

    return { data: this.toChannel(data), error: null };
  }

  async findOrCreateDm(otherUserId: string): Promise<{ data: ChatChannel | null; error: Error | null }> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return { data: null, error: new Error('Not authenticated.') };
    }

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
        return { data: this.toChannel(channel), error: null };
      }
    }

    const orgId = await this.resolveOrganizationId();
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

    return { data: this.toChannel(created), error: null };
  }

  async loadMessages(channelId: string, limit = 50): Promise<{ data: ChatMessage[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('chat_messages')
      .select('*, profiles(full_name)')
      .eq('channel_id', channelId)
      .is('parent_id', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    const messages = (data ?? []).map((row) => this.toMessage(row));
    this.liveMessages.set(messages);
    return { data: messages, error: null };
  }

  async loadThreadReplies(parentId: string): Promise<{ data: ChatMessage[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('chat_messages')
      .select('*, profiles(full_name)')
      .eq('parent_id', parentId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data ?? []).map((row) => this.toMessage(row)), error: null };
  }

  async sendMessage(input: SendMessageInput): Promise<{ data: ChatMessage | null; error: Error | null }> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return { data: null, error: new Error('Not authenticated.') };
    }

    const { data, error } = await this.supabase.client
      .from('chat_messages')
      .insert({
        channel_id: input.channelId,
        user_id: userId,
        content: input.content,
        parent_id: input.parentId ?? null,
      })
      .select('*, profiles(full_name)')
      .single();

    if (error || !data) {
      return { data: null, error: new Error(error?.message ?? 'Could not send message.') };
    }

    const message = this.toMessage(data);
    if (!input.parentId) {
      this.liveMessages.update((messages) => [...messages, message]);
    }

    await this.markChannelRead(input.channelId);
    return { data: message, error: null };
  }

  async editMessage(messageId: string, content: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client
      .from('chat_messages')
      .update({ content, edited_at: new Date().toISOString() })
      .eq('id', messageId);

    return { error: error ? new Error(error.message) : null };
  }

  async deleteMessage(messageId: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client
      .from('chat_messages')
      .update({ deleted_at: new Date().toISOString(), content: '' })
      .eq('id', messageId);

    return { error: error ? new Error(error.message) : null };
  }

  async searchMessages(query: string): Promise<{ data: ChatMessage[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('chat_messages')
      .select('*, profiles(full_name)')
      .textSearch('search_vector', query, { type: 'plain', config: 'simple' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data ?? []).map((row) => this.toMessage(row)), error: null };
  }

  async markChannelRead(channelId: string): Promise<void> {
    const userId = this.authService.user()?.id;
    if (!userId) return;

    await this.supabase.client.from('chat_channel_members').upsert({
      channel_id: channelId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    });
  }

  subscribeToChannel(channelId: string): void {
    if (this.subscribedChannelId === channelId && this.realtimeChannel) {
      return;
    }

    this.unsubscribe();

    this.subscribedChannelId = channelId;
    this.realtimeChannel = this.supabase.client
      .channel(`chat:${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          const message = this.toMessage(payload.new as Record<string, unknown>);
          if (!message.parentId) {
            this.liveMessages.update((messages) => {
              if (messages.some((entry) => entry.id === message.id)) {
                return messages;
              }
              return [...messages, message];
            });
          }
        },
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        const userId = (payload['payload'] as { userId?: string }).userId;
        if (!userId || userId === this.authService.user()?.id) return;
        this.typingUserIds.update((set) => new Set(set).add(userId));
        setTimeout(() => {
          this.typingUserIds.update((set) => {
            const next = new Set(set);
            next.delete(userId);
            return next;
          });
        }, 3000);
      })
      .subscribe();
  }

  broadcastTyping(channelId: string): void {
    const userId = this.authService.user()?.id;
    if (!userId) return;

    void this.supabase.client.channel(`chat:${channelId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId },
    });
  }

  subscribePresence(channelId: string, onSync: (onlineUserIds: Set<string>) => void): RealtimeChannel {
    const userId = this.authService.user()?.id;
    const channel = this.supabase.client.channel(`presence:${channelId}`, {
      config: { presence: { key: userId ?? 'anonymous' } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Record<string, Array<Record<string, unknown>>>>();
        const online = new Set<string>();
        for (const presences of Object.values(state)) {
          for (const presence of presences) {
            const userId = presence['user_id'];
            if (typeof userId === 'string') online.add(userId);
          }
        }
        onSync(online);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && userId) {
          await channel.track({ user_id: userId });
        }
      });

    return channel;
  }

  unsubscribe(): void {
    if (this.realtimeChannel) {
      void this.supabase.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.subscribedChannelId = null;
    this.liveMessages.set([]);
    this.typingUserIds.set(new Set());
  }

  private async resolveOrganizationId(): Promise<string> {
    const userId = this.authService.user()?.id;
    if (!userId) throw new Error('Not authenticated.');

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

  private toChannel(row: Record<string, unknown>): ChatChannel {
    return {
      id: row['id'] as string,
      organizationId: row['organization_id'] as string,
      name: (row['name'] as string | null) ?? null,
      description: (row['description'] as string | null) ?? null,
      type: row['type'] as ChatChannel['type'],
      createdBy: (row['created_by'] as string | null) ?? null,
      createdAt: row['created_at'] as string,
      archivedAt: (row['archived_at'] as string | null) ?? null,
    };
  }

  private toMessage(row: Record<string, unknown>): ChatMessage {
    const profile = row['profiles'] as { full_name?: string } | Array<{ full_name?: string }> | null;
    const profileName = Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name;

    return {
      id: row['id'] as string,
      channelId: row['channel_id'] as string,
      userId: row['user_id'] as string,
      content: row['content'] as string,
      parentId: (row['parent_id'] as string | null) ?? null,
      editedAt: (row['edited_at'] as string | null) ?? null,
      deletedAt: (row['deleted_at'] as string | null) ?? null,
      createdAt: row['created_at'] as string,
      authorName: profileName ?? undefined,
    };
  }
}
