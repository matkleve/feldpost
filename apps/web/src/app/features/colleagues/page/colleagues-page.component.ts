import { Component, computed, DestroyRef, inject, OnDestroy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MemberService } from '../../../core/members/members.service';
import type { OrgMember } from '../../../core/members/members.types';
import { ChatService } from '../../../core/chat/chat.service';
import type { ChatChannel, ChatChannelMember } from '../../../core/chat/chat.types';
import { RoleService } from '../../../core/roles/roles.service';
import type { OrgRole } from '../../../core/roles/roles.types';
import { ToastService } from '../../../core/toast/toast.service';
import { PageGridComponent } from '../../../shared/page-grid';
import { MemberListComponent } from '../sidebar/member-list.component';
import { ChatAreaComponent } from '../chat/chat-area.component';
import { MemberDetailPanelComponent } from '../member-detail/member-detail-panel.component';
import { ChannelDetailPanelComponent } from '../channel/channel-detail-panel.component';
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
    ChannelDetailPanelComponent,
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
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);

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
  readonly creatingChannel = signal(false);
  readonly channelDetailDismissed = signal(false);
  readonly channelMembers = signal<ChatChannelMember[]>([]);
  readonly channelMembersLoading = signal(false);
  readonly onlineUserIds = signal<Set<string>>(new Set());
  readonly ownRoleLevel = signal(0);
  readonly canManageChannels = signal(false);
  readonly canDeleteAnyMessage = signal(false);
  private presenceChannel: RealtimeChannel | null = null;

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

  readonly showChannelDetail = computed(() => {
    const channel = this.selectedChannel();
    return !!channel && channel.type !== 'dm' && !this.creatingChannel() && !this.channelDetailDismissed();
  });

  readonly membersWithPresence = computed(() =>
    this.members().map((member) => ({
      ...member,
      isOnline: this.onlineUserIds().has(member.id),
    })),
  );

  readonly chatHeaderTitle = computed(() => {
    const channel = this.selectedChannel();
    if (!channel) {
      return this.t('colleagues.chat.no_channel', 'Select a channel');
    }

    if (channel.type === 'dm') {
      const selected = this.selectedMember();
      if (selected?.fullName) {
        return selected.fullName;
      }

      const ownId = this.authService.user()?.id;
      const otherMember = this.channelMembers().find((member) => member.userId !== ownId);
      if (otherMember?.fullName) {
        return otherMember.fullName;
      }

      return this.t('colleagues.chat.dm', 'Direct message');
    }

    return channel.name ?? this.t('colleagues.channel.unnamed', 'Channel');
  });

  constructor() {
    void this.refresh();

    this.destroyRef.onDestroy(() => {
      this.teardownPresence();
      this.chatService.unsubscribe();
    });
  }

  ngOnDestroy(): void {
    this.teardownPresence();
    this.chatService.unsubscribe();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    const [membersResult, rolesResult, level] = await Promise.all([
      this.memberService.loadMembers(),
      this.roleService.loadRoles(),
      this.roleService.getOwnRoleLevel(),
    ]);

    if (membersResult.error || rolesResult.error) {
      const detail = membersResult.error?.message ?? rolesResult.error?.message ?? '';
      this.loadError.set(detail || this.t('colleagues.page.error.title', 'Could not load colleagues'));
      this.toastService.show({
        type: 'error',
        message: this.t('colleagues.page.error.members', 'Could not load team members.'),
        detail,
        dedupe: true,
      });
      this.loading.set(false);
      return;
    }

    this.members.set(membersResult.data);
    this.roles.set(rolesResult.data);
    this.ownRoleLevel.set(level);

    if (membersResult.data.length > 0) {
      const currentId = this.selectedMemberId();
      const stillExists = currentId && membersResult.data.some((member) => member.id === currentId);
      if (!stillExists && !this.creatingChannel() && !this.showChannelDetail()) {
        this.selectedMemberId.set(membersResult.data[0].id);
      }
    }

    this.loading.set(false);

    await this.refreshChat();
  }

  private async refreshChat(): Promise<void> {
    const [channelsResult, canManage, canDeleteAny] = await Promise.all([
      this.chatService.loadChannels(),
      this.roleService.hasPermission('chat.channels.manage'),
      this.roleService.hasPermission('chat.messages.delete_any'),
    ]);

    this.canManageChannels.set(canManage);
    this.canDeleteAnyMessage.set(canDeleteAny);

    if (channelsResult.error) {
      this.toastService.show({
        type: 'error',
        message: this.t('colleagues.page.error.chat', 'Chat is temporarily unavailable.'),
        detail: channelsResult.error.message,
        dedupe: true,
      });
      return;
    }

    this.channels.set(channelsResult.data);

    const defaultChannel = channelsResult.data.find((c) => c.name === 'general') ?? channelsResult.data[0];
    if (defaultChannel && !this.selectedChannelId()) {
      this.selectedChannelId.set(defaultChannel.id);
      await this.selectChannel(defaultChannel.id);
    }
  }

  onTabChange(tab: ColleaguesSidebarTab): void {
    void this.router.navigate(['/colleagues'], { queryParams: tab === 'invites' ? { tab: 'invites' } : {} });
  }

  onMemberSelected(memberId: string): void {
    this.creatingChannel.set(false);
    this.channelDetailDismissed.set(true);
    void this.openDirectMessage(memberId);
  }

  onMemberPanelClosed(): void {
    this.selectedMemberId.set(null);
  }

  onChannelCreateOpen(): void {
    this.creatingChannel.set(true);
    this.channelDetailDismissed.set(false);
    this.selectedMemberId.set(null);
  }

  onChannelPanelClosed(): void {
    if (this.creatingChannel()) {
      this.creatingChannel.set(false);
      return;
    }
    this.channelDetailDismissed.set(true);
  }

  async onChannelSelected(channelId: string): Promise<void> {
    this.creatingChannel.set(false);
    this.channelDetailDismissed.set(false);
    this.selectedMemberId.set(null);
    await this.selectChannel(channelId);
  }

  async onMessageMember(memberId: string): Promise<void> {
    await this.openDirectMessage(memberId);
  }

  private async openDirectMessage(memberId: string): Promise<void> {
    this.selectedMemberId.set(memberId);
    const result = await this.chatService.findOrCreateDm(memberId);
    if (result.error) {
      this.toastService.show({
        type: 'error',
        message: this.t('colleagues.chat.error.open_dm', 'Could not open direct message.'),
        detail: result.error.message,
      });
      return;
    }
    if (result.data) {
      this.channels.update((channels) => {
        if (channels.some((c) => c.id === result.data!.id)) return channels;
        return [...channels, result.data!];
      });
      await this.selectChannel(result.data.id);
    }
  }

  async onMemberUpdated(): Promise<void> {
    await this.refresh();
  }

  async onChannelCreate(payload: { name: string; type: 'public' | 'private' }): Promise<void> {
    const result = await this.chatService.createChannel(payload.name, payload.type);
    if (result.error) {
      this.toastService.show({
        type: 'error',
        message: this.t('colleagues.chat.error.create_channel', 'Could not create channel.'),
        detail: result.error.message,
      });
      return;
    }
    if (result.data) {
      this.channels.update((list) => [...list, result.data!]);
      this.creatingChannel.set(false);
      this.channelDetailDismissed.set(false);
      await this.selectChannel(result.data.id);
      this.toastService.show({
        type: 'success',
        message: this.t('colleagues.chat.toast.channel_created', 'Channel created.'),
      });
    }
  }

  async onChannelArchive(channelId: string): Promise<void> {
    const result = await this.chatService.archiveChannel(channelId);
    if (result.error) {
      this.toastService.show({
        type: 'error',
        message: this.t('colleagues.chat.error.archive_channel', 'Could not archive channel.'),
        detail: result.error.message,
      });
      return;
    }
    this.channels.update((list) => list.filter((channel) => channel.id !== channelId));
    if (this.selectedChannelId() === channelId) {
      const next = this.channels()[0];
      if (next) {
        await this.selectChannel(next.id);
      } else {
        this.selectedChannelId.set(null);
        this.channelMembers.set([]);
      }
    }
    this.toastService.show({
      type: 'success',
      message: this.t('colleagues.chat.toast.channel_archived', 'Channel archived.'),
    });
  }

  async onChannelDetailArchive(): Promise<void> {
    const channelId = this.selectedChannelId();
    if (channelId) {
      await this.onChannelArchive(channelId);
    }
  }

  async onChannelMemberInviteFromPanel(userId: string): Promise<void> {
    const channelId = this.selectedChannelId();
    if (!channelId) return;
    await this.onChannelMemberInvite({ channelId, userId });
    await this.loadChannelMembers(channelId);
  }

  async onChannelMemberInvite(payload: { channelId: string; userId: string }): Promise<void> {
    const result = await this.chatService.addChannelMember(payload.channelId, payload.userId);
    if (result.error) {
      this.toastService.show({
        type: 'error',
        message: this.t('colleagues.chat.error.invite_member', 'Could not invite member.'),
        detail: result.error.message,
      });
      return;
    }
    this.toastService.show({
      type: 'success',
      message: this.t('colleagues.chat.toast.member_invited', 'Member invited to channel.'),
    });
    await this.loadChannelMembers(payload.channelId);
  }

  async onMessageEdited(payload: { messageId: string; content: string }): Promise<void> {
    const result = await this.chatService.editMessage(payload.messageId, payload.content);
    if (result.error) {
      this.toastService.show({
        type: 'error',
        message: this.t('colleagues.chat.error.edit', 'Could not edit message.'),
        detail: result.error.message,
      });
    }
  }

  async onMessageDeleted(messageId: string): Promise<void> {
    const result = await this.chatService.deleteMessage(messageId);
    if (result.error) {
      this.toastService.show({
        type: 'error',
        message: this.t('colleagues.chat.error.delete', 'Could not delete message.'),
        detail: result.error.message,
      });
    }
  }

  async onReactionToggled(payload: { messageId: string; emoji: string }): Promise<void> {
    const result = await this.chatService.toggleReaction(payload.messageId, payload.emoji);
    if (result.error) {
      this.toastService.show({
        type: 'error',
        message: this.t('colleagues.chat.error.reaction', 'Could not update reaction.'),
        detail: result.error.message,
      });
    }
  }

  private async selectChannel(channelId: string): Promise<void> {
    this.selectedChannelId.set(channelId);
    this.teardownPresence();
    this.chatService.subscribeToChannel(channelId);
    await this.chatService.loadMessages(channelId);
    await this.chatService.markChannelRead(channelId);

    this.channels.update((list) =>
      list.map((ch) => (ch.id === channelId ? { ...ch, unreadCount: 0 } : ch)),
    );

    const channel = this.channels().find((c) => c.id === channelId);
    if (channel) {
      await this.loadChannelMembers(channelId);
    } else {
      this.channelMembers.set([]);
    }

    this.presenceChannel = this.chatService.subscribePresence(channelId, (online) => {
      this.onlineUserIds.set(online);
    });
  }

  private async loadChannelMembers(channelId: string): Promise<void> {
    this.channelMembersLoading.set(true);
    const result = await this.chatService.loadChannelMembers(channelId);
    this.channelMembersLoading.set(false);
    if (result.error) {
      this.toastService.show({
        type: 'error',
        message: this.t('colleagues.chat.error.load_members', 'Could not load channel members.'),
        detail: result.error.message,
      });
      return;
    }
    this.channelMembers.set(result.data);
  }

  private teardownPresence(): void {
    if (this.presenceChannel) {
      void this.chatService.removeChannel(this.presenceChannel);
      this.presenceChannel = null;
    }
    this.onlineUserIds.set(new Set());
  }
}
