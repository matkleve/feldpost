import { Component, computed, inject, input, output, signal } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { OrgMember } from '../../../core/members/members.types';
import type { ChatChannel } from '../../../core/chat/chat.types';
import type { ColleaguesSidebarTab } from '../page/colleagues-page.component';
import { PageRailTitleComponent } from '../../../shared/page-rail-title';
import { RailSearchFieldComponent } from '../../../shared/rail-search-field';
import { RailSelectListComponent, type RailSelectListItem } from '../../../shared/rail-select-list';

@Component({
  selector: 'app-member-list',
  standalone: true,
  imports: [PageRailTitleComponent, RailSearchFieldComponent, RailSelectListComponent],
  templateUrl: './member-list.component.html',
  styleUrl: './member-list.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-col',
  },
})
export class MemberListComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly members = input<OrgMember[]>([]);
  readonly selectedMemberId = input<string | null>(null);
  readonly channels = input<ChatChannel[]>([]);
  readonly selectedChannelId = input<string | null>(null);
  readonly loading = input(false);
  readonly activeTab = input<ColleaguesSidebarTab>('members');

  readonly tabChange = output<ColleaguesSidebarTab>();
  readonly memberSelected = output<string>();
  readonly channelSelected = output<string>();
  readonly memberMessageRequested = output<string>();

  readonly searchQuery = signal('');

  readonly filteredMembers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.members();
    return this.members().filter((member) => member.fullName.toLowerCase().includes(query));
  });

  readonly channelListItems = computed<RailSelectListItem[]>(() =>
    this.channels().map((channel) => ({
      id: channel.id,
      label: `# ${this.channelLabel(channel)}`,
      leading: { kind: 'icon', name: 'tag' },
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
      ],
    })),
  );

  channelLabel(channel: ChatChannel): string {
    if (channel.type === 'dm') {
      return this.t('colleagues.channel.dm', 'Direct message');
    }
    return channel.name ?? this.t('colleagues.channel.unnamed', 'Channel');
  }

  onMemberAction(event: { itemId: string; actionId: string }): void {
    if (event.actionId === 'message') {
      this.memberMessageRequested.emit(event.itemId);
    }
  }
}
