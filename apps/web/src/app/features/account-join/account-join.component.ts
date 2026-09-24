import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AccountContextService } from '../../core/account-context/account-context.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { SupabaseService } from '../../core/supabase/supabase.service';

@Component({
  selector: 'app-account-join',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section>
      <h1>{{ t('account.join.title', 'Join an organization') }}</h1>
      <p>{{ t('account.join.body', 'Use the invite you already have. This account joins that organization and switches to it.') }}</p>
      <label>
        {{ t('account.join.token', 'Invite code') }}
        <input [(ngModel)]="token" name="token" />
      </label>
      <button type="button" (click)="join()">{{ t('account.join.submit', 'Join') }}</button>
      @if (message()) {
        <p>{{ message() }}</p>
      }
    </section>
  `,
})
export class AccountJoinComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly account = inject(AccountContextService);
  private readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  readonly t = this.i18n.t.bind(this.i18n);
  token = '';
  readonly message = signal<string | null>(null);

  constructor() {
    this.token = this.route.snapshot.queryParamMap.get('invite') ?? '';
  }

  async join(): Promise<void> {
    const { error } = await this.supabase.client.rpc('accept_organization_invite', {
      p_token: this.token.trim(),
    });
    if (error) {
      this.message.set(error.message);
      return;
    }
    await this.account.load();
    this.message.set(this.t('account.join.done', 'Joined. The shell is now that organization.'));
  }
}
