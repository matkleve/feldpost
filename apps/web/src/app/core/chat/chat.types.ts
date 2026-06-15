export type ChatChannelType = 'public' | 'private' | 'dm';

export interface ChatChannel {
  id: string;
  organizationId: string;
  name: string | null;
  description: string | null;
  type: ChatChannelType;
  createdBy: string | null;
  createdAt: string;
  archivedAt: string | null;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  parentId: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  authorName?: string;
  threadReplyCount?: number;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
}

export interface SendMessageInput {
  channelId: string;
  content: string;
  parentId?: string | null;
}
