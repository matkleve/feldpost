import { Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { deriveReusableStatus } from '../../../core/invites/invites.helpers';
import type { ReusableInviteViewModel } from '../../../core/invites/invites.types';
import {
  RailSelectListComponent,
  type RailSelectListItem,
} from '../../../shared/rail-select-list';

@Component({
  selector: 'app-colleagues-invite-reusable-links-panel',
  standalone: true,
  imports: [RailSelectListComponent],
  templateUrl: './colleagues-invite-reusable-links-panel.component.html',
  styleUrl: './colleagues-invite-reusable-links-panel.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-col',
  },
})
export class ColleaguesInviteReusableLinksPanelComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly reusables = input<ReusableInviteViewModel[]>([]);
  readonly selectedId = input<string | null>(null);
  readonly loading = input(false);

  readonly itemSelected = output<string>();
  readonly actionTriggered = output<{ itemId: string; actionId: string }>();

  readonly activeItems = computed(() =>
    this.reusables()
      .filter((row) => new Date(row.expiresAt).getTime() > Date.now())
      .map((row) => this.toListItem(row, true)),
  );

  readonly expiredItems = computed(() =>
    this.reusables()
      .filter((row) => new Date(row.expiresAt).getTime() <= Date.now())
      .map((row) => this.toListItem(row, false)),
  );

  onItemSelected(itemId: string): void {
    this.itemSelected.emit(itemId);
  }

  onAction(event: { itemId: string; actionId: string }): void {
    this.actionTriggered.emit(event);
  }

  private toListItem(row: ReusableInviteViewModel, isActiveSection: boolean): RailSelectListItem {
    const status = deriveReusableStatus({
      status: row.status,
      valid_from: row.validFrom,
      expires_at: row.expiresAt,
    });

    const statusText = this.statusLabel(status);
    const until = this.t('colleagues.invites.links.until', 'Until {date}').replace(
      '{date}',
      new Date(row.expiresAt).toLocaleDateString(),
    );

    const actions: RailSelectListItem['actions'] = [
      {
        type: 'button',
        action: {
          id: 'copy',
          icon: 'content_copy',
          ariaLabel: this.t('colleagues.invites.links.action.copy', 'Copy link'),
          title: this.t('colleagues.invites.links.action.copy', 'Copy link'),
        },
      },
    ];

    if (isActiveSection) {
      actions.push({
        type: 'button',
        action: {
          id: 'pause',
          icon: status === 'paused' ? 'play_arrow' : 'pause',
          ariaLabel:
            status === 'paused'
              ? this.t('colleagues.invites.links.action.resume', 'Resume link')
              : this.t('colleagues.invites.links.action.pause', 'Pause link'),
          title:
            status === 'paused'
              ? this.t('colleagues.invites.links.action.resume', 'Resume link')
              : this.t('colleagues.invites.links.action.pause', 'Pause link'),
          active: status === 'paused',
        },
      });
    } else {
      actions.push({
        type: 'button',
        action: {
          id: 'reuse',
          icon: 'replay',
          ariaLabel: this.t('colleagues.invites.links.action.reuse', 'Reuse link'),
          title: this.t('colleagues.invites.links.action.reuse', 'Reuse link'),
        },
      });
    }

    return {
      id: row.inviteId,
      label: row.displayName,
      secondaryLabel: `${until} · ${statusText}`,
      leading: { kind: 'icon', name: 'link' },
      actions,
    };
  }

  private statusLabel(status: ReturnType<typeof deriveReusableStatus>): string {
    switch (status) {
      case 'active':
        return this.t('colleagues.invites.status.active', 'Active');
      case 'scheduled':
        return this.t('colleagues.invites.status.scheduled', 'Scheduled');
      case 'paused':
        return this.t('colleagues.invites.status.paused', 'Paused');
      case 'expired':
        return this.t('colleagues.invites.status.expired', 'Expired');
    }
  }
}
