import { Component, inject, OnInit, output, signal } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { InvitesService } from '../../../core/invites/invites.service';
import { deriveReusableStatus } from '../../../core/invites/invites.helpers';
import type {
  CreateReusableInvitePayload,
  InviteEditorMode,
  InviteTargetRole,
  QrInviteViewModel,
  ReusableInviteEditDraft,
  ReusableInviteViewModel,
  UpdateReusableInvitePayload,
} from '../../../core/invites/invites.types';
import { ToastService } from '../../../core/toast/toast.service';
import { ColleaguesInviteReusableLinksPanelComponent } from './colleagues-invite-reusable-links-panel.component';
import { InviteEditorPanelComponent } from './invite-editor-panel/invite-editor-panel.component';

@Component({
  selector: 'app-colleagues-invites-workspace',
  standalone: true,
  imports: [InviteEditorPanelComponent, ColleaguesInviteReusableLinksPanelComponent],
  templateUrl: './colleagues-invites-workspace.component.html',
  styleUrl: './colleagues-invites-workspace.component.scss',
  host: {
    class: 'flex min-h-0 min-w-0 flex-1 flex-col',
  },
})
export class ColleaguesInvitesWorkspaceComponent implements OnInit {
  private readonly invitesService = inject(InvitesService);
  private readonly toastService = inject(ToastService);
  private readonly i18nService = inject(I18nService);

  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly referralsRefresh = output<void>();

  readonly column1Mode = signal<InviteEditorMode>('quickDraft');
  readonly selectedReusableId = signal<string | null>(null);
  readonly validityFocus = signal(false);
  readonly activeOneShot = signal<QrInviteViewModel | null>(null);
  readonly stashedOneShot = signal<QrInviteViewModel | null>(null);
  readonly editDraft = signal<ReusableInviteEditDraft | null>(null);
  readonly reusables = signal<ReusableInviteViewModel[]>([]);
  readonly linksLoading = signal(true);
  readonly saveInFlight = signal(false);
  readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    void this.initialize();
  }

  async onRoleRegenerated(invite: QrInviteViewModel): Promise<void> {
    if (this.column1Mode() === 'quickDraft') {
      this.activeOneShot.set(invite);
    } else if (this.editDraft()) {
      this.editDraft.update((draft) =>
        draft
          ? {
              ...draft,
              targetRole: invite.targetRole,
              inviteUrl: invite.inviteUrl,
              qrPayload: invite.qrPayload,
            }
          : null,
      );
    }
  }

  async onSaveAsReusable(payload: CreateReusableInvitePayload): Promise<void> {
    this.saveInFlight.set(true);
    this.loadError.set(null);

    try {
      await this.invitesService.createReusableInvite(payload);
      await this.refreshReusables();
      this.toastService.show({
        type: 'success',
        message: this.t('colleagues.invites.toast.savedReusable', 'Reusable link created.'),
      });
      this.referralsRefresh.emit();
    } catch (error) {
      this.loadError.set(error instanceof Error ? error.message : 'Could not save reusable link.');
    } finally {
      this.saveInFlight.set(false);
    }
  }

  async onSaveReusable(payload: UpdateReusableInvitePayload): Promise<void> {
    const inviteId = this.selectedReusableId();
    if (!inviteId) {
      return;
    }

    this.saveInFlight.set(true);
    this.loadError.set(null);

    try {
      const draft = this.editDraft();
      if (draft && draft.targetRole !== draft.previousTargetRole) {
        await this.invitesService.regenerateInvite(inviteId, payload.targetRole);
      }

      const updated = await this.invitesService.updateReusableInvite(inviteId, payload);
      this.editDraft.set(this.toEditDraft(updated));
      await this.refreshReusables();
      this.toastService.show({
        type: 'success',
        message: this.t('colleagues.invites.toast.saved', 'Invite link updated.'),
      });
      this.referralsRefresh.emit();
    } catch (error) {
      this.loadError.set(error instanceof Error ? error.message : 'Could not save invite link.');
    } finally {
      this.saveInFlight.set(false);
    }
  }

  onEditDraftChange(draft: ReusableInviteEditDraft): void {
    this.editDraft.set(draft);
  }

  async onCancelEdit(): Promise<void> {
    this.column1Mode.set('quickDraft');
    this.selectedReusableId.set(null);
    this.editDraft.set(null);
    this.validityFocus.set(false);

    const stashed = this.stashedOneShot();
    if (stashed) {
      this.activeOneShot.set(stashed);
      this.stashedOneShot.set(null);
      return;
    }

    await this.createQuickDraft('worker');
  }

  async onReusableSelected(inviteId: string, focusValidity = false): Promise<void> {
    const row = this.reusables().find((item) => item.inviteId === inviteId);
    if (!row) {
      return;
    }

    if (this.column1Mode() === 'quickDraft' && this.activeOneShot()) {
      this.stashedOneShot.set(this.activeOneShot());
    }

    this.selectedReusableId.set(inviteId);
    this.column1Mode.set('editReusable');
    this.editDraft.set(this.toEditDraft(row));
    this.validityFocus.set(focusValidity);
  }

  async onListAction(event: { itemId: string; actionId: string }): Promise<void> {
    const row = this.reusables().find((item) => item.inviteId === event.itemId);
    if (!row) {
      return;
    }

    switch (event.actionId) {
      case 'copy':
        await navigator.clipboard.writeText(row.inviteUrl);
        await this.invitesService.logShareEvent(row.inviteId, 'copy-link');
        this.toastService.show({
          type: 'success',
          message: this.t('colleagues.invites.toast.copied', 'Invite link copied.'),
        });
        break;
      case 'pause': {
        const paused = row.status !== 'revoked';
        const updated = await this.invitesService.setReusablePaused(row.inviteId, paused);
        if (this.selectedReusableId() === row.inviteId) {
          this.editDraft.set(this.toEditDraft(updated));
        }
        await this.refreshReusables();
        break;
      }
      case 'reuse':
        await this.onReusableSelected(event.itemId, true);
        break;
    }
  }

  private async initialize(): Promise<void> {
    this.linksLoading.set(true);
    this.loadError.set(null);

    try {
      await Promise.all([this.createQuickDraft('worker'), this.refreshReusables()]);
    } catch (error) {
      this.loadError.set(
        error instanceof Error
          ? error.message
          : this.t('colleagues.invites.error.load', 'Could not load invites workspace.'),
      );
    } finally {
      this.linksLoading.set(false);
    }
  }

  private async createQuickDraft(targetRole: InviteTargetRole): Promise<void> {
    const invite = await this.invitesService.createInviteDraft(targetRole);
    this.activeOneShot.set(invite);
  }

  private async refreshReusables(): Promise<void> {
    const rows = await this.invitesService.listReusableInvites();
    this.reusables.set(rows);

    const selectedId = this.selectedReusableId();
    if (selectedId) {
      const updated = rows.find((row) => row.inviteId === selectedId);
      if (updated) {
        this.editDraft.set(this.toEditDraft(updated));
      }
    }
  }

  private toEditDraft(row: ReusableInviteViewModel): ReusableInviteEditDraft {
    return {
      inviteId: row.inviteId,
      displayName: row.displayName,
      targetRole: row.targetRole,
      validFrom: row.validFrom,
      expiresAt: row.expiresAt,
      paused: row.status === 'revoked',
      inviteUrl: row.inviteUrl,
      qrPayload: row.qrPayload,
      status: row.status,
      derivedStatus: deriveReusableStatus({
        status: row.status,
        valid_from: row.validFrom,
        expires_at: row.expiresAt,
      }),
      previousTargetRole: row.targetRole,
    };
  }
}
