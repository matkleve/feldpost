import type { ChatChannel, ChatMessage } from './chat.types';

export function toChannel(row: Record<string, unknown>): ChatChannel {
  return {
    id: row['id'] as string,
    organizationId: row['organization_id'] as string,
    name: (row['name'] as string | null) ?? null,
    description: (row['description'] as string | null) ?? null,
    type: row['type'] as ChatChannel['type'],
    createdBy: (row['created_by'] as string | null) ?? null,
    createdAt: row['created_at'] as string,
    archivedAt: (row['archived_at'] as string | null) ?? null,
    unreadCount: (row['unread_count'] as number | undefined) ?? undefined,
  };
}

export function toMessage(row: Record<string, unknown>): ChatMessage {
  const profile = row['profiles'] as { full_name?: string } | Array<{ full_name?: string }> | null;
  const profileName = Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name;
  const reactions = row['chat_reactions'] as Array<{ emoji: string; user_id: string }> | undefined;
  const attachments = row['chat_attachments'] as Array<Record<string, unknown>> | undefined;
  const links = row['chat_message_links'] as Array<Record<string, unknown>> | undefined;
  const threadCount = row['thread_reply_count'] as number | undefined;

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
    threadReplyCount: threadCount ?? undefined,
    reactions: reactions?.map((r) => ({ emoji: r.emoji, userId: r.user_id })),
    attachments: attachments?.map((a) => ({
      id: a['id'] as string,
      messageId: a['message_id'] as string,
      mediaItemId: (a['media_item_id'] as string | null) ?? null,
      fileUrl: (a['file_url'] as string | null) ?? null,
      fileName: (a['file_name'] as string | null) ?? null,
      fileType: (a['file_type'] as string | null) ?? null,
    })),
    entityLinks: links?.map((l) => ({
      id: l['id'] as string,
      messageId: l['message_id'] as string,
      entityType: l['entity_type'] as 'project' | 'media' | 'timespace',
      entityId: l['entity_id'] as string,
      entityLabel: (l['entity_label'] as string | null) ?? undefined,
    })),
  };
}

export function groupReactions(reactions: Array<{ emoji: string; userId: string }> | undefined): Array<{
  emoji: string;
  count: number;
  userIds: string[];
}> {
  if (!reactions?.length) return [];
  const map = new Map<string, string[]>();
  for (const reaction of reactions) {
    const existing = map.get(reaction.emoji) ?? [];
    existing.push(reaction.userId);
    map.set(reaction.emoji, existing);
  }
  return [...map.entries()].map(([emoji, userIds]) => ({ emoji, count: userIds.length, userIds }));
}
