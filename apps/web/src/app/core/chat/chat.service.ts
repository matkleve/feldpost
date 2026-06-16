import { Injectable, inject, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../auth/auth.service';
import { ChatChannelsAdapter } from './adapters/channels.adapter';
import { ChatMessagesAdapter } from './adapters/messages.adapter';
import { ChatRealtimeAdapter } from './adapters/realtime.adapter';
import type { ChatChannel, ChatChannelMember, ChatMessage, SendMessageInput } from './chat.types';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly authService = inject(AuthService);
  private readonly channelsAdapter = inject(ChatChannelsAdapter);
  private readonly messagesAdapter = inject(ChatMessagesAdapter);
  private readonly realtimeAdapter = inject(ChatRealtimeAdapter);

  private realtimeChannel: RealtimeChannel | null = null;
  private subscribedChannelId: string | null = null;
  private channelsCache: { data: ChatChannel[]; timestamp: number } | null = null;
  private messageCache = new Map<string, ChatMessage[]>();
  private membersCache = new Map<string, ChatChannelMember[]>();
  private static readonly CHANNELS_CACHE_TTL = 30_000;

  readonly liveMessages = signal<ChatMessage[]>([]);
  readonly typingUserIds = signal<Set<string>>(new Set());
  readonly searchResults = signal<ChatMessage[]>([]);

  async loadChannels(forceRefresh = false): Promise<{ data: ChatChannel[]; error: Error | null }> {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.channelsCache &&
      now - this.channelsCache.timestamp < ChatService.CHANNELS_CACHE_TTL
    ) {
      return { data: this.channelsCache.data, error: null };
    }

    const result = await this.channelsAdapter.loadChannels();
    const userId = this.authService.user()?.id;
    if (!userId || result.error) return result;

    const unread = await this.channelsAdapter.loadUnreadCounts(userId);
    const data = result.data.map((channel) => ({
      ...channel,
      unreadCount: unread.get(channel.id) ?? 0,
    }));

    this.channelsCache = { data, timestamp: now };
    return { data, error: null };
  }

  invalidateChannelsCache(): void {
    this.channelsCache = null;
  }

  async createChannel(name: string, type: 'public' | 'private' = 'public'): Promise<{ data: ChatChannel | null; error: Error | null }> {
    const userId = this.authService.user()?.id;
    if (!userId) return { data: null, error: new Error('Not authenticated.') };

    const orgId = await this.channelsAdapter.resolveOrganizationId(userId);
    const result = await this.channelsAdapter.createChannel(name, type, userId, orgId);
    if (!result.error) this.invalidateChannelsCache();
    return result;
  }

  async archiveChannel(channelId: string): Promise<{ error: Error | null }> {
    const result = await this.channelsAdapter.archiveChannel(channelId);
    if (!result.error) this.invalidateChannelsCache();
    return result;
  }

  async updateChannel(
    channelId: string,
    patch: { description?: string | null },
  ): Promise<{ data: ChatChannel | null; error: Error | null }> {
    const result = await this.channelsAdapter.updateChannel(channelId, patch);
    if (!result.error) this.invalidateChannelsCache();
    return result;
  }

  async addChannelMember(channelId: string, userId: string): Promise<{ error: Error | null }> {
    const result = await this.channelsAdapter.addChannelMember(channelId, userId);
    if (!result.error) this.invalidateMembersCache(channelId);
    return result;
  }

  async loadChannelMembers(channelId: string): Promise<{ data: ChatChannelMember[]; error: Error | null }> {
    const cached = this.membersCache.get(channelId);
    if (cached) return { data: cached, error: null };

    const result = await this.channelsAdapter.loadChannelMembers(channelId);
    if (!result.error) {
      this.membersCache.set(channelId, result.data);
    }
    return result;
  }

  invalidateMembersCache(channelId: string): void {
    this.membersCache.delete(channelId);
  }

  async findOrCreateDm(otherUserId: string): Promise<{ data: ChatChannel | null; error: Error | null }> {
    const userId = this.authService.user()?.id;
    if (!userId) return { data: null, error: new Error('Not authenticated.') };

    return this.channelsAdapter.findOrCreateDm(userId, otherUserId);
  }

  async loadMessages(channelId: string, limit = 50): Promise<{ data: ChatMessage[]; error: Error | null }> {
    const cached = this.messageCache.get(channelId);
    if (cached) {
      this.liveMessages.set(cached);
    }

    const result = await this.messagesAdapter.loadMessages(channelId, limit);
    if (!result.error) {
      this.liveMessages.set(result.data);
      this.messageCache.set(channelId, result.data);
    }
    return result;
  }

  async loadThreadReplies(parentId: string): Promise<{ data: ChatMessage[]; error: Error | null }> {
    return this.messagesAdapter.loadThreadReplies(parentId);
  }

  async sendMessage(input: SendMessageInput): Promise<{ data: ChatMessage | null; error: Error | null }> {
    const userId = this.authService.user()?.id;
    if (!userId) return { data: null, error: new Error('Not authenticated.') };

    const result = await this.messagesAdapter.sendMessage(input, userId);
    if (result.error || !result.data) return result;

    const message = result.data;

    if (input.attachmentFile) {
      const orgId = await this.channelsAdapter.resolveOrganizationId(userId);
      const upload = await this.messagesAdapter.uploadChatFile(orgId, userId, input.attachmentFile);
      if (upload.path) {
        await this.messagesAdapter.attachFile(message.id, {
          fileUrl: upload.path,
          fileName: input.attachmentFile.name,
          fileType: input.attachmentFile.type,
        });
      }
    }

    if (input.entityLink) {
      await this.messagesAdapter.attachEntityLink(
        message.id,
        input.entityLink.entityType,
        input.entityLink.entityId,
        input.entityLink.entityLabel,
      );
    }

    if (!input.parentId) {
      this.liveMessages.update((messages) => [...messages, message]);
      this.messageCache.set(input.channelId, this.liveMessages());
    }

    await this.markChannelRead(input.channelId);
    this.invalidateChannelsCache();
    return { data: message, error: null };
  }

  async editMessage(messageId: string, content: string): Promise<{ error: Error | null }> {
    return this.messagesAdapter.editMessage(messageId, content);
  }

  async deleteMessage(messageId: string): Promise<{ error: Error | null }> {
    return this.messagesAdapter.deleteMessage(messageId);
  }

  async searchMessages(query: string): Promise<{ data: ChatMessage[]; error: Error | null }> {
    const result = await this.messagesAdapter.searchMessages(query);
    if (!result.error) {
      this.searchResults.set(result.data);
    }
    return result;
  }

  async addReaction(messageId: string, emoji: string): Promise<{ error: Error | null }> {
    const userId = this.authService.user()?.id;
    if (!userId) return { error: new Error('Not authenticated.') };
    return this.messagesAdapter.addReaction(messageId, userId, emoji);
  }

  async removeReaction(messageId: string, emoji: string): Promise<{ error: Error | null }> {
    const userId = this.authService.user()?.id;
    if (!userId) return { error: new Error('Not authenticated.') };
    return this.messagesAdapter.removeReaction(messageId, userId, emoji);
  }

  async toggleReaction(messageId: string, emoji: string): Promise<{ error: Error | null }> {
    const userId = this.authService.user()?.id;
    if (!userId) return { error: new Error('Not authenticated.') };

    const message = this.liveMessages().find((entry) => entry.id === messageId);
    const hasReaction = message?.reactions?.some((r) => r.emoji === emoji && r.userId === userId);
    if (hasReaction) {
      return this.removeReaction(messageId, emoji);
    }
    return this.addReaction(messageId, emoji);
  }

  async markChannelRead(channelId: string): Promise<void> {
    const userId = this.authService.user()?.id;
    if (!userId) return;
    await this.channelsAdapter.markChannelRead(channelId, userId);
  }

  subscribeToChannel(channelId: string): void {
    if (this.subscribedChannelId === channelId && this.realtimeChannel) return;

    this.unsubscribe();
    this.subscribedChannelId = channelId;

    const currentUserId = this.authService.user()?.id;
    this.realtimeChannel = this.realtimeAdapter.subscribeToChannel(channelId, {
      onMessageInsert: (message) => {
        if (message.parentId) return;
        this.liveMessages.update((messages) => {
          if (messages.some((entry) => entry.id === message.id)) return messages;
          return [...messages, message];
        });
        this.syncCache(channelId);
      },
      onMessageUpdate: (message) => {
        if (message.parentId) return;
        if (message.deletedAt) {
          this.liveMessages.update((messages) => messages.filter((entry) => entry.id !== message.id));
          this.syncCache(channelId);
          return;
        }
        this.liveMessages.update((messages) =>
          messages.map((entry) => (entry.id === message.id ? message : entry)),
        );
        this.syncCache(channelId);
      },
      onMessageDelete: (messageId) => {
        this.liveMessages.update((messages) => messages.filter((entry) => entry.id !== messageId));
        this.syncCache(channelId);
      },
      onTyping: (userId) => {
        if (!currentUserId || userId === currentUserId) return;
        this.typingUserIds.update((set) => new Set(set).add(userId));
        setTimeout(() => {
          this.typingUserIds.update((set) => {
            const next = new Set(set);
            next.delete(userId);
            return next;
          });
        }, 3000);
      },
      onReactionChange: () => {
        if (this.subscribedChannelId) {
          void this.loadMessages(this.subscribedChannelId);
        }
      },
    });
  }

  subscribeToThread(parentId: string, onInsert: (message: ChatMessage) => void): RealtimeChannel {
    return this.realtimeAdapter.subscribeToThread(parentId, onInsert);
  }

  broadcastTyping(channelId: string): void {
    const userId = this.authService.user()?.id;
    if (!userId || !this.realtimeChannel || this.subscribedChannelId !== channelId) return;
    this.realtimeAdapter.broadcastTyping(this.realtimeChannel, userId);
  }

  subscribePresence(channelId: string, onSync: (onlineUserIds: Set<string>) => void): RealtimeChannel {
    return this.realtimeAdapter.subscribePresence(channelId, this.authService.user()?.id, onSync);
  }

  unsubscribe(): void {
    if (this.realtimeChannel) {
      this.realtimeAdapter.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.subscribedChannelId = null;
    this.liveMessages.set([]);
    this.typingUserIds.set(new Set());
    this.searchResults.set([]);
  }

  clearAllCaches(): void {
    this.channelsCache = null;
    this.messageCache.clear();
    this.membersCache.clear();
  }

  private syncCache(channelId: string): void {
    this.messageCache.set(channelId, this.liveMessages());
  }

  removeChannel(channel: RealtimeChannel): void {
    this.realtimeAdapter.removeChannel(channel);
  }
}
