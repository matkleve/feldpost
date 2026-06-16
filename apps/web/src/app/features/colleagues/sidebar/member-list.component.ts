import { Component, computed, inject, input, output, signal } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { OrgMember } from '../../../core/members/members.types';
import type { ChatChannel } from '../../../core/chat/chat.types';
import {
  MESSAGING_SIDEBAR_ACTIVITY_GROUP_ORDER,
  messagingSidebarActivityGroupKey,
  type MessagingSidebarActivityGroupKey,
} from '../logic/messaging-sidebar-activity.logic';
import { PageRailTitleComponent } from '../../../shared/page-rail-title';
import { RailSearchFieldComponent } from '../../../shared/rail-search-field';
import { RailSelectListComponent, type RailSelectListItem } from '../../../shared/rail-select-list';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';

interface MessagingSidebarTimeGroup {
  key: MessagingSidebarActivityGroupKey;
  label: string;
  items: RailSelectListItem[];
}

@Component({
  selector: 'app-member-list',
  standalone: true,
  imports: [
    PageRailTitleComponent,
    RailSearchFieldComponent,
    RailSelectListComponent,
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

  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly members = input<OrgMember[]>([]);
  readonly activeDmMemberId = input<string | null>(null);
  readonly channels = input<ChatChannel[]>([]);
  readonly selectedChannelId = input<string | null>(null);
  readonly loading = input(false);
  readonly invitesActive = input(false);
  readonly canManageChannels = input(false);

  readonly invitesToggle = output<void>();
  readonly memberSelected = output<string>();
  readonly channelSelected = output<string>();
  readonly channelCreateOpen = output<void>();
  readonly channelArchiveRequested = output<string>();

  readonly searchQuery = signal('');
  readonly channelSearchQuery = signal('');
  readonly channelsExpanded = signal(true);
  readonly channelSearchOpen = signal(false);
  readonly dmExpanded = signal(true);
  readonly dmSearchOpen = signal(false);
  readonly starredChannelIds = signal<Set<string>>(this.readStarredChannelIds());

  private static readonly STARRED_CHANNELS_STORAGE_KEY = 'feldpost.chat.starredChannels';

  readonly sidebarChannels = computed(() => this.channels().filter((channel) => channel.type !== 'dm'));

  readonly dmChannelByPeerId = computed(() => {
    const map = new Map<string, ChatChannel>();
    for (const channel of this.channels()) {
      if (channel.type === 'dm' && channel.dmPeerUserId) {
        map.set(channel.dmPeerUserId, channel);
      }
    }
    return map;
  });

  readonly filteredChannels = computed(() => {
    const query = this.channelSearchQuery().trim().toLowerCase();
    let list = this.sidebarChannels();
    if (query) {
      list = list.filter((channel) => this.channelLabel(channel).toLowerCase().includes(query));
    }
    return list;
  });

  readonly filteredMembers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.members();
    return this.members().filter((member) => member.fullName.toLowerCase().includes(query));
  });

  readonly channelListItems = computed<RailSelectListItem[]>(() => {
    const starred = this.starredChannelIds();
    return [...this.filteredChannels()]
      .sort((a, b) => {
        const aStarred = starred.has(a.id);
        const bStarred = starred.has(b.id);
        if (aStarred !== bStarred) {
          return aStarred ? -1 : 1;
        }
        return this.channelActivityAt(b).localeCompare(this.channelActivityAt(a));
      })
      .map((channel) => this.toChannelListItem(channel));
  });

  readonly dmTimeGroups = computed((): MessagingSidebarTimeGroup[] =>
    this.buildTimeGroups(
      this.filteredMembers(),
      (member) => this.memberActivityAt(member),
      (member) => this.toMemberListItem(member),
    ),
  );

  channelLabel(channel: ChatChannel): string {
    if (channel.type === 'dm') {
      return this.t('colleagues.channel.dm', 'Direct message');
    }
    return channel.name ?? this.t('colleagues.channel.unnamed', 'Channel');
  }

  activityGroupLabel(key: MessagingSidebarActivityGroupKey): string {
    switch (key) {
      case 'today':
        return this.t('colleagues.sidebar.group.today', 'Today');
      case 'yesterday':
        return this.t('colleagues.sidebar.group.yesterday', 'Yesterday');
      case 'lastWeek':
        return this.t('colleagues.sidebar.group.lastWeek', 'Last week');
      case 'lastMonth':
        return this.t('colleagues.sidebar.group.lastMonth', 'Last month');
      case 'older':
        return this.t('colleagues.sidebar.group.older', 'Older');
    }
  }

  onMemberSelected(memberId: string): void {
    this.memberSelected.emit(memberId);
  }

  onChannelAction(event: { itemId: string; actionId: string }): void {
    if (event.actionId === 'star') {
      this.toggleChannelStar(event.itemId);
      return;
    }
    if (event.actionId === 'archive') {
      this.channelArchiveRequested.emit(event.itemId);
    }
  }

  openCreateChannel(): void {
    this.channelCreateOpen.emit();
  }

  toggleChannelSearch(event: Event): void {
    event.stopPropagation();
    this.channelSearchOpen.update((open) => !open);
  }

  toggleDmSearch(event: Event): void {
    event.stopPropagation();
    this.dmSearchOpen.update((open) => !open);
  }

  onInvitesClick(): void {
    this.invitesToggle.emit();
  }

  private channelActivityAt(channel: ChatChannel): string {
    return channel.lastActivityAt ?? channel.updatedAt ?? channel.createdAt;
  }

  private memberActivityAt(member: OrgMember): string {
    const dm = this.dmChannelByPeerId().get(member.id);
    if (dm) {
      return dm.lastActivityAt ?? dm.updatedAt ?? dm.createdAt;
    }
    return member.createdAt;
  }

  private buildTimeGroups<T>(
    entries: T[],
    activityAt: (entry: T) => string,
    toItem: (entry: T) => RailSelectListItem,
  ): MessagingSidebarTimeGroup[] {
    const buckets = new Map<MessagingSidebarActivityGroupKey, T[]>();

    for (const entry of entries) {
      const key = messagingSidebarActivityGroupKey(activityAt(entry));
      const list = buckets.get(key) ?? [];
      list.push(entry);
      buckets.set(key, list);
    }

    return MESSAGING_SIDEBAR_ACTIVITY_GROUP_ORDER.flatMap((key) => {
      const groupEntries = buckets.get(key);
      if (!groupEntries?.length) {
        return [];
      }

      const items = [...groupEntries]
        .sort((a, b) => activityAt(b).localeCompare(activityAt(a)))
        .map((entry) => toItem(entry));

      return [{ key, label: this.activityGroupLabel(key), items }];
    });
  }

  private toChannelListItem(channel: ChatChannel): RailSelectListItem {
    const starred = this.starredChannelIds();
    const isStarred = starred.has(channel.id);
    const actions: RailSelectListItem['actions'] = [
      {
        type: 'button',
        action: {
          id: 'star',
          icon: isStarred ? 'star' : 'star_border',
          alwaysVisible: isStarred,
          active: isStarred,
          ariaLabel: isStarred
            ? this.t('colleagues.channel.unstar', 'Remove from favorites')
            : this.t('colleagues.channel.star', 'Add to favorites'),
          title: isStarred
            ? this.t('colleagues.channel.unstar', 'Remove from favorites')
            : this.t('colleagues.channel.star', 'Add to favorites'),
        },
      },
    ];

    if (this.canManageChannels()) {
      actions.push({
        type: 'button',
        action: {
          id: 'archive',
          icon: 'archive',
          ariaLabel: this.t('colleagues.channel.archive', 'Archive channel'),
          title: this.t('colleagues.channel.archive', 'Archive channel'),
        },
      });
    }

    return {
      id: channel.id,
      label: this.channelLabel(channel),
      badge: channel.unreadCount,
      leading: { kind: 'icon', name: channel.type === 'private' ? 'lock' : 'tag' },
      actions,
    };
  }

  private toMemberListItem(member: OrgMember): RailSelectListItem {
    return {
      id: member.id,
      label: member.fullName || this.t('colleagues.members.unnamed', 'Unnamed'),
      leading: {
        kind: 'avatar' as const,
        text: member.fullName.charAt(0).toUpperCase() || '?',
        online: member.isOnline,
      },
    };
  }

  private toggleChannelStar(channelId: string): void {
    this.starredChannelIds.update((current) => {
      const next = new Set(current);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      this.persistStarredChannelIds(next);
      return next;
    });
  }

  private readStarredChannelIds(): Set<string> {
    try {
      const raw = localStorage.getItem(MemberListComponent.STARRED_CHANNELS_STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.filter((id): id is string => typeof id === 'string'));
    } catch {
      return new Set();
    }
  }

  private persistStarredChannelIds(ids: Set<string>): void {
    localStorage.setItem(
      MemberListComponent.STARRED_CHANNELS_STORAGE_KEY,
      JSON.stringify([...ids]),
    );
  }
}
