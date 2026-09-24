import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { SupabaseService } from '../../core/supabase/supabase.service';

interface AccountMessageRow {
  id: string;
  body: string;
  created_at: string;
  sender_id: string;
}

@Component({
  selector: 'app-account-chat',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section>
      <h1>{{ t('account.chat.title', 'Messages') }}</h1>
      <label>
        {{ t('account.chat.email', 'Email') }}
        <input [(ngModel)]="email" name="email" type="email" />
      </label>
      <label>
        {{ t('account.chat.body', 'Message') }}
        <input [(ngModel)]="body" name="body" />
      </label>
      <button type="button" (click)="send()">{{ t('account.chat.send', 'Send') }}</button>
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      <ul>
        @for (message of messages(); track message.id) {
          <li>{{ message.body }}</li>
        }
      </ul>
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
  readonly messages = signal<AccountMessageRow[]>([]);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('account_messages')
      .select('id, body, created_at, sender_id')
      .order('created_at', { ascending: false });
    if (error) {
      this.error.set(error.message);
      return;
    }
    this.messages.set((data ?? []) as AccountMessageRow[]);
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
  }
}
