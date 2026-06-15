import { Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { OrgMember } from '../../../core/members/members.types';
import type { ChatChannel } from '../../../core/chat/chat.types';
import type { ColleaguesSidebarTab } from '../page/colleagues-page.component';
import { ChannelCreateDialogComponent } from '../channel/channel-create-dialog.component';
import { PageRailTitleComponent } from '../../../shared/page-rail-title';
import { RailSearchFieldComponent } from '../../../shared/rail-search-field';
import { RailSelectListComponent, type RailSelectListItem } from '../../../shared/rail-select-list';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';

@Component({
  selector: 'app-member-list',
  standalone: true,
  imports: [
    PageRailTitleComponent,
    RailSearchFieldComponent,
    RailSelectListComponent,
    ChannelCreateDialogComponent,
    ...HLM_BUTTON_IMPORTS,
  ],
  templateUrl: './member-list.component.html',
  styleUrl: './member-list.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-col',
  },
})
export class MemberListComponent {
  private readonly i18nService = inject(I18nService);
  private readonly channelDialog = viewChild(ChannelCreateDialogComponent);

  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly members = input<OrgMember[]>([]);
  readonly selectedMemberId = input<string | null>(null);
  readonly channels = input<ChatChannel[]>([]);
  readonly selectedChannelId = input<string | null>(null);
  readonly loading = input(false);
  readonly activeTab = input<ColleaguesSidebarTab>('members');
  readonly canManageChannels = input(false);

  readonly tabChange = output<ColleaguesSidebarTab>();
  readonly memberSelected = output<string>();
  readonly channelSelected = output<string>();
  readonly memberMessageRequested = output<string>();
  readonly channelCreateRequested = output<{ name: string; type: 'public' | 'private' }>();
  readonly channelArchiveRequested = output<string>();
  readonly channelMemberInviteRequested = output<{ channelId: string; userId: string }>();

  readonly searchQuery = signal('');
  readonly inviteMemberId = signal<string | null>(null);

  readonly filteredMembers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.members();
    return this.members().filter((member) => member.fullName.toLowerCase().includes(query));
  });

  readonly channelListItems = computed<RailSelectListItem[]>(() =>
    this.channels().map((channel) => ({
      id: channel.id,
      label: `# ${this.channelLabel(channel)}`,
      badge: channel.unreadCount,
      leading: { kind: 'icon', name: channel.type === 'private' ? 'lock' : 'tag' },
      actions: this.canManageChannels()
        ? [
            {
              type: 'confirm' as const,
              action: {
                id: 'archive',
                idleIcon: 'archive',
                armedIcon: 'check',
                initialAriaKey: 'colleagues.channel.archive',
                initialAriaFallback: 'Archive channel',
                tone: 'danger' as const,
              },
            },
          ]
        : undefined,
    })),
  );

  readonly memberListItems = computed<RailSelectListItem[]>(() =>
    this.filteredMembers().map((member) => ({
      id: member.id,
      label: member.fullName || this.t('colleagues.members.unnamed', 'Unnamed'),
      secondaryLabel: member.roleDisplayName,
      secondaryColor: member.roleColor,
      leading: {
        kind: 'avatar',
        text: member.fullName.charAt(0).toUpperCase() || '?',
        online: member.isOnline,
      },
      actions: [
        {
          type: 'button',
          action: {
            id: 'message',
            icon: 'chat',
            ariaLabel: this.t('colleagues.member.message', 'Message'),
            title: this.t('colleagues.member.message', 'Message'),
          },
        },
        ...(this.selectedChannel()?.type === 'private' && this.canManageChannels()
          ? [
              {
                type: 'button' as const,
                action: {
                  id: 'invite',
                  icon: 'person_add',
                  ariaLabel: this.t('colleagues.channel.invite_member', 'Invite to channel'),
                  title: this.t('colleagues.channel.invite_member', 'Invite to channel'),
                },
              },
            ]
          : []),
      ],
    })),
  );

  readonly selectedChannel = computed(() => {
    const id = this.selectedChannelId();
    if (!id) return null;
    return this.channels().find((channel) => channel.id === id) ?? null;
  });

  channelLabel(channel: ChatChannel): string {
    if (channel.type === 'dm') {
      return this.t('colleagues.channel.dm', 'Direct message');
    }
    return channel.name ?? this.t('colleagues.channel.unnamed', 'Channel');
  }

  onMemberAction(event: { itemId: string; actionId: string }): void {
    if (event.actionId === 'message') {
      this.memberMessageRequested.emit(event.itemId);
      return;
    }
    if (event.actionId === 'invite') {
      const channelId = this.selectedChannelId();
      if (channelId) {
        this.channelMemberInviteRequested.emit({ channelId, userId: event.itemId });
      }
    }
  }

  onChannelAction(event: { itemId: string; actionId: string }): void {
    if (event.actionId === 'archive') {
      this.channelArchiveRequested.emit(event.itemId);
    }
  }

  openCreateChannelDialog(): void {
    this.channelDialog()?.show();
  }

  onChannelCreateConfirmed(payload: { name: string; type: 'public' | 'private' }): void {
    this.channelCreateRequested.emit(payload);
  }
}
