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

export interface ChatChannelMember {
  userId: string;
  role: 'owner' | 'member';
  fullName: string;
  joinedAt: string;
}

export interface ChatMessageReaction {
  emoji: string;
  userId: string;
}

export interface ChatMessageAttachment {
  id: string;
  messageId: string;
  mediaItemId: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
}

export interface ChatMessageEntityLink {
  id: string;
  messageId: string;
  entityType: 'project' | 'media' | 'timespace';
  entityId: string;
  entityLabel?: string;
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
  reactions?: ChatMessageReaction[];
  attachments?: ChatMessageAttachment[];
  entityLinks?: ChatMessageEntityLink[];
}

export interface TypingIndicator {
  userId: string;
  userName: string;
}

export interface SendMessageInput {
  channelId: string;
  content: string;
  parentId?: string | null;
  attachmentFile?: File | null;
  entityLink?: {
    entityType: 'project' | 'media' | 'timespace';
    entityId: string;
    entityLabel?: string;
  } | null;
}

export const CHAT_QUICK_REACTIONS = ['👍', '❤️', '✅', '👀', '🔥', '😂'] as const;
