import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { InvitesService } from '../../../core/invites/invites.service';
import type { InviteReferralViewModel } from '../../../core/invites/invites.types';

@Component({
  selector: 'app-colleagues-invite-referrals-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './colleagues-invite-referrals-panel.component.html',
  styleUrl: './colleagues-invite-referrals-panel.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-1 flex-col',
  },
})
export class ColleaguesInviteReferralsPanelComponent implements OnInit {
  private readonly invitesService = inject(InvitesService);
  private readonly i18nService = inject(I18nService);

  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly referrals = signal<InviteReferralViewModel[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    void this.loadReferrals();
  }

  private async loadReferrals(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    try {
      const rows = await this.invitesService.loadAcceptedReferrals();
      this.referrals.set(rows);
    } catch (error) {
      this.referrals.set([]);
      this.loadError.set(
        error instanceof Error
          ? error.message
          : this.t('colleagues.invites.referrals.error', 'Could not load referrals.'),
      );
    } finally {
      this.loading.set(false);
    }
  }
}
