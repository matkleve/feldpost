import { CommonModule } from '@angular/common';
import type {
  ElementRef,
  OnDestroy,
  OnInit} from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toCanvas } from 'qrcode';
import { I18nService } from '../../../core/i18n/i18n.service';
import { InviteService } from '../../../core/invites/invite.service';
import type {
  InviteOpenContext,
  InvitePanelMode,
  InviteTargetRole,
  QrInviteViewModel,
} from '../../../core/invites/invite.types';
import {
  UiButtonDangerDirective,
  UiButtonDirective,
  UiButtonGhostDirective,
  UiIconButtonGhostDirective,
  UiSelectControlDirective,
  UiStatusBadgeDirective,
} from '../../../shared/ui-primitives/ui-primitives.directive';

@Component({
  selector: 'ss-invite-management-section',
  standalone: true,
  imports: [
    CommonModule,
    UiButtonDirective,
    UiButtonGhostDirective,
    UiButtonDangerDirective,
    UiIconButtonGhostDirective,
    UiSelectControlDirective,
    UiStatusBadgeDirective,
  ],
  templateUrl: './invite-management-section.component.html',
  styleUrl: './invite-management-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteManagementSectionComponent implements OnInit, OnDestroy {
  private readonly inviteService = inject(InviteService);
  private readonly i18nService = inject(I18nService);

  private expirationTimer: ReturnType<typeof setInterval> | null = null;
  private qrRenderSequence = 0;

  readonly roleSelect = viewChild<ElementRef<HTMLSelectElement>>('roleSelect');
  readonly qrCanvas = viewChild<ElementRef<HTMLCanvasElement>>('qrCanvas');

  readonly openContext = input<InviteOpenContext>('settings');
  readonly preselectedRole = input<InviteTargetRole>('worker');
  readonly requestToken = input(0);

  readonly inviteCreated = output<string>();
  readonly inviteRevoked = output<string>();
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly panelMode = signal<InvitePanelMode>('ready');
  readonly targetRole = signal<InviteTargetRole>('worker');
  readonly activeInvite = signal<QrInviteViewModel | null>(null);
  readonly qrLoading = signal(false);
  readonly qrVisible = signal(false);
  readonly shareInFlight = signal(false);
  readonly lastError = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.requestToken();
      this.targetRole.set(this.preselectedRole());
      void this.initializePanel(this.targetRole());
    });

    effect(() => {
      const invite = this.activeInvite();
      const canvasRef = this.qrCanvas();

      if (!invite || !canvasRef) {
        return;
      }

      void this.renderQrCanvas(canvasRef.nativeElement, invite.qrPayload);
    });
  }

  ngOnInit(): void {
    this.expirationTimer = setInterval(() => {
      void this.syncInviteExpiration();
    }, 60_000);
  }

  ngOnDestroy(): void {
    if (this.expirationTimer) {
      clearInterval(this.expirationTimer);
      this.expirationTimer = null;
    }
  }

  async onRoleChange(event: Event): Promise<void> {
    const nextRole = (event.target as HTMLSelectElement).value as InviteTargetRole;
    this.targetRole.set(nextRole);

    const currentInvite = this.activeInvite();
    if (!currentInvite) {
      await this.initializePanel(nextRole);
      return;
    }

    await this.regenerateInvite(nextRole);
  }

  async onRegenerate(): Promise<void> {
    await this.regenerateInvite(this.targetRole());
  }

  async onRevoke(): Promise<void> {
    const invite = this.activeInvite();
    if (!invite) {
      return;
    }

    this.lastError.set(null);

    try {
      await this.inviteService.revokeInvite(invite.inviteId);
      this.activeInvite.update((current) =>
        current
          ? {
              ...current,
              status: 'revoked',
            }
          : null,
      );
      this.inviteRevoked.emit(invite.inviteId);
    } catch (error) {
      this.lastError.set(
        error instanceof Error
          ? error.message
          : this.t('settings.inviteManagement.error.revoke', 'Unable to revoke invite.'),
      );
    }
  }

  async onCopyLink(): Promise<void> {
    await this.withShareAction(async (invite) => {
      await navigator.clipboard.writeText(invite.inviteUrl);
      await this.inviteService.logShareEvent(invite.inviteId, 'copy-link');
    });
  }

  async onShareEmail(): Promise<void> {
    await this.withShareAction(async (invite) => {
      const subject = encodeURIComponent(
        this.t('settings.inviteManagement.share.email.subject', 'Join my organization'),
      );
      const bodyTemplate = this.t(
        'settings.inviteManagement.share.email.body',
        'Use this invite link: {inviteUrl}',
      );
      const body = encodeURIComponent(bodyTemplate.replace('{inviteUrl}', invite.inviteUrl));

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: this.t('settings.inviteManagement.share.native.title', 'Organization invite'),
          text: this.t(
            'settings.inviteManagement.share.native.text',
            'Use this invite link to join.',
          ),
          url: invite.inviteUrl,
        });
      } else if (typeof window !== 'undefined') {
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
      }

      await this.inviteService.logShareEvent(invite.inviteId, 'email');
    });
  }

  async onShareWhatsApp(): Promise<void> {
    await this.withShareAction(async (invite) => {
      if (typeof window !== 'undefined') {
        const textTemplate = this.t(
          'settings.inviteManagement.share.whatsapp.text',
          'Join my organization: {inviteUrl}',
        );
        const text = encodeURIComponent(textTemplate.replace('{inviteUrl}', invite.inviteUrl));
        window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
      }

      await this.inviteService.logShareEvent(invite.inviteId, 'whatsapp');
    });
  }

  async retry(): Promise<void> {
    await this.initializePanel(this.targetRole());
  }

  isShareDisabled(): boolean {
    const invite = this.activeInvite();
    if (!invite) {
      return true;
    }

    return this.shareInFlight() || this.qrLoading() || invite.status !== 'active';
  }

  isRegenerateDisabled(): boolean {
    const invite = this.activeInvite();
    return (
      this.panelMode() !== 'ready' ||
      this.qrLoading() ||
      (invite !== null && invite.status === 'accepted')
    );
  }

  statusLabel(): string {
    const status = this.activeInvite()?.status;
    switch (status) {
      case 'active':
        return this.t('settings.inviteManagement.status.active', 'Active');
      case 'expired':
        return this.t('settings.inviteManagement.status.expired', 'Expired');
      case 'revoked':
        return this.t('settings.inviteManagement.status.revoked', 'Revoked');
      case 'accepted':
        return this.t('settings.inviteManagement.status.accepted', 'Accepted');
      default:
        return this.t('settings.inviteManagement.status.pending', 'Pending');
    }
  }

  statusIcon(): string {
    const status = this.activeInvite()?.status;
    switch (status) {
      case 'active':
        return 'check_circle';
      case 'expired':
        return 'schedule';
      case 'revoked':
        return 'cancel';
      case 'accepted':
        return 'task_alt';
      default:
        return 'hourglass_top';
    }
  }

  private async initializePanel(targetRole: InviteTargetRole): Promise<void> {
    this.panelMode.set('ready');
    this.lastError.set(null);
    this.qrLoading.set(true);
    this.qrVisible.set(false);

    try {
      const invite = await this.inviteService.createInviteDraft(targetRole);
      this.activeInvite.set(invite);
      this.panelMode.set('ready');
      this.inviteCreated.emit(invite.inviteId);
      await this.syncInviteExpiration();

      if (this.openContext() === 'command') {
        queueMicrotask(() => {
          this.roleSelect()?.nativeElement.focus();
        });
      }
    } catch (error) {
      this.activeInvite.set(null);
      this.qrLoading.set(false);
      this.panelMode.set('error');
      this.lastError.set(
        error instanceof Error
          ? error.message
          : this.t('settings.inviteManagement.error.create', 'Unable to create invite.'),
      );
    }
  }

  private async regenerateInvite(targetRole: InviteTargetRole): Promise<void> {
    const current = this.activeInvite();

    this.lastError.set(null);

    try {
      const invite = current
        ? await this.inviteService.regenerateInvite(current.inviteId, targetRole)
        : await this.inviteService.createInviteDraft(targetRole);
      this.activeInvite.set(invite);
      this.inviteCreated.emit(invite.inviteId);
      await this.syncInviteExpiration();
    } catch (error) {
      this.lastError.set(
        error instanceof Error
          ? error.message
          : this.t('settings.inviteManagement.error.regenerate', 'Unable to regenerate invite.'),
      );
    }
  }

  private async renderQrCanvas(canvas: HTMLCanvasElement, payload: string): Promise<void> {
    const currentSequence = ++this.qrRenderSequence;
    this.qrVisible.set(false);
    this.qrLoading.set(true);

    try {
      await toCanvas(canvas, payload, {
        width: 192,
        margin: 1,
      });

      if (currentSequence !== this.qrRenderSequence) {
        return;
      }

      this.qrLoading.set(false);
      requestAnimationFrame(() => {
        if (currentSequence === this.qrRenderSequence) {
          this.qrVisible.set(true);
        }
      });
    } catch {
      if (currentSequence !== this.qrRenderSequence) {
        return;
      }

      this.qrLoading.set(false);
      this.qrVisible.set(false);
      this.lastError.set(
        this.t('settings.inviteManagement.error.renderQr', 'Unable to render QR code.'),
      );
    }
  }

  private async syncInviteExpiration(): Promise<void> {
    const invite = this.activeInvite();
    if (!invite || invite.status !== 'active') {
      return;
    }

    const expired = Date.now() > new Date(invite.expiresAt).getTime();
    if (!expired) {
      return;
    }

    this.activeInvite.update((current) => (current ? { ...current, status: 'expired' } : null));

    try {
      await this.inviteService.expireInvite(invite.inviteId);
    } catch {
      // Keep UI state expired even if persistence fails.
    }
  }

  private async withShareAction(
    action: (invite: QrInviteViewModel) => Promise<void>,
  ): Promise<void> {
    const invite = this.activeInvite();
    if (!invite || invite.status !== 'active' || this.shareInFlight()) {
      return;
    }

    this.shareInFlight.set(true);
    this.lastError.set(null);

    try {
      await action(invite);
    } catch (error) {
      this.lastError.set(
        error instanceof Error
          ? error.message
          : this.t('settings.inviteManagement.error.share', 'Unable to share invite.'),
      );
    } finally {
      this.shareInFlight.set(false);
    }
  }
}

