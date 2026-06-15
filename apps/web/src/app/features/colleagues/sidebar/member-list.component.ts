import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { OrgMember } from '../../../core/members/members.types';
import type { ChatChannel } from '../../../core/chat/chat.types';
import type { ColleaguesSidebarTab } from '../page/colleagues-page.component';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';

@Component({
  selector: 'app-member-list',
  standalone: true,
  imports: [FormsModule, ...HLM_BUTTON_IMPORTS],
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

  readonly searchQuery = signal('');

  readonly filteredMembers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.members();
    return this.members().filter((member) => member.fullName.toLowerCase().includes(query));
  });

  channelLabel(channel: ChatChannel): string {
    if (channel.type === 'dm') {
      return this.t('colleagues.channel.dm', 'Direct message');
    }
    return channel.name ?? this.t('colleagues.channel.unnamed', 'Channel');
  }
}
