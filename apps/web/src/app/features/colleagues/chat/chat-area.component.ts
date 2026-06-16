import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ChatService } from '../../../core/chat/chat.service';
import { CHAT_QUICK_REACTIONS, type ChatChannel, type ChatChannelMember, type ChatMessage, type SendMessageInput } from '../../../core/chat/chat.types';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ProjectsService } from '../../../core/projects/projects.service';
import { groupReactions } from '../../../core/chat/chat.helpers';
import { RailSearchFieldComponent } from '../../../shared/rail-search-field';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { ThreadPanelComponent } from './thread-panel.component';

@Component({
  selector: 'app-chat-area',
  standalone: true,
  imports: [DatePipe, FormsModule, RailSearchFieldComponent, ThreadPanelComponent, ...HLM_BUTTON_IMPORTS],
  templateUrl: './chat-area.component.html',
  styleUrl: './chat-area.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-1 flex-col',
  },
})
export class ChatAreaComponent {
  private readonly i18nService = inject(I18nService);
  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);
  private readonly projectsService = inject(ProjectsService);

  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);
  readonly quickReactions = CHAT_QUICK_REACTIONS;
  readonly groupReactions = groupReactions;

  readonly channel = input<ChatChannel | null>(null);
  readonly headerTitle = input<string | null>(null);
  readonly messages = input<ChatMessage[]>([]);
  readonly typingUserIds = input<Set<string>>(new Set());
  readonly channelMembers = input<ChatChannelMember[]>([]);
  readonly searchResults = input<ChatMessage[]>([]);
  readonly canDeleteAny = input(false);

  readonly messageSent = output<SendMessageInput>();
  readonly typing = output<void>();
  readonly searchRequested = output<string>();
  readonly messageEdited = output<{ messageId: string; content: string }>();
  readonly messageDeleted = output<string>();
  readonly reactionToggled = output<{ messageId: string; emoji: string }>();
  readonly threadOpened = output<ChatMessage>();
  readonly memberProfileRequested = output<void>();

  readonly draft = signal('');
  readonly searchQuery = signal('');
  readonly threadParent = signal<ChatMessage | null>(null);
  readonly editingMessageId = signal<string | null>(null);
  readonly editDraft = signal('');
  readonly showSearchResults = signal(false);
  readonly attachmentFile = signal<File | null>(null);
  readonly selectedProjectId = signal<string | null>(null);
  readonly projects = signal<Array<{ id: string; name: string }>>([]);
  readonly reactionPickerMessageId = signal<string | null>(null);

  readonly currentUserId = computed(() => this.authService.user()?.id ?? null);

  readonly displayTitle = computed(() => {
    const title = this.headerTitle();
    if (title) return title;
    return this.channelTitle(this.channel());
  });

  readonly isDmChannel = computed(() => this.channel()?.type === 'dm');

  readonly dmPeerInitials = computed(() => {
    const title = this.displayTitle();
    const trimmed = title.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
  });

  readonly typingText = computed(() => {
    const ids = this.typingUserIds();
    if (ids.size === 0) return '';
    const members = this.channelMembers();
    const names = [...ids]
      .map((id) => members.find((m) => m.userId === id)?.fullName)
      .filter((n): n is string => !!n);
    if (names.length === 0) return this.t('colleagues.chat.typing', 'Someone is typing…');
    if (names.length === 1) return `${names[0]} ${this.t('colleagues.chat.typing_verb', 'is typing…')}`;
    return `${names.join(', ')} ${this.t('colleagues.chat.typing_verb_plural', 'are typing…')}`;
  });

  readonly composerPlaceholder = computed(() => {
    const channel = this.channel();
    const title = this.displayTitle();
    if (!channel) {
      return this.t('colleagues.chat.placeholder', 'Write a message');
    }
    if (channel.type === 'dm') {
      return this.t('colleagues.chat.placeholder_dm', 'Message {name}').replace('{name}', title);
    }
    return this.t('colleagues.chat.placeholder_channel', 'Message #{name}').replace('{name}', title);
  });

  readonly groupedMessages = computed(() => {
    const items = this.messages();
    const groups: Array<{ date: string; messages: ChatMessage[] }> = [];
    let currentDate = '';
    for (const message of items) {
      const date = message.createdAt.slice(0, 10);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, messages: [message] });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    }
    return groups;
  });

  constructor() {
    void this.projectsService.loadProjects().then((list) => {
      this.projects.set(list.map((p) => ({ id: p.id, name: p.name })));
    });
  }

  channelTitle(channel: ChatChannel | null): string {
    if (!channel) return this.t('colleagues.chat.no_channel', 'Select a channel');
    return channel.name ?? this.t('colleagues.channel.unnamed', 'Channel');
  }

  authorInitials(name: string | undefined): string {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return '?';
    return trimmed.charAt(0).toUpperCase();
  }

  onSearchQueryChange(value: string): void {
    this.searchQuery.set(value);
    if (!value.trim()) {
      this.showSearchResults.set(false);
    }
  }

  isOwnMessage(message: ChatMessage): boolean {
    return message.userId === this.currentUserId();
  }

  onSend(): void {
    const channel = this.channel();
    const content = this.draft().trim();
    if (!channel || !content) return;

    const projectId = this.selectedProjectId();
    const project = projectId ? this.projects().find((p) => p.id === projectId) : null;

    this.messageSent.emit({
      channelId: channel.id,
      content,
      parentId: null,
      attachmentFile: this.attachmentFile(),
      entityLink: project
        ? { entityType: 'project', entityId: project.id, entityLabel: project.name }
        : null,
    });
    this.draft.set('');
    this.attachmentFile.set(null);
    this.selectedProjectId.set(null);
  }

  onDraftInput(): void {
    this.typing.emit();
  }

  onSearch(): void {
    const query = this.searchQuery().trim();
    if (query) {
      this.searchRequested.emit(query);
      this.showSearchResults.set(true);
    }
  }

  onOpenThread(message: ChatMessage): void {
    this.threadParent.set(message);
    this.threadOpened.emit(message);
  }

  onCloseThread(): void {
    this.threadParent.set(null);
  }

  onStartEdit(message: ChatMessage): void {
    this.editingMessageId.set(message.id);
    this.editDraft.set(message.content);
  }

  onCancelEdit(): void {
    this.editingMessageId.set(null);
    this.editDraft.set('');
  }

  onSaveEdit(messageId: string): void {
    const content = this.editDraft().trim();
    if (!content) return;
    this.messageEdited.emit({ messageId, content });
    this.editingMessageId.set(null);
    this.editDraft.set('');
  }

  onDelete(messageId: string): void {
    this.messageDeleted.emit(messageId);
  }

  onToggleReaction(messageId: string, emoji: string): void {
    this.reactionToggled.emit({ messageId, emoji });
    this.reactionPickerMessageId.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.attachmentFile.set(file);
  }

  onSearchResultClick(message: ChatMessage): void {
    this.showSearchResults.set(false);
    if (message.channelId !== this.channel()?.id) {
      return;
    }
    const element = document.getElementById(`chat-msg-${message.id}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  onMemberProfileOpen(): void {
    if (this.isDmChannel()) {
      this.memberProfileRequested.emit();
    }
  }
}
