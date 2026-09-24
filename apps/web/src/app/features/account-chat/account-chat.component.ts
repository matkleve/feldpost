import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { SupabaseService } from '../../core/supabase/supabase.service';

@Component({
  selector: 'app-account-chat',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section>
      <h1>{{ t('account.chat.title', 'Messages') }}</h1>
      <label>
        {{ t('account.chat.recipient', 'Recipient id') }}
        <input [(ngModel)]="recipientId" name="recipientId" />
      </label>
      <label>
        {{ t('account.chat.body', 'Message') }}
        <input [(ngModel)]="body" name="body" />
      </label>
      <button type="button" (click)="send()">{{ t('account.chat.send', 'Send') }}</button>
      @if (error()) {
        <p>{{ error() }}</p>
      }
    </section>
  `,
})
export class AccountChatComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly i18n = inject(I18nService);
  readonly t = this.i18n.t.bind(this.i18n);
  recipientId = '';
  body = '';
  readonly error = signal<string | null>(null);

  async send(): Promise<void> {
    this.error.set(null);
    const { data } = await this.supabase.client.auth.getUser();
    const senderId = data.user?.id;
    if (!senderId) {
      this.error.set(this.t('account.chat.signedOut', 'Sign in to send a message.'));
      return;
    }
    const { error } = await this.supabase.client.from('account_messages').insert({
      sender_id: senderId,
      recipient_id: this.recipientId.trim(),
      body: this.body.trim(),
    });
    if (error) {
      this.error.set(error.message);
    }
  }
}
