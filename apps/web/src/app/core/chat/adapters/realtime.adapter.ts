import { Injectable, inject } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../../supabase/supabase.service';
import { toMessage } from '../chat.helpers';
import type { ChatMessage } from '../chat.types';

export interface ChatRealtimeHandlers {
  onMessageInsert: (message: ChatMessage) => void;
  onMessageUpdate: (message: ChatMessage) => void;
  onMessageDelete: (messageId: string) => void;
  onTyping: (userId: string) => void;
  onReactionChange: () => void;
}

@Injectable({ providedIn: 'root' })
export class ChatRealtimeAdapter {
  private readonly supabase = inject(SupabaseService);

  subscribeToChannel(channelId: string, handlers: ChatRealtimeHandlers): RealtimeChannel {
    return this.supabase.client
      .channel(`chat:${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
        (payload) => handlers.onMessageInsert(toMessage(payload.new as Record<string, unknown>)),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
        (payload) => handlers.onMessageUpdate(toMessage(payload.new as Record<string, unknown>)),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          const id = (payload.old as Record<string, unknown>)['id'] as string;
          handlers.onMessageDelete(id);
        },
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        const userId = (payload['payload'] as { userId?: string }).userId;
        if (userId) handlers.onTyping(userId);
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_reactions' },
        () => handlers.onReactionChange(),
      )
      .subscribe();
  }

  subscribeToThread(parentId: string, onInsert: (message: ChatMessage) => void): RealtimeChannel {
    return this.supabase.client
      .channel(`thread:${parentId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `parent_id=eq.${parentId}` },
        (payload) => onInsert(toMessage(payload.new as Record<string, unknown>)),
      )
      .subscribe();
  }

  broadcastTyping(channel: RealtimeChannel, userId: string): void {
    void channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId },
    });
  }

  subscribePresence(channelId: string, userId: string | undefined, onSync: (onlineUserIds: Set<string>) => void): RealtimeChannel {
    const channel = this.supabase.client.channel(`presence:${channelId}`, {
      config: { presence: { key: userId ?? 'anonymous' } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Record<string, Array<Record<string, unknown>>>>();
        const online = new Set<string>();
        for (const presences of Object.values(state)) {
          for (const presence of presences) {
            const id = presence['user_id'];
            if (typeof id === 'string') online.add(id);
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

  removeChannel(channel: RealtimeChannel): void {
    void this.supabase.client.removeChannel(channel);
  }
}
