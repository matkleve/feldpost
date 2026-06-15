import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../supabase/supabase.service';
import { toMessage } from '../chat.helpers';
import type { ChatMessage, SendMessageInput } from '../chat.types';

const MESSAGE_SELECT =
  '*, profiles(full_name), chat_reactions(emoji, user_id), chat_attachments(id, message_id, media_item_id, file_url, file_name, file_type), chat_message_links(id, message_id, entity_type, entity_id, entity_label)';

@Injectable({ providedIn: 'root' })
export class ChatMessagesAdapter {
  private readonly supabase = inject(SupabaseService);

  async loadMessages(channelId: string, limit = 50): Promise<{ data: ChatMessage[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('chat_messages')
      .select(MESSAGE_SELECT)
      .eq('channel_id', channelId)
      .is('parent_id', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    const messages = await this.attachThreadCounts(data ?? []);
    return { data: messages, error: null };
  }

  async loadThreadReplies(parentId: string): Promise<{ data: ChatMessage[]; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('chat_messages')
      .select(MESSAGE_SELECT)
      .eq('parent_id', parentId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data ?? []).map((row) => toMessage(row)), error: null };
  }

  async sendMessage(
    input: SendMessageInput,
    userId: string,
  ): Promise<{ data: ChatMessage | null; error: Error | null }> {
    const { data, error } = await this.supabase.client
      .from('chat_messages')
      .insert({
        channel_id: input.channelId,
        user_id: userId,
        content: input.content,
        parent_id: input.parentId ?? null,
      })
      .select(MESSAGE_SELECT)
      .single();

    if (error || !data) {
      return { data: null, error: new Error(error?.message ?? 'Could not send message.') };
    }

    return { data: toMessage(data), error: null };
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
      .select(MESSAGE_SELECT)
      .textSearch('search_vector', query, { type: 'plain', config: 'simple' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data ?? []).map((row) => toMessage(row)), error: null };
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('chat_reactions').upsert({
      message_id: messageId,
      user_id: userId,
      emoji,
    });

    return { error: error ? new Error(error.message) : null };
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client
      .from('chat_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);

    return { error: error ? new Error(error.message) : null };
  }

  async attachFile(
    messageId: string,
    file: { fileUrl: string; fileName: string; fileType: string; mediaItemId?: string | null },
  ): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('chat_attachments').insert({
      message_id: messageId,
      file_url: file.fileUrl,
      file_name: file.fileName,
      file_type: file.fileType,
      media_item_id: file.mediaItemId ?? null,
    });

    return { error: error ? new Error(error.message) : null };
  }

  async attachEntityLink(
    messageId: string,
    entityType: 'project' | 'media' | 'timespace',
    entityId: string,
    entityLabel?: string,
  ): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.client.from('chat_message_links').insert({
      message_id: messageId,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel ?? null,
    });

    return { error: error ? new Error(error.message) : null };
  }

  async uploadChatFile(
    orgId: string,
    userId: string,
    file: File,
  ): Promise<{ path: string | null; error: Error | null }> {
    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `${orgId}/${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await this.supabase.client.storage.from('chat-attachments').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      return { path: null, error: new Error(error.message) };
    }

    const { data } = this.supabase.client.storage.from('chat-attachments').getPublicUrl(path);
    return { path: data.publicUrl, error: null };
  }

  private async attachThreadCounts(rows: Record<string, unknown>[]): Promise<ChatMessage[]> {
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r['id'] as string);
    const { data: counts } = await this.supabase.client
      .from('chat_messages')
      .select('parent_id')
      .in('parent_id', ids)
      .is('deleted_at', null);

    const countMap = new Map<string, number>();
    for (const row of counts ?? []) {
      const parentId = row.parent_id as string;
      countMap.set(parentId, (countMap.get(parentId) ?? 0) + 1);
    }

    return rows.map((row) => {
      const message = toMessage(row);
      message.threadReplyCount = countMap.get(message.id) ?? 0;
      return message;
    });
  }
}
