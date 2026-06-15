import { DatePipe } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { ChatChannel, ChatMessage, SendMessageInput } from '../../../core/chat/chat.types';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';

@Component({
  selector: 'app-chat-area',
  standalone: true,
  imports: [DatePipe, FormsModule, ...HLM_BUTTON_IMPORTS],
  templateUrl: './chat-area.component.html',
  styleUrl: './chat-area.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-1 flex-col',
  },
})
export class ChatAreaComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly channel = input<ChatChannel | null>(null);
  readonly messages = input<ChatMessage[]>([]);
  readonly typingUserIds = input<Set<string>>(new Set());

  readonly messageSent = output<SendMessageInput>();
  readonly typing = output<void>();
  readonly searchRequested = output<string>();

  readonly draft = signal('');
  readonly searchQuery = signal('');
  readonly threadParentId = signal<string | null>(null);

  channelTitle(channel: ChatChannel | null): string {
    if (!channel) return this.t('colleagues.chat.no_channel', 'Select a channel');
    if (channel.type === 'dm') return this.t('colleagues.chat.dm', 'Direct message');
    return channel.name ?? this.t('colleagues.channel.unnamed', 'Channel');
  }

  onSend(): void {
    const channel = this.channel();
    const content = this.draft().trim();
    if (!channel || !content) return;

    this.messageSent.emit({
      channelId: channel.id,
      content,
      parentId: this.threadParentId(),
    });
    this.draft.set('');
    this.threadParentId.set(null);
  }

  onDraftInput(): void {
    this.typing.emit();
  }

  onSearch(): void {
    const query = this.searchQuery().trim();
    if (query) this.searchRequested.emit(query);
  }

  onReply(parentId: string): void {
    this.threadParentId.set(parentId);
  }
}
