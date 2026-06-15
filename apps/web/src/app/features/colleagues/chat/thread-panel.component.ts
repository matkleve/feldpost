import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ChatService } from '../../../core/chat/chat.service';
import type { ChatMessage, SendMessageInput } from '../../../core/chat/chat.types';
import { I18nService } from '../../../core/i18n/i18n.service';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';

@Component({
  selector: 'app-thread-panel',
  standalone: true,
  imports: [DatePipe, FormsModule, ...HLM_BUTTON_IMPORTS],
  templateUrl: './thread-panel.component.html',
  styleUrl: './thread-panel.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-col',
  },
})
export class ThreadPanelComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly i18nService = inject(I18nService);
  private threadChannel: RealtimeChannel | null = null;

  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly parentMessage = input.required<ChatMessage>();
  readonly channelId = input.required<string>();

  readonly closed = output<void>();
  readonly replySent = output<void>();

  readonly replies = signal<ChatMessage[]>([]);
  readonly draft = signal('');
  readonly loading = signal(true);

  readonly currentUserId = () => this.authService.user()?.id ?? null;

  ngOnInit(): void {
    void this.loadReplies();
    this.threadChannel = this.chatService.subscribeToThread(this.parentMessage().id, (message) => {
      this.replies.update((list) => {
        if (list.some((entry) => entry.id === message.id)) return list;
        return [...list, message];
      });
    });

    this.destroyRef.onDestroy(() => {
      if (this.threadChannel) {
        this.chatService.removeChannel(this.threadChannel);
      }
    });
  }

  async loadReplies(): Promise<void> {
    this.loading.set(true);
    const result = await this.chatService.loadThreadReplies(this.parentMessage().id);
    this.replies.set(result.data);
    this.loading.set(false);
  }

  onSend(): void {
    const content = this.draft().trim();
    if (!content) return;

    const input: SendMessageInput = {
      channelId: this.channelId(),
      content,
      parentId: this.parentMessage().id,
    };

    void this.chatService.sendMessage(input).then((result) => {
      if (result.data) {
        this.replies.update((list) => [...list, result.data!]);
        this.draft.set('');
        this.replySent.emit();
      }
    });
  }

  onClose(): void {
    this.closed.emit();
  }
}
