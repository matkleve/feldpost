import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { SupabaseService } from '../../core/supabase/supabase.service';

interface InboxThread {
  email: string;
  body: string;
  created_at: string;
}

interface ThreadMessage {
  id: string;
  body: string;
  created_at: string;
  mine: boolean;
}

@Component({
  selector: 'app-account-chat',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section>
      <h1>{{ t('account.chat.title', 'Messages') }}</h1>
      <h2>{{ t('account.chat.inbox', 'Inbox') }}</h2>
      <ul>
        @for (thread of inbox(); track thread.email) {
          <li>
            <button type="button" (click)="open(thread.email)">{{ thread.email }}: {{ thread.body }}</button>
          </li>
        }
      </ul>
      <label>
        {{ t('account.chat.email', 'Email') }}
        <input [(ngModel)]="email" name="email" type="email" />
      </label>
      <button type="button" (click)="load()">{{ t('account.chat.open', 'Open') }}</button>
      <ul>
        @for (message of messages(); track message.id) {
          <li>{{ message.mine ? t('account.chat.you', 'You') : email }}: {{ message.body }}</li>
        }
      </ul>
      <label>
        {{ t('account.chat.body', 'Message') }}
        <input [(ngModel)]="body" name="body" />
      </label>
      <button type="button" (click)="send()">{{ t('account.chat.send', 'Send') }}</button>
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
    </section>
  `,
})
export class AccountChatComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly i18n = inject(I18nService);
  readonly t = this.i18n.t.bind(this.i18n);
  email = '';
  body = '';
  readonly error = signal<string | null>(null);
  readonly messages = signal<ThreadMessage[]>([]);
  readonly inbox = signal<InboxThread[]>([]);

  constructor() {
    void this.loadInbox();
  }

  async loadInbox(): Promise<void> {
    const { data, error } = await this.supabase.client.rpc('list_account_inbox');
    if (error) {
      this.error.set(error.message);
      return;
    }
    this.inbox.set((data ?? []) as InboxThread[]);
  }

  async open(email: string): Promise<void> {
    this.email = email;
    await this.load();
  }

  async load(): Promise<void> {
    this.error.set(null);
    const { data, error } = await this.supabase.client.rpc('list_account_thread', {
      p_email: this.email.trim(),
    });
    if (error) {
      this.error.set(error.message);
      return;
    }
    this.messages.set((data ?? []) as ThreadMessage[]);
  }

  async send(): Promise<void> {
    this.error.set(null);
    const { error } = await this.supabase.client.rpc('send_account_message', {
      p_email: this.email.trim(),
      p_body: this.body.trim(),
    });
    if (error) {
      this.error.set(error.message);
      return;
    }
    this.body = '';
    await this.load();
    await this.loadInbox();
  }
}
