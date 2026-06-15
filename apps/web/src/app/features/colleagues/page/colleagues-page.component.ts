import { Component, computed, DestroyRef, inject, OnDestroy, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MemberService } from '../../../core/members/members.service';
import type { OrgMember } from '../../../core/members/members.types';
import { ChatService } from '../../../core/chat/chat.service';
import type { ChatChannel } from '../../../core/chat/chat.types';
import { RoleService } from '../../../core/roles/roles.service';
import type { OrgRole } from '../../../core/roles/roles.types';
import { PageGridComponent } from '../../../shared/page-grid';
import { MemberListComponent } from '../sidebar/member-list.component';
import { ChatAreaComponent } from '../chat/chat-area.component';
import { MemberDetailPanelComponent } from '../member-detail/member-detail-panel.component';
import { ColleaguesInvitesPanelComponent } from '../invites/colleagues-invites-panel.component';

export type ColleaguesSidebarTab = 'members' | 'invites';

@Component({
  selector: 'app-colleagues-page',
  standalone: true,
  imports: [
    PageGridComponent,
    MemberListComponent,
    ChatAreaComponent,
    MemberDetailPanelComponent,
    ColleaguesInvitesPanelComponent,
  ],
  templateUrl: './colleagues-page.component.html',
  styleUrl: './colleagues-page.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-1 flex-col',
  },
})
export class ColleaguesPageComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18nService = inject(I18nService);
  private readonly memberService = inject(MemberService);
  readonly chatService = inject(ChatService);
  private readonly roleService = inject(RoleService);

  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly sidebarTab = computed<ColleaguesSidebarTab>(() => {
    const url = this.currentUrl();
    return url.includes('tab=invites') ? 'invites' : 'members';
  });

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly members = signal<OrgMember[]>([]);
  readonly roles = signal<OrgRole[]>([]);
  readonly channels = signal<ChatChannel[]>([]);
  readonly selectedMemberId = signal<string | null>(null);
  readonly selectedChannelId = signal<string | null>(null);
  readonly onlineUserIds = signal<Set<string>>(new Set());
  readonly ownRoleLevel = signal(0);

  readonly selectedMember = computed(() => {
    const id = this.selectedMemberId();
    if (!id) return null;
    return this.members().find((member) => member.id === id) ?? null;
  });

  readonly selectedChannel = computed(() => {
    const id = this.selectedChannelId();
    if (!id) return null;
    return this.channels().find((channel) => channel.id === id) ?? null;
  });

  readonly membersWithPresence = computed(() =>
    this.members().map((member) => ({
      ...member,
      isOnline: this.onlineUserIds().has(member.id),
    })),
  );

  readonly detailPanelOpen = computed(() => !!this.selectedMemberId());

  constructor() {
    void this.refresh();

    this.destroyRef.onDestroy(() => {
      this.chatService.unsubscribe();
    });
  }

  ngOnDestroy(): void {
    this.chatService.unsubscribe();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    const [membersResult, rolesResult, channelsResult, level] = await Promise.all([
      this.memberService.loadMembers(),
      this.roleService.loadRoles(),
      this.chatService.loadChannels(),
      this.roleService.getOwnRoleLevel(),
    ]);

    if (membersResult.error || rolesResult.error || channelsResult.error) {
      this.loadError.set(
        membersResult.error?.message ??
          rolesResult.error?.message ??
          channelsResult.error?.message ??
          'Could not load colleagues.',
      );
      this.loading.set(false);
      return;
    }

    this.members.set(membersResult.data);
    this.roles.set(rolesResult.data);
    this.channels.set(channelsResult.data);
    this.ownRoleLevel.set(level);

    const defaultChannel = channelsResult.data.find((c) => c.name === 'general') ?? channelsResult.data[0];
    if (defaultChannel && !this.selectedChannelId()) {
      this.selectedChannelId.set(defaultChannel.id);
      await this.selectChannel(defaultChannel.id);
    }

    this.loading.set(false);
  }

  onTabChange(tab: ColleaguesSidebarTab): void {
    void this.router.navigate(['/colleagues'], { queryParams: tab === 'invites' ? { tab: 'invites' } : {} });
  }

  onMemberSelected(memberId: string): void {
    this.selectedMemberId.set(memberId);
  }

  onMemberPanelClosed(): void {
    this.selectedMemberId.set(null);
  }

  async onChannelSelected(channelId: string): Promise<void> {
    await this.selectChannel(channelId);
  }

  async onMessageMember(memberId: string): Promise<void> {
    const result = await this.chatService.findOrCreateDm(memberId);
    if (result.data) {
      this.channels.update((channels) => {
        if (channels.some((c) => c.id === result.data!.id)) return channels;
        return [...channels, result.data!];
      });
      await this.selectChannel(result.data.id);
      this.selectedMemberId.set(memberId);
    }
  }

  async onMemberUpdated(): Promise<void> {
    await this.refresh();
  }

  private async selectChannel(channelId: string): Promise<void> {
    this.selectedChannelId.set(channelId);
    this.chatService.subscribeToChannel(channelId);
    await this.chatService.loadMessages(channelId);
    await this.chatService.markChannelRead(channelId);

    const presenceChannel = this.chatService.subscribePresence(channelId, (online) => {
      this.onlineUserIds.set(online);
    });

    presenceChannel.on('presence', { event: 'leave' }, () => {
      // sync handled by subscribePresence callback
    });
  }
}
