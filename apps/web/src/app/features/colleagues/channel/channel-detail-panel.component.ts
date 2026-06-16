import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { ChatChannel, ChatChannelMember } from '../../../core/chat/chat.types';
import type { OrgMember } from '../../../core/members/members.types';
import { RailSearchFieldComponent } from '../../../shared/rail-search-field';
import { RailSelectListComponent, type RailSelectListItem } from '../../../shared/rail-select-list';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { HLM_INPUT_IMPORTS } from '../../../shared/ui/input';

export type ChannelDetailMode = 'create' | 'view';

@Component({
  selector: 'app-channel-detail-panel',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RailSearchFieldComponent,
    RailSelectListComponent,
    ...HLM_BUTTON_IMPORTS,
    ...HLM_INPUT_IMPORTS,
  ],
  templateUrl: './channel-detail-panel.component.html',
  styleUrl: './channel-detail-panel.component.scss',
})
export class ChannelDetailPanelComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly mode = input<ChannelDetailMode>('view');
  readonly channel = input<ChatChannel | null>(null);
  readonly members = input<ChatChannelMember[]>([]);
  readonly colleagues = input<OrgMember[]>([]);
  readonly canManage = input(false);
  readonly membersLoading = input(false);

  readonly closed = output<void>();
  readonly created = output<{ name: string; type: 'public' | 'private' }>();
  readonly memberInviteRequested = output<string>();
  readonly descriptionUpdated = output<string>();
  readonly archiveRequested = output<void>();

  readonly draftName = signal('');
  readonly draftDescription = signal('');
  readonly isPrivate = signal(false);
  readonly addMemberSearch = signal('');

  constructor() {
    effect(() => {
      const channel = this.channel();
      this.draftDescription.set(channel?.description ?? '');
    });
  }

  readonly memberListItems = computed<RailSelectListItem[]>(() =>
    this.members().map((member) => ({
      id: member.userId,
      label: member.fullName || this.t('colleagues.members.unnamed', 'Unnamed'),
      secondaryLabel: member.role === 'owner' ? this.t('colleagues.channel.role_owner', 'Owner') : this.t('colleagues.channel.role_member', 'Member'),
      leading: {
        kind: 'avatar',
        text: member.fullName.charAt(0).toUpperCase() || '?',
      },
    })),
  );

  readonly inviteListItems = computed<RailSelectListItem[]>(() => {
    const memberIds = new Set(this.members().map((member) => member.userId));
    const query = this.addMemberSearch().trim().toLowerCase();
    return this.colleagues()
      .filter((colleague) => !memberIds.has(colleague.id))
      .filter((colleague) => !query || colleague.fullName.toLowerCase().includes(query))
      .map((colleague) => ({
        id: colleague.id,
        label: colleague.fullName || this.t('colleagues.members.unnamed', 'Unnamed'),
        leading: {
          kind: 'avatar' as const,
          text: colleague.fullName.charAt(0).toUpperCase() || '?',
        },
        actions: [
          {
            type: 'button' as const,
            action: {
              id: 'invite',
              icon: 'person_add',
              ariaLabel: this.t('colleagues.channel.invite_member', 'Add to channel'),
              title: this.t('colleagues.channel.invite_member', 'Add to channel'),
            },
          },
        ],
      }));
  });

  channelTypeLabel(channel: ChatChannel): string {
    if (channel.type === 'private') {
      return this.t('colleagues.channel.type_private', 'Private');
    }
    if (channel.type === 'public') {
      return this.t('colleagues.channel.type_public', 'Public');
    }
    return this.t('colleagues.channel.dm', 'Direct message');
  }

  onCreateSubmit(): void {
    const name = this.draftName().trim();
    if (!name) return;
    this.created.emit({ name, type: this.isPrivate() ? 'private' : 'public' });
    this.draftName.set('');
    this.isPrivate.set(false);
  }

  onInviteAction(event: { itemId: string; actionId: string }): void {
    if (event.actionId === 'invite') {
      this.memberInviteRequested.emit(event.itemId);
    }
  }

  onDescriptionBlur(): void {
    const channel = this.channel();
    if (!channel || !this.canManage()) return;

    const next = this.draftDescription().trim();
    const current = (channel.description ?? '').trim();
    if (next === current) return;

    this.descriptionUpdated.emit(next);
  }
}
