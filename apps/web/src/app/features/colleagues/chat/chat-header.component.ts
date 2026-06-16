import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import type { ChatChannelMember } from '../../../core/chat/chat.types';
import { I18nService } from '../../../core/i18n/i18n.service';
import { filterByToolbarDropdownSearch } from '../../../shared/dropdown-trigger/helpers/dropdown-search-filter.helpers';
import { StandardDropdownComponent } from '../../../shared/dropdown-trigger/standard/standard-dropdown.component';
import { ToolbarDropdownStackComponent } from '../../../shared/dropdown-trigger/toolbar/toolbar-dropdown-stack.component';
import { RailSearchFieldComponent } from '../../../shared/rail-search-field';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { HlmMenuItemDirective } from '../../../shared/ui/menu';
import type { ChatConversationTab, ChatDetailsRequest, ChatHeaderVariant } from './chat-header.types';

@Component({
  selector: 'app-chat-header',
  standalone: true,
  imports: [
    RailSearchFieldComponent,
    ToolbarDropdownStackComponent,
    StandardDropdownComponent,
    HlmMenuItemDirective,
    ...HLM_BUTTON_IMPORTS,
  ],
  templateUrl: './chat-header.component.html',
  styleUrl: './chat-header.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-shrink-0 flex-col',
  },
})
export class ChatHeaderComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly variant = input<ChatHeaderVariant>('empty');
  readonly title = input('');
  readonly memberCount = input(0);
  readonly channelMembers = input<ChatChannelMember[]>([]);
  readonly searchQuery = input('');

  readonly activeTab = input<ChatConversationTab>('messages');

  readonly detailsRequested = output<ChatDetailsRequest>();
  readonly searchQueryChange = output<string>();
  readonly searchSubmitted = output<void>();
  readonly tabChange = output<ChatConversationTab>();

  readonly membersDropdownOpen = signal(false);
  readonly membersDropdownAnchor = signal<HTMLElement | null>(null);
  readonly memberSearchQuery = signal('');

  readonly isChannel = computed(() => this.variant() === 'channel');
  readonly isDm = computed(() => this.variant() === 'dm');
  readonly isInteractive = computed(() => this.isChannel() || this.isDm());

  readonly titleInitials = computed(() => {
    const trimmed = this.title().trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
  });

  readonly filteredChannelMembers = computed(() =>
    filterByToolbarDropdownSearch(
      this.channelMembers(),
      this.memberSearchQuery(),
      (member) => member.fullName || this.t('colleagues.members.unnamed', 'Unnamed'),
    ),
  );

  constructor() {
    effect(() => {
      this.variant();
      this.closeMembersDropdown();
    });
  }

  onTabSelect(tab: ChatConversationTab): void {
    this.tabChange.emit(tab);
  }

  onTitleOpen(): void {
    if (this.isChannel()) {
      this.detailsRequested.emit({ kind: 'channel', channelTab: 'about' });
      return;
    }
    if (this.isDm()) {
      this.detailsRequested.emit({ kind: 'member' });
    }
  }

  onDetailsOpen(): void {
    this.onTitleOpen();
  }

  toggleMembersDropdown(event: MouseEvent): void {
    event.stopPropagation();
    if (this.membersDropdownOpen()) {
      this.closeMembersDropdown();
      return;
    }
    this.membersDropdownAnchor.set(event.currentTarget as HTMLElement);
    this.membersDropdownOpen.set(true);
    this.memberSearchQuery.set('');
  }

  closeMembersDropdown(): void {
    this.membersDropdownOpen.set(false);
    this.membersDropdownAnchor.set(null);
    this.memberSearchQuery.set('');
  }

  memberRoleLabel(member: ChatChannelMember): string {
    return member.role === 'owner'
      ? this.t('colleagues.channel.role_owner', 'Owner')
      : this.t('colleagues.channel.role_member', 'Member');
  }

  memberInitials(name: string): string {
    const trimmed = name.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
  }
}
